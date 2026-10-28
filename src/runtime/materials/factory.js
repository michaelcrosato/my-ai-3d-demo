// Material factory and render-set twins (design §7.8, §7.12).
//
// Every kit mesh becomes the styled twin (layer A) and gets two children: a plain
// twin (layer P, the "agent default" baseline) and, when its part has hull lines,
// a hull. Children share the geometry and follow every animation of the parent.
//
// Continuous values are uniforms shared per part, so a slider updates every
// material of that part without a rebuild. Only a change of a part's structural
// key (shading model, bands, flat normals) builds new materials for that part.

import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { uniform, vec3, vec4, mrt, output, fract, sin, cos, dot, floor, float, mix, step, smoothstep, modelWorldMatrix, modelViewProjection, positionLocal, positionWorld, positionView, materialColor, hue, mx_noise_float, mx_worley_noise_float, viewportDepthTexture, perspectiveDepthToViewZ, cameraNear, cameraFar, Fn } from 'three/tsl';
import { StyleSurfaceMaterial, StyleStandardMaterial, createSurfaceUniforms } from './StyleLightingModel.js';
import { createHullMaterial, computeOutlineNormals, snapClip } from './outline.js';
import { BlobShadows } from '../render/blobs.js';
import { PARTS, PART_INDEX } from '../registry/index.js';
import { adjustHex, remapToPalette, mixHex } from '../color/color.js';

export const LAYER_STYLED = 1;
export const LAYER_PLAIN = 2;

/** A per-object id in [1/255, 1] from the object's world position, for id edges. */
export const objectIdNode = Fn( () => {

	const t = modelWorldMatrix.element( 3 ).xyz;
	const h = fract( sin( dot( t, vec3( 12.9898, 78.233, 37.719 ) ) ).mul( 43758.5453 ) );
	return floor( h.mul( 254 ) ).add( 1 ).div( 255 );

} );

/** Value written to the `ids` attachment: R = part id, G = object id. */
export const idsNode = ( part ) => vec4( PART_INDEX[ part ] / 255, objectIdNode(), 0, 1 );

const deformKey = ( s, wind = s.wind ) => s.wave ? `wave:${s.wave.amplitude}/${s.wave.frequency}/${s.wave.falloff ?? 90}` : wind ? `wind:${wind.strength}/${wind.height}` : '';

/** Everything about a kit mesh's style that needs its own material (colors are uniforms but cache by value). */
const styleKey = ( s ) => [ s.color, s.emissive, s.emissiveIntensity, s.roughness, s.metalness ?? 0, s.opacity ?? 1, deformKey( s ), s.doubleSided, s.map?.uuid ?? '', s.vertexColors ? 'vc' : '' ].join( '|' );

/** Base color after the palette module: remap → tint → saturation/value/hue. */
export function paletteColor( hex, v ) {

	let c = hex.toLowerCase();
	if ( v[ 'palette.remap' ] > 0 && v[ 'palette.colors' ].length ) c = mixHex( c, remapToPalette( c, v[ 'palette.colors' ], { keepValue: v[ 'palette.keepValue' ] } ), v[ 'palette.remap' ] );
	if ( v[ 'palette.tintAmount' ] > 0 ) c = mixHex( c, v[ 'palette.tint' ], v[ 'palette.tintAmount' ] );
	return adjustHex( c, { saturation: v[ 'palette.saturation' ], value: v[ 'palette.value' ], hue: v[ 'palette.hue' ] } );

}

/** A part's structural key: everything that changes its shaders. `blobs` = materials receive blob shadows. */
const structKey = ( v, blobs ) => [
	v[ 'surface.model' ], v[ 'surface.model' ] === 'pbr' ? 0 : v[ 'surface.bands' ], v[ 'surface.flatNormals' ] ? 'flat' : '',
	v[ 'retro.vertexSnap.enabled' ] ? 'snap' : '',
	v[ 'surface.halftone.enabled' ] ? `dots-${v[ 'surface.halftone.space' ]}` : '', v[ 'surface.hatching.enabled' ] ? `hatch-${v[ 'surface.hatching.space' ]}` : '', v[ 'surface.dither.enabled' ] ? 'dither' : '',
	v[ 'surface.variation.enabled' ] ? `var-${v[ 'surface.variation.space' ]}` : '', v[ 'surface.gradient.enabled' ] ? 'grad' : '', v[ 'surface.wind.enabled' ] ? 'wind' : '',
	blobs ? 'blob' : '',
].join( '|' );

