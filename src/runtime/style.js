// StyleRuntime: owns everything that makes pixels (design §7.3). It has no DOM access.
//
// apply(resolved) is the only entry for look changes. Value changes become uniform
// writes; structural changes rebuild only what they affect: a part's materials, the
// styled scene pass (when the buffers it must write change), or the post graph.
// Counters in `info` let tests assert that sliders never rebuild anything.

import * as THREE from 'three/webgpu';
import { mrt, output, normalView, directionToColor, vec4, velocity, emissive, texture } from 'three/tsl';
import { StyleMaterials, LAYER_STYLED, LAYER_PLAIN, idsNode } from './materials/factory.js';
import { createAtmosphereUniforms, createFogNode, createSkyDomes, FOG_TYPES } from './atmosphere/atmosphere.js';
import { createPostUniforms, createPostLists, applyPostValues, buildGraph, disposeOwned, graphKey, passRequirements, activeEffects, withPartMasks } from './post/graph.js';
import { ParamUniforms } from './post/params.js';
import { StylePassNode, pixelGrid } from './render/passes.js';
import { Rigs } from './render/rigs.js';
import { PARTS, PART_INDEX } from './registry/index.js';
import { resolveLook } from './look/resolve.js';

const layers = ( n ) => { const l = new THREE.Layers(); l.set( n ); return l; };
const _size = new THREE.Vector2();
const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();

export class StyleRuntime {

	/**
	 * @param {object} o
	 * @param {THREE.WebGPURenderer} o.renderer
	 * @param {THREE.PerspectiveCamera} o.camera - the viewer's camera (the plain set renders with it)
	 */
	constructor( { renderer, camera } ) {

		this.renderer = renderer;
		this.camera = camera;
		// The look's light rigs cast soft shadow maps; the plain baseline is ACES like an agent's default.
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		// The styled set renders with its own copy, so pixel looks can widen its frustum
		// to whole texels without touching the baseline.
		this.styledCamera = camera.clone();
		this.styledCamera.name = 'styled camera';
		this.scene = new THREE.Scene();
		this.U = createPostUniforms();
		this.P = new ParamUniforms();
		this.U.lines.color = this.P.get( 'lines.screen.color' );
		this.lists = createPostLists();
		this.atmos = createAtmosphereUniforms();
		this.atmos.time = this.U.time;
		this.scene.fogNode = createFogNode( this.atmos );
		this.materials = new StyleMaterials( { time: this.U.time, keyDirection: this.atmos.sunDirection } );
		this.rigs = new Rigs( this.scene );

		this.domes = createSkyDomes( this.atmos, { layerStyled: LAYER_STYLED, layerPlain: LAYER_PLAIN, idsNode: idsNode( 'sky' ) } );
		this.scene.add( this.domes.styled, this.domes.plain );

		this.post = new THREE.PostProcessing( renderer );
		this.post.outputColorTransform = false;
		this.plainPass = new StylePassNode( this.scene, camera, { samples: 4 } ).setLayers( layers( LAYER_PLAIN ) );
		this.styledPass = null;
		this.passKey = null;
		this.graph = null;
		this.graphKey = null;
		this.grid = null; // pixel grid { p, width, height } in pixel looks

		this.root = null;
		this.practicals = [];
		this.focus = new THREE.Vector3();
		this.values = null;
		this.info = { materialBuilds: 0, graphBuilds: 0, passBuilds: 0, lastRebuild: null, lastCompileMs: null };
		this.pendingCompile = null;

		// Transitions (§6.10): crossfade and wipe blend from a still of the outgoing look.
		// Two targets ping-pong, so the graph never samples the target it renders into.
		this.snapshots = [ new THREE.RenderTarget( 1, 1 ), new THREE.RenderTarget( 1, 1 ) ];
		this.snapshotIndex = 0;
		this.U.snapshot = texture( this.snapshots[ 0 ].texture );
		this.isolate = null; // part name dimmed-around in the Parts tab

		this.apply( resolveLook( { look: { baseline: true, params: {} } } ) );

	}

