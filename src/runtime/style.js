// StyleRuntime: owns everything that makes pixels (design §7.3). It has no DOM access.
//
// apply(resolved) is the only entry for look changes. Value changes become uniform
// writes; structural changes rebuild only what they affect: a part's materials, the
// styled scene pass (when MRT needs change), or the post graph. Counters in
// `info` let tests assert that sliders never rebuild anything.

import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, directionToColor, vec4 } from 'three/tsl';
import { StyleMaterials, LAYER_STYLED, LAYER_PLAIN, idsNode } from './materials/factory.js';
import { createAtmosphereUniforms, createFogNode, createSkyDomes, FOG_TYPES } from './atmosphere/atmosphere.js';
import { createPostUniforms, applyPostValues, buildGraph, disposeOwned, graphKey, needsMRT } from './post/graph.js';
import { Rigs } from './render/rigs.js';
import { resolveLook } from './look/resolve.js';

const layers = ( n ) => { const l = new THREE.Layers(); l.set( n ); return l; };

export class StyleRuntime {

	/**
	 * @param {object} o
	 * @param {THREE.WebGPURenderer} o.renderer
	 * @param {THREE.PerspectiveCamera} o.camera
	 */
	constructor( { renderer, camera } ) {

		this.renderer = renderer;
		this.camera = camera;
		this.scene = new THREE.Scene();
		this.U = createPostUniforms();
		this.atmos = createAtmosphereUniforms();
		this.scene.fogNode = createFogNode( this.atmos );
		this.materials = new StyleMaterials( { time: this.U.time, keyDirection: this.atmos.sunDirection } );
		this.rigs = new Rigs( this.scene );

		this.domes = createSkyDomes( this.atmos, { layerStyled: LAYER_STYLED, layerPlain: LAYER_PLAIN, idsNode: idsNode( 'sky' ) } );
		this.scene.add( this.domes.styled, this.domes.plain );

		this.post = new THREE.PostProcessing( renderer );
		this.post.outputColorTransform = false;
		this.plainPass = pass( this.scene, camera, { samples: 4 } ).setLayers( layers( LAYER_PLAIN ) );
		this.styledPass = null;
		this.passKey = null;
		this.graph = null;
		this.graphKey = null;

		this.root = null;
		this.values = null;
		this.info = { materialBuilds: 0, graphBuilds: 0, passBuilds: 0, lastRebuild: null, lastCompileMs: null };
		this.pendingCompile = null;

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

		const hero = def.shots[ def.defaultShot ];
		this.rigs.setFrame( { center: def.shadow.center, radius: def.shadow.radius, heroPos: hero.pos, heroTarget: hero.target } );
		this.camera.far = def.far;
		this.camera.updateProjectionMatrix();
		this.apply( this.resolved );
		this.markCompile( 'scene' );

	}

	/**
	 * Applies a resolved look (resolveLook()). Returns what was rebuilt.
	 * @returns {{parts: string[], pass: boolean, graph: boolean}}
	 */
	apply( resolved ) {

		this.resolved = resolved;
		const v = this.values = resolved.global;
		const before = this.materials.built;

		const parts = this.materials.apply( resolved.parts );

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

		applyPostValues( this.U, v );

		// Styled scene pass: MSAA unless ids are needed (MSAA would blend them, M0 spike 2).
		const passKey = needsMRT( v ) ? 'mrt' : 'msaa';
		const passRebuilt = passKey !== this.passKey;

		if ( passRebuilt ) {

			this.styledPass?.dispose();
			const p = pass( this.scene, this.camera, { samples: passKey === 'mrt' ? 0 : 4 } ).setLayers( layers( LAYER_STYLED ) );
			if ( passKey === 'mrt' ) p.setMRT( mrt( { output, normal: directionToColor( normalView ), ids: vec4( 0 ) } ) );
			this.styledPass = p;
			this.passKey = passKey;
			this.info.passBuilds ++;

		}

		this.styledPass.setResolutionScale( v[ 'quality.resolution' ] );

		const key = `${graphKey( v )}|${passKey}`;
		const graphRebuilt = key !== this.graphKey;

		if ( graphRebuilt ) {

			const previous = this.graph;
			this.graph = buildGraph( { styledPass: this.styledPass, plainPass: this.plainPass, values: v, U: this.U, atmos: this.atmos } );
			this.post.outputNode = this.graph.node;
			this.post.needsUpdate = true;
			if ( previous ) disposeOwned( previous.owned );
			this.graphKey = key;
			this.info.graphBuilds ++;

		}

		const b = this.graph.bloomNode;
		if ( b ) {

			b.strength.value = v[ 'lens.bloom.strength' ];
			b.radius.value = v[ 'lens.bloom.radius' ];
			b.threshold.value = v[ 'lens.bloom.threshold' ];

		}

		this.info.materialBuilds += this.materials.built - before;
		const rebuilt = { parts, pass: passRebuilt, graph: graphRebuilt };
		if ( parts.length || passRebuilt || graphRebuilt ) { this.info.lastRebuild = rebuilt; this.markCompile( 'rebuild' ); }
		return rebuilt;

	}

	markCompile( reason ) {

		this.pendingCompile = reason;

	}

	/** Compare composite (§6.9): uniforms only, so it takes effect on the next frame. */
	setCompare( { hold, split, splitPos, flicker } = {} ) {

		if ( hold !== undefined ) this.U.hold.value = hold ? 1 : 0;
		if ( split !== undefined ) this.U.split.value = split ? 1 : 0;
		if ( splitPos !== undefined ) this.U.splitPos.value = Math.min( 1, Math.max( 0, splitPos ) );
		if ( flicker !== undefined ) this.U.flicker.value = flicker ? 1 : 0;

	}

	/** Per-frame state: time (freezable by the host), dome placement, depth range for lines. */
	update( t ) {

		this.U.time.value = t;
		const r = this.camera.far * 0.9;
		for ( const d of [ this.domes.styled, this.domes.plain ] ) { d.position.copy( this.camera.position ); d.scale.setScalar( r ); }
		this.U.lines.near.value = this.camera.near;
		this.U.lines.far.value = this.camera.far;

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
		this.post.dispose();
		this.rigs.dispose();

	}

}