/** Registry value → part uniform, for the continuous surface parameters. */
const SURFACE_UNIFORMS = {
	'surface.threshold': 'threshold', 'surface.softness': 'softness', 'surface.shadowTintStrength': 'tintStrength',
	'surface.spec.intensity': 'specIntensity', 'surface.spec.size': 'specSize', 'surface.spec.softness': 'specSoftness',
	'surface.rim.intensity': 'rimIntensity', 'surface.rim.width': 'rimWidth', 'surface.rim.softness': 'rimSoftness',
	'surface.halftone.size': 'halftoneSize', 'surface.halftone.angle': 'halftoneAngle', 'surface.halftone.threshold': 'halftoneThreshold', 'surface.halftone.amount': 'halftoneAmount',
	'surface.hatching.spacing': 'hatchSpacing', 'surface.hatching.angle': 'hatchAngle', 'surface.hatching.layers': 'hatchLayers', 'surface.hatching.threshold': 'hatchThreshold', 'surface.hatching.amount': 'hatchAmount',
	'surface.variation.amount': 'variationAmount', 'surface.variation.scale': 'variationScale', 'surface.variation.hue': 'variationHue',
	'surface.gradient.amount': 'gradientAmount', 'surface.gradient.height': 'gradientHeight',
	'surface.water.depth': 'waterDepth', 'surface.water.bands': 'waterBands', 'surface.water.foam': 'waterFoam', 'surface.water.pattern': 'waterPattern',
	'surface.wind.strength': 'windStrength', 'surface.wind.speed': 'windSpeed', 'surface.wind.gusts': 'windGusts',
};
const SURFACE_COLORS = {
	'surface.shadowTint': 'shadowTint', 'surface.rim.color': 'rimColor', 'surface.halftone.color': 'halftoneColor', 'surface.hatching.color': 'hatchColor',
	'surface.water.shallow': 'waterShallow', 'surface.water.deep': 'waterDeep', 'surface.water.foamColor': 'waterFoamColor',
};

export class StyleMaterials {

	/**
	 * @param {object} o
	 * @param {Node} o.time - seconds uniform (freezable by the host)
	 * @param {Node} o.keyDirection - world-space direction toward the key light
	 */
	constructor( { time, keyDirection } ) {

		this.time = time;
		this.keyDirection = keyDirection;
		this.parts = Object.fromEntries( PARTS.map( ( p ) => [ p, {
			surface: createSurfaceUniforms(),
			hullColor: uniform( new THREE.Color( '#1b1d2a' ) ),
			hullThickness: uniform( 1.5 ),
			hullEnabled: false,
			snapRows: uniform( 120 ),
			struct: null,
			values: null,
		} ] ) );
		this.styled = new Map();
		this.plain = new Map();
		this.hulls = new Map();
		this.entries = [];
		this.blobs = new BlobShadows();
		this.built = 0; // materials created (a structural change shows up here)

	}

	waveNode( wave ) {

		if ( ! wave ) return null;
		const { amplitude, frequency, falloff = 90 } = wave;
		const t = this.time;
		// Waves fade out with distance from the mesh origin: far waves are invisible anyway,
		// and at grazing angles their crests would read as ink lines.
		const fade = smoothstep( falloff, falloff * 0.4, positionLocal.xz.length() );
		const y = sin( positionLocal.x.mul( frequency ).add( t ) ).mul( cos( positionLocal.z.mul( frequency * 0.8 ).add( t.mul( 0.7 ) ) ) ).mul( amplitude ).mul( fade );
		return positionLocal.add( vec3( 0, y, 0 ) );

	}

	/**
	 * Grass and foliage sway: offset grows with height above the mesh origin. With a part's
	 * uniforms (`u`), the look scales strength and speed and adds gusts; the plain twin
	 * passes none and keeps the scene's own motion.
	 */
	windNode( wind, u = null ) {

		const { strength = 0.12, height = 0.5 } = wind;
		const t = u ? this.time.mul( u.windSpeed ) : this.time;
		const h = positionLocal.y.div( height ).clamp( 0, 1.5 ).pow( 2 );
		const origin = modelWorldMatrix.element( 3 ).xz;
		const phase = positionLocal.x.mul( 0.35 ).add( positionLocal.z.mul( 0.2 ) ).add( origin.x.mul( 0.13 ) ).add( origin.y.mul( 0.07 ) );
		let sway = sin( t.mul( 1.7 ).add( phase ) ).add( sin( t.mul( 3.1 ).add( positionLocal.x.mul( 0.9 ) ) ).mul( 0.3 ) ).mul( strength );
		// Gusts: slow waves of stronger wind rolling across the scene.
		if ( u ) sway = sway.mul( u.windStrength ).mul( sin( t.mul( 0.45 ).add( origin.x.mul( 0.06 ) ).add( origin.y.mul( 0.04 ) ) ).mul( u.windGusts ).add( 1 ) );
		return positionLocal.add( vec3( sway, 0, sway.mul( 0.6 ) ).mul( h ) );

	}