	/**
	 * Replaces the scene content. `root` comes from a scene builder (kit meshes
	 * with userData.style); `def` provides the shadow frame, shots and far plane.
	 */
	setScene( root, def ) {

		if ( this.root ) {

			this.materials.clearScene();
			this.scene.remove( this.root );
			this.root.traverse( ( o ) => { if ( o.isMesh ) o.geometry.dispose(); } );

		}

		this.root = root;
		this.scene.add( root );
		this.materials.register( root );
		this.materials.blobs.setScene( root );

		this.practicals = [];
		this.adoptLights( root );

		const hero = def.shots[ def.defaultShot ];
		this.rigs.setFrame( { center: def.shadow.center, radius: def.shadow.radius, heroPos: hero.pos, heroTarget: hero.target } );
		this.camera.far = def.far;
		this.camera.updateProjectionMatrix();
		// Far isometric and top-down cameras: fog counts from part of the way to the focus,
		// so fog tuned for eye-level shots doesn't bury the whole view.
		this.fogFocus = def.fogFocus || 0;
		this.apply( this.resolved );
		this.markCompile( 'scene' );

	}

	/**
	 * Practical lights (torches, lamps, campfires): the styled set's lights follow the
	 * look's practical controls; a twin on the plain layer keeps the scene's own values.
	 */
	adoptLights( root ) {

		const lights = [];
		root.traverse( ( o ) => { if ( o.isLight && ! o.userData.stylelabTwin && ! this.practicals.some( ( p ) => p.light === o ) ) lights.push( o ); } );
		for ( const light of lights ) {

			light.castShadow = false;
			light.layers.set( LAYER_STYLED );
			const twin = light.clone();
			twin.layers.set( LAYER_PLAIN );
			twin.name = 'plain twin';
			twin.userData.stylelabTwin = true;
			light.parent.add( twin );
			const base = { intensity: light.intensity, flicker: light.userData.practical?.flicker ?? 0, seed: light.userData.practical?.seed ?? 0 };
			this.practicals.push( { light, twin, base } );

		}

	}

	/** Adds objects to the current scene after setScene (meshes need `userData.style`). */
	add( object, parent = this.root ) {

		if ( object.parent !== parent ) parent.add( object );
		this.materials.register( object );
		this.adoptLights( object );
		this.materials.blobs.setScene( this.root );
		this.apply( this.resolved );
		this.markCompile( 'add' );

	}

	/**
	 * Buffers the styled pass writes for the current values, and whether it can use MSAA:
	 * only when it writes no extra buffers, the look isn't a pixel look, the AA mode allows
	 * it, and no part uses toon water (which copies the depth buffer mid-pass).
	 */
	passConfig( v, parts ) {

		const buffers = passRequirements( v );
		const pixel = v[ 'retro.pixel.enabled' ] === true;
		const water = PARTS.some( ( p ) => parts[ p ][ 'surface.model' ] === 'toonWater' );
		const msaa = [ 'auto', 'msaa' ].includes( v[ 'quality.aa' ] ) && ! buffers.size && ! pixel && ! water;
		const samples = msaa ? 4 : 0;
		return { buffers, samples, pixel, key: `${samples}|${[ ...buffers ].sort().join( ',' )}${water ? '|water' : ''}` };

	}