	deformNode( style, wind = style.wind, u = null ) {

		return style.wave ? this.waveNode( style.wave ) : wind ? this.windNode( wind, u ) : null;

	}

	/** Wind for a mesh of a part with Wind sway on: the kit's own, or a gentle sway scaled to the mesh. */
	effectiveWind( entry ) {

		if ( entry.style.wind ) return entry.style.wind;
		if ( ! this.parts[ entry.part ].values[ 'surface.wind.enabled' ] || entry.style.wave ) return null;
		const g = entry.mesh.geometry;
		if ( ! g.boundingBox ) g.computeBoundingBox();
		const height = Math.max( 0.3, g.boundingBox.max.y );
		return { strength: Math.min( 0.25, 0.03 * height ), height };

	}

	/** Toon water's base color: banded depth color, shore foam and drifting foam lines. */
	waterColorNode( u ) {

		return Fn( () => {

			// Depth of the scene behind the water (the pass copies its depth before transparent objects).
			const sceneZ = perspectiveDepthToViewZ( viewportDepthTexture().r, cameraNear, cameraFar );
			const depth = positionView.z.sub( sceneZ ).max( 0 );
			const t = depth.div( u.waterDepth ).clamp( 0, 1 ).toVar();
			const banded = floor( t.mul( u.waterBands ).add( 0.5 ) ).div( u.waterBands.max( 1 ) );
			const k = mix( t, banded, step( 0.5, u.waterBands ) );
			const base = mix( u.waterShallow, u.waterDeep, k );
			const foam = smoothstep( u.waterFoam.mul( 0.7 ), u.waterFoam, depth ).oneMinus().mul( step( 0.001, u.waterFoam ) );
			const cells = mx_worley_noise_float( vec3( positionWorld.xz.mul( 0.22 ), this.time.mul( 0.15 ) ) );
			const lines = smoothstep( 0.62, 0.7, cells ).mul( u.waterPattern );
			return mix( base, u.waterFoamColor, foam.max( lines ) );

		} )();

	}

	/** The styled base color: material (or toon water) → color variation → vertical gradient → blob shadows. */
	colorNode( v, u, blobs ) {

		const water = v[ 'surface.model' ] === 'toonWater';
		const variation = v[ 'surface.variation.enabled' ], gradient = v[ 'surface.gradient.enabled' ];
		if ( ! water && ! variation && ! gradient && ! blobs ) return null;
		let c = water ? this.waterColorNode( u ) : materialColor.rgb;

		if ( variation ) {

			const p = v[ 'surface.variation.space' ] === 'object' ? positionLocal : positionWorld;
			const n = mx_noise_float( p.mul( u.variationScale ) ).mul( 2 ).clamp( - 1, 1 );
			const amount = u.variationAmount.mul( n );
			c = hue( c.mul( amount.mul( u.variationHue.oneMinus() ).add( 1 ) ), amount.mul( u.variationHue ).mul( 2.5 ) );

		}

		if ( gradient ) {

			const h = positionWorld.y.sub( modelWorldMatrix.element( 3 ).y ).div( u.gradientHeight ).clamp( 0, 1 );
			c = c.mul( mix( u.gradientAmount.oneMinus(), u.gradientAmount.mul( 0.35 ).add( 1 ), h ) );

		}

		if ( blobs ) c = c.mul( float( 1 ).sub( this.blobs.shade() ) );
		return vec4( c, materialColor.a );

	}

	/** Settings shared by the styled and plain twins of a mesh. */
	common( material, style ) {

		material.side = style.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
		if ( style.emissive ) { material.emissive = new THREE.Color( style.emissive ); material.emissiveIntensity = style.emissiveIntensity; }
		material.positionNode = this.deformNode( style );
		if ( ( style.opacity ?? 1 ) < 1 ) { material.transparent = true; material.opacity = style.opacity; material.depthWrite = false; }
		if ( style.map ) material.map = style.map;
		if ( style.vertexColors ) material.vertexColors = true;

	}