	/**
	 * Applies a resolved look (resolveLook()). Returns what was rebuilt.
	 * @returns {{parts: string[], pass: boolean, graph: boolean}}
	 */
	apply( resolved ) {

		this.resolved = resolved;
		// Masked post effects (§7.11): a switch is on if any part has it, plus a bit mask.
		const v = this.values = withPartMasks( resolved.global, resolved.parts );
		v[ '@isolate' ] = this.isolate !== null;
		const before = this.materials.built;

		const parts = this.materials.apply( resolved.parts, v );

		const dir = this.rigs.apply( v );
		const a = this.atmos;
		a.sunDirection.value.copy( dir );
		a.zenith.value.set( v[ 'atmosphere.sky.zenith' ] );
		a.horizon.value.set( v[ 'atmosphere.sky.horizon' ] );
		a.ground.value.set( v[ 'atmosphere.sky.ground' ] );
		a.exponent.value = v[ 'atmosphere.sky.exponent' ];
		a.sunColor.value.set( v[ 'lighting.key.color' ] ).multiplyScalar( v[ 'atmosphere.sky.sunIntensity' ] );
		a.sunRadius.value = v[ 'atmosphere.sky.sunSize' ] * Math.PI / 360;
		a.sunSoftness.value = v[ 'atmosphere.sky.sunSoftness' ];
		a.fogType.value = FOG_TYPES[ v[ 'atmosphere.fog.type' ] ];
		a.fogAmount.value = v[ 'atmosphere.fog.amount' ];
		a.fogDensity.value = v[ 'atmosphere.fog.density' ];
		a.fogStart.value = v[ 'atmosphere.fog.start' ];
		a.fogEnd.value = v[ 'atmosphere.fog.end' ];
		a.fogColor.value.set( v[ 'atmosphere.fog.color' ] );
		a.fogSkyTint.value = v[ 'atmosphere.fog.skyTint' ];
		a.fogBands.value = v[ 'atmosphere.fog.bands' ];
		a.heightDensity.value = v[ 'atmosphere.heightFog.density' ];
		a.heightBase.value = v[ 'atmosphere.heightFog.base' ];
		a.heightFalloff.value = v[ 'atmosphere.heightFog.falloff' ];
		a.clouds.value = v[ 'atmosphere.clouds.amount' ];
		a.cloudCoverage.value = v[ 'atmosphere.clouds.coverage' ];
		a.cloudSoftness.value = v[ 'atmosphere.clouds.softness' ];
		a.cloudBands.value = v[ 'atmosphere.clouds.bands' ];
		a.cloudScale.value = v[ 'atmosphere.clouds.scale' ];
		a.cloudSpeed.value = v[ 'atmosphere.clouds.speed' ];
		a.cloudColor.value.set( v[ 'atmosphere.clouds.color' ] );
		a.cloudShade.value.set( v[ 'atmosphere.clouds.shade' ] );

		applyPostValues( this.U, this.P, this.lists, v, resolved.parts );
		this.U.isolate.value = this.isolate === null ? - 1 : PART_INDEX[ this.isolate ];

		// Styled scene pass: MSAA unless it writes extra buffers (MSAA would blend ids, M0 spike 2).
		const cfg = this.passConfig( v, resolved.parts );
		const passRebuilt = cfg.key !== this.passKey;

		if ( passRebuilt ) {

			this.styledPass?.dispose();
			const p = new StylePassNode( this.scene, this.styledCamera, { samples: cfg.samples } ).setLayers( layers( LAYER_STYLED ) );
			if ( cfg.buffers.size ) {

				const outputs = { output };
				if ( cfg.buffers.has( 'normal' ) ) outputs.normal = directionToColor( normalView );
				if ( cfg.buffers.has( 'ids' ) ) outputs.ids = vec4( 0 );
				if ( cfg.buffers.has( 'velocity' ) ) outputs.velocity = velocity;
				if ( cfg.buffers.has( 'emissive' ) ) outputs.emissive = emissive;
				p.setMRT( mrt( outputs ) );

			}

			this.styledPass = p;
			this.passKey = cfg.key;
			this.info.passBuilds ++;

		}

		this.styledPass.pixelRows = cfg.pixel ? v[ 'retro.pixel.height' ] : null;
		this.styledPass.setResolutionScale( cfg.pixel ? 1 : v[ 'quality.resolution' ] );

		const key = graphKey( v, cfg.key );
		const graphRebuilt = key !== this.graphKey;

		if ( graphRebuilt ) {

			const previous = this.graph;
			this.graph = buildGraph( { styledPass: this.styledPass, plainPass: this.plainPass, values: v, P: this.P, U: this.U, lists: this.lists, atmos: this.atmos, camera: this.styledCamera, light: this.rigs.styled.sun, samples: cfg.samples } );
			this.post.outputNode = this.graph.node;
			this.post.needsUpdate = true;
			if ( previous ) disposeOwned( previous.owned );
			this.graphKey = key;
			this.info.graphBuilds ++;

		}

		this.info.materialBuilds += this.materials.built - before;
		const rebuilt = { parts, pass: passRebuilt, graph: graphRebuilt };
		if ( parts.length || passRebuilt || graphRebuilt ) { this.info.lastRebuild = rebuilt; this.markCompile( 'rebuild' ); }
		return rebuilt;

	}