	/** The styled material of a mesh entry ({ mesh, style, part }), cached by part structure and style. */
	styledMaterial( entry ) {

		const { style, part } = entry;
		const pv = this.parts[ part ];
		const wind = this.effectiveWind( entry );
		const key = `${part}|${pv.struct}|${styleKey( style )}|${deformKey( style, wind )}`;
		let material = this.styled.get( key );
		if ( material ) return material;

		const v = pv.values;
		const patterns = {
			halftone: v[ 'surface.halftone.enabled' ] ? v[ 'surface.halftone.space' ] : null,
			hatching: v[ 'surface.hatching.enabled' ] ? v[ 'surface.hatching.space' ] : null,
			dither: v[ 'surface.dither.enabled' ],
		};
		const surface = { model: v[ 'surface.model' ], bands: v[ 'surface.bands' ], uniforms: pv.surface, patterns };
		material = surface.model === 'pbr'
			? new StyleStandardMaterial( surface, this.keyDirection, { roughness: style.roughness, metalness: style.metalness ?? 0 } )
			: new StyleSurfaceMaterial( surface );

		material.name = `style:${part}:${surface.model}`;
		material.flatShading = v[ 'surface.flatNormals' ];
		this.common( material, style );
		material.positionNode = this.deformNode( style, wind, pv.surface );
		// PS1 jitter: the final clip position (after skinning and wind) snaps to a coarse grid.
		if ( v[ 'retro.vertexSnap.enabled' ] ) material.vertexNode = snapClip( TSL, modelViewProjection, pv.snapRows );
		material.colorNode = this.colorNode( v, pv.surface, pv.struct.endsWith( 'blob' ) );
		// Toon water reads the depth behind it, so it renders after the opaque scene.
		if ( surface.model === 'toonWater' ) { material.transparent = true; material.depthWrite = true; }
		// `output` keeps the color attachment when the pass has no MRT (MRTNode skips unknown names).
		material.mrtNode = mrt( { output, ids: idsNode( part ) } );
		material.userData = { sourceColor: style.color, part, key };
		material.color.set( paletteColor( style.color, v ) );

		this.styled.set( key, material );
		this.built ++;
		return material;

	}

	plainMaterial( style ) {

		const key = styleKey( style );
		let material = this.plain.get( key );
		if ( material ) return material;

		// The "agent default" baseline (§6.9): standard PBR with the material values the model
		// specifies (roughness 0.8, metalness 0 when it doesn't), no fog, no styling.
		material = new THREE.MeshStandardNodeMaterial( { color: new THREE.Color( style.color ), roughness: style.roughness ?? 0.8, metalness: style.metalness ?? 0, fog: false } );
		material.name = 'plain';
		this.common( material, style );
		this.plain.set( key, material );
		return material;

	}

	hullMaterial( part ) {

		const pv = this.parts[ part ];
		const snap = pv.values[ 'retro.vertexSnap.enabled' ];
		const key = `${part}|${snap ? 'snap' : ''}`;
		let material = this.hulls.get( key );
		if ( material ) return material;
		material = createHullMaterial( { THREE, TSL, color: pv.hullColor, thickness: pv.hullThickness, snapRows: snap ? pv.snapRows : null } );
		material.name = `hull:${part}`;
		material.mrtNode = mrt( { output, ids: idsNode( part ) } );
		this.hulls.set( key, material );
		this.built ++;
		return material;

	}

	/** Makes `root`'s kit meshes into twins. Call after apply() has run once. */
	register( root ) {

		const meshes = [];
		const known = new Set( this.entries.map( ( e ) => e.mesh ) );
		root.traverse( ( o ) => { if ( o.isMesh && o.userData.style && ! known.has( o ) ) meshes.push( o ); } );

		for ( const mesh of meshes ) {

			const style = mesh.userData.style;
			const entry = { mesh, style, part: style.part, plain: null, hull: null };
			mesh.material = this.styledMaterial( entry );
			mesh.layers.set( LAYER_STYLED );

			const plain = mesh.isSkinnedMesh ? new THREE.SkinnedMesh( mesh.geometry, this.plainMaterial( style ) ) : new THREE.Mesh( mesh.geometry, this.plainMaterial( style ) );
			if ( mesh.isSkinnedMesh ) { plain.bindMode = mesh.bindMode; plain.bind( mesh.skeleton, mesh.bindMatrix ); }
			plain.frustumCulled = mesh.frustumCulled;
			plain.name = 'plain twin';
			plain.userData.stylelabTwin = true;
			plain.layers.set( LAYER_PLAIN );
			plain.castShadow = mesh.castShadow;
			plain.receiveShadow = mesh.receiveShadow;
			mesh.add( plain );

			entry.plain = plain;
			this.entries.push( entry );
			this.updateHull( entry );

		}

	}