	/** The enabled post and pass effects of the current look, in pipeline order. */
	activeEffects() {

		return activeEffects( this.values );

	}

	/** Reassigns one mesh's part (pick tool); applies the part's look on the next frame. */
	setPart( mesh, part ) {

		const ok = this.materials.setPart( mesh, part );
		if ( ok ) this.markCompile( 'part' );
		return ok;

	}

	markCompile( reason ) {

		this.pendingCompile = reason;

	}

	/**
	 * Captures the current styled frame for a crossfade or wipe. Call before applying the
	 * incoming look; then drive setTransition() from 0 to 1.
	 */
	snapshot() {

		const r = this.renderer;
		r.getDrawingBufferSize( _size );
		this.snapshotIndex = 1 - this.snapshotIndex;
		const rt = this.snapshots[ this.snapshotIndex ];
		rt.setSize( Math.max( 1, _size.x ), Math.max( 1, _size.y ) );
		const previous = r.getRenderTarget();
		r.setRenderTarget( rt );
		this.post.render();
		r.setRenderTarget( previous );
		this.U.snapshot.value = rt.texture;

	}

	/**
	 * Transition composite: mode null (off), 'crossfade' or 'wipe'; progress 0 shows the
	 * snapshot, 1 the live frame. Omitted fields keep their value. Uniforms only.
	 */
	setTransition( { mode, progress } = {} ) {

		if ( mode !== undefined ) this.U.transitionMode.value = mode === 'wipe' ? 2 : mode === 'crossfade' ? 1 : 0;
		if ( mode === null ) this.U.transitionProgress.value = 1;
		if ( progress !== undefined ) this.U.transitionProgress.value = Math.min( 1, Math.max( 0, progress ) );

	}

	/** Isolates one part (dims and grays the rest, outlines it), or null. Needs the ids buffer. */
	setIsolate( part ) {

		const next = part && PARTS.includes( part ) ? part : null;
		if ( next === this.isolate ) return;
		this.isolate = next;
		if ( this.resolved ) this.apply( this.resolved );

	}

	/** Compare composite (§6.9): uniforms only, so it takes effect on the next frame. */
	setCompare( { hold, split, splitPos, flicker } = {} ) {

		if ( hold !== undefined ) this.U.hold.value = hold ? 1 : 0;
		if ( split !== undefined ) this.U.split.value = split ? 1 : 0;
		if ( splitPos !== undefined ) this.U.splitPos.value = Math.min( 1, Math.max( 0, splitPos ) );
		if ( flicker !== undefined ) this.U.flicker.value = flicker ? 1 : 0;

	}