	updateHull( entry ) {

		const pv = this.parts[ entry.part ];
		// Deformed, skinned and see-through meshes get no hull: its extrusion wouldn't follow them.
		const s = entry.style;
		const want = pv.hullEnabled && pv.hullThickness.value > 0.01 && ! s.wave && ! this.effectiveWind( entry ) && ! entry.mesh.isSkinnedMesh && ( s.opacity ?? 1 ) >= 1;

		if ( want && ! entry.hull ) {

			const g = entry.mesh.geometry;
			if ( ! g.getAttribute( 'outlineNormal' ) ) computeOutlineNormals( g );
			const hull = new THREE.Mesh( g, this.hullMaterial( entry.part ) );
			hull.name = 'hull';
			hull.userData.stylelabTwin = true;
			hull.layers.set( LAYER_STYLED );
			hull.castShadow = hull.receiveShadow = false;
			entry.mesh.add( hull );
			entry.hull = hull;

		}

		if ( entry.hull ) {

			entry.hull.visible = want;
			if ( want ) entry.hull.material = this.hullMaterial( entry.part );

		}

	}

	/**
	 * Applies resolved per-part values. Returns the parts whose materials were rebuilt.
	 * @param {object} parts - resolveLook().parts
	 */
	apply( parts, globalValues ) {

		const rebuilt = [];
		const blobParts = PARTS.filter( ( p ) => parts[ p ][ 'lighting.blob.enabled' ] );
		this.blobs.setParts( blobParts );
		const blobs = blobParts.length > 0;
		if ( globalValues ) {

			this.blobs.size = globalValues[ 'lighting.blob.size' ];
			this.blobs.softness.value = globalValues[ 'lighting.blob.softness' ];
			this.blobs.opacity.value = globalValues[ 'lighting.blob.opacity' ];

		}

		for ( const part of PARTS ) {

			const pv = this.parts[ part ];
			const v = parts[ part ];
			pv.values = v;

			const u = pv.surface;
			for ( const [ id, name ] of Object.entries( SURFACE_UNIFORMS ) ) u[ name ].value = v[ id ];
			for ( const [ id, name ] of Object.entries( SURFACE_COLORS ) ) u[ name ].value.set( v[ id ] );
			u.rimLitSide.value = v[ 'surface.rim.litSide' ] ? 1 : 0;
			pv.hullColor.value.set( v[ 'lines.hull.color' ] );
			pv.hullThickness.value = v[ 'lines.hull.thickness' ];
			pv.hullEnabled = v[ 'lines.hull.enabled' ];
			pv.snapRows.value = v[ 'retro.vertexSnap.grid' ];

			const key = structKey( v, blobs );
			if ( pv.struct !== key ) {

				if ( pv.struct !== null ) rebuilt.push( part );
				pv.struct = key;

			}

		}

		for ( const entry of this.entries ) {

			if ( rebuilt.includes( entry.part ) ) entry.mesh.material = this.styledMaterial( entry );
			this.updateHull( entry );

		}

		// Palette changes are uniform updates on each material's base color.
		for ( const material of this.styled.values() ) material.color.set( paletteColor( material.userData.sourceColor, this.parts[ material.userData.part ].values ) );

		if ( rebuilt.length ) this.disposeUnused();
		return rebuilt;

	}

	/** Moves one mesh to another part (pick tool). Returns false if it isn't registered. */
	setPart( mesh, part ) {

		const entry = this.entries.find( ( e ) => e.mesh === mesh );
		if ( ! entry || ! this.parts[ part ] ) return false;
		entry.part = entry.style.part = part;
		entry.mesh.material = this.styledMaterial( entry );
		if ( entry.hull ) { entry.mesh.remove( entry.hull ); entry.hull = null; }
		this.updateHull( entry );
		return true;

	}

	disposeUnused() {

		const used = new Set( this.entries.map( ( e ) => e.mesh.material ) );
		for ( const [ key, material ] of this.styled ) if ( ! used.has( material ) ) { material.dispose(); this.styled.delete( key ); }

	}

	/** Forgets the current scene's meshes (the caller disposes geometry). */
	clearScene() {

		for ( const e of this.entries ) { e.mesh.remove( e.plain ); if ( e.hull ) e.mesh.remove( e.hull ); }
		this.entries = [];
		this.disposeUnused();

	}

	dispose() {

		this.clearScene();
		for ( const m of [ ...this.styled.values(), ...this.plain.values(), ...this.hulls.values() ] ) m.dispose();
		this.styled.clear(); this.plain.clear(); this.hulls.clear();

	}

}