	/**
	 * Per-frame state: time (freezable and steppable by the host), the styled camera
	 * and pixel grid, dome placement, depth range, the sun's screen position, the
	 * focus distance for depth of field, practical lights and blob shadows.
	 * @param {number} t - animation time in seconds
	 * @param {object} [o] - { focus: Vector3 } the point the camera looks at
	 */
	update( t, { focus } = {} ) {

		const v = this.values;
		const U = this.U;
		U.time.value = t;
		if ( focus ) this.focus.copy( focus );

		this.syncStyledCamera( v );

		const r = this.camera.far * 0.9;
		for ( const d of [ this.domes.styled, this.domes.plain ] ) { d.position.copy( this.camera.position ); d.scale.setScalar( r ); }
		U.lines.near.value = this.camera.near;
		U.lines.far.value = this.camera.far;

		// Sun on screen (god rays): fades out as the sun leaves the frame or goes behind the camera.
		const cam = this.styledCamera;
		_v.copy( this.atmos.sunDirection.value ).multiplyScalar( cam.far * 0.5 ).add( cam.position ).project( cam );
		U.sunScreen.value.set( _v.x * 0.5 + 0.5, 0.5 - _v.y * 0.5 );
		cam.getWorldDirection( _fwd );
		const facing = _fwd.dot( this.atmos.sunDirection.value );
		const off = Math.max( Math.abs( _v.x ), Math.abs( _v.y ) );
		U.sunVisible.value = Math.max( 0, Math.min( 1, facing * 4 ) ) * Math.max( 0, Math.min( 1, ( 2.2 - off ) / 1.2 ) );

		// Screen-space shadows trace toward the sun in the styled camera's view space.
		U.proj.value.copy( cam.projectionMatrix );
		U.projInv.value.copy( cam.projectionMatrixInverse );
		U.lightView.value.copy( this.atmos.sunDirection.value ).transformDirection( cam.matrixWorldInverse );

		// Depth of field focuses on the point the camera looks at, along the view axis.
		U.focusDistance.value = Math.max( 0.1, _v.copy( this.focus ).sub( cam.position ).dot( _fwd ) + v[ 'lens.dof.offset' ] );
		this.atmos.fogOffset.value = ( this.fogFocus || 0 ) * this.focus.distanceTo( cam.position );

		for ( const { light, base } of this.practicals ) {

			const n = Math.sin( t * 11.3 + base.seed ) * 0.5 + Math.sin( t * 23.7 + base.seed * 2.1 ) * 0.3 + Math.sin( t * 5.1 + base.seed * 0.7 ) * 0.2;
			light.intensity = base.intensity * v[ 'lighting.practicals.intensity' ] * ( 1 + n * base.flicker * v[ 'lighting.practicals.flicker' ] * 0.35 );

		}

		this.root?.updateMatrixWorld();
		this.materials.blobs.update();

	}

	/** Copies the viewer's camera; in pixel looks widens it to whole low-res texels. */
	syncStyledCamera( v ) {

		const src = this.camera, cam = this.styledCamera;
		cam.position.copy( src.position );
		cam.quaternion.copy( src.quaternion );
		cam.fov = src.fov;
		cam.aspect = src.aspect;
		cam.near = src.near;
		cam.far = src.far;
		cam.zoom = src.zoom;

		this.renderer.getDrawingBufferSize( _size );
		const W = Math.floor( _size.x ), H = Math.floor( _size.y );
		const view = src.view && src.view.enabled ? src.view : null;

		if ( v[ 'retro.pixel.enabled' ] ) {

			const g = this.grid = pixelGrid( W, H, v[ 'retro.pixel.height' ] );
			// A host view offset (a pan test, a tiled render) is kept, in screen pixels.
			cam.setViewOffset( W, H, view ? view.offsetX * W / view.fullWidth : 0, view ? view.offsetY * H / view.fullHeight : 0, g.width * g.p, g.height * g.p );
			this.U.pixelSize.value = g.p;
			this.U.lowRes.value.set( g.width, g.height );

		} else {

			this.grid = null;
			if ( view ) cam.setViewOffset( view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height );
			else cam.clearViewOffset();

		}

		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();

	}

	render() {

		if ( this.pendingCompile ) {

			// The first frame after a rebuild compiles the new pipelines; show how long it took.
			const t0 = performance.now();
			this.post.render();
			this.info.lastCompileMs = performance.now() - t0;
			this.pendingCompile = null;
			return;

		}

		this.post.render();

	}

	dispose() {

		if ( this.root ) this.root.traverse( ( o ) => { if ( o.isMesh ) o.geometry.dispose(); } );
		this.materials.dispose();
		if ( this.graph ) disposeOwned( this.graph.owned );
		this.styledPass?.dispose();
		this.plainPass.dispose();
		for ( const rt of this.snapshots ) rt.dispose();
		this.post.dispose();
		this.rigs.dispose();

	}

}
