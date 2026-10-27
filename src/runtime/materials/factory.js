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
import { uniform, vec3, vec4, mrt, output, fract, sin, cos, dot, floor, smoothstep, modelWorldMatrix, positionLocal, Fn } from 'three/tsl';
import { StyleSurfaceMaterial, StyleStandardMaterial, createSurfaceUniforms } from './StyleLightingModel.js';
import { createHullMaterial, computeOutlineNormals } from './outline.js';
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

/** Base color after the palette module: remap → tint → saturation/value/hue. */
export function paletteColor( hex, v ) {

	let c = hex.toLowerCase();
	if ( v[ 'palette.remap' ] > 0 && v[ 'palette.colors' ].length ) c = mixHex( c, remapToPalette( c, v[ 'palette.colors' ], { keepValue: v[ 'palette.keepValue' ] } ), v[ 'palette.remap' ] );
	if ( v[ 'palette.tintAmount' ] > 0 ) c = mixHex( c, v[ 'palette.tint' ], v[ 'palette.tintAmount' ] );
	return adjustHex( c, { saturation: v[ 'palette.saturation' ], value: v[ 'palette.value' ], hue: v[ 'palette.hue' ] } );

}

const structKey = ( v ) => `${v[ 'surface.model' ]}|${v[ 'surface.model' ] === 'pbr' ? 0 : v[ 'surface.bands' ]}|${v[ 'surface.flatNormals' ] ? 1 : 0}`;

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
			struct: null,
			values: null,
		} ] ) );
		this.styled = new Map();
		this.plain = new Map();
		this.hulls = new Map();
		this.entries = [];
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

	styledMaterial( style, part ) {

		const pv = this.parts[ part ];
		const key = [ part, pv.struct, style.color, style.emissive, style.emissiveIntensity, style.roughness, style.wave ? `${style.wave.amplitude}/${style.wave.frequency}` : '', style.doubleSided ].join( '|' );
		let material = this.styled.get( key );
		if ( material ) return material;

		const v = pv.values;
		const surface = { model: v[ 'surface.model' ], bands: v[ 'surface.bands' ], uniforms: pv.surface };
		material = surface.model === 'pbr'
			? new StyleStandardMaterial( surface, this.keyDirection, { roughness: style.roughness, metalness: 0 } )
			: new StyleSurfaceMaterial( surface );

		material.name = `style:${part}:${surface.model}`;
		material.flatShading = v[ 'surface.flatNormals' ];
		material.side = style.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
		if ( style.emissive ) { material.emissive = new THREE.Color( style.emissive ); material.emissiveIntensity = style.emissiveIntensity; }
		material.positionNode = this.waveNode( style.wave );
		// `output` keeps the color attachment when the pass has no MRT (MRTNode skips unknown names).
		material.mrtNode = mrt( { output, ids: idsNode( part ) } );
		material.userData = { sourceColor: style.color, part, key };
		material.color.set( paletteColor( style.color, v ) );

		this.styled.set( key, material );
		this.built ++;
		return material;

	}

	plainMaterial( style ) {

		const key = [ style.color, style.emissive, style.emissiveIntensity, style.wave ? `${style.wave.amplitude}/${style.wave.frequency}` : '', style.doubleSided ].join( '|' );
		let material = this.plain.get( key );
		if ( material ) return material;

		// The "agent default" baseline (§6.9): standard PBR, roughness 0.8, no fog.
		material = new THREE.MeshStandardNodeMaterial( { color: new THREE.Color( style.color ), roughness: 0.8, metalness: 0, fog: false } );
		material.name = 'plain';
		material.side = style.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
		if ( style.emissive ) { material.emissive = new THREE.Color( style.emissive ); material.emissiveIntensity = style.emissiveIntensity; }
		material.positionNode = this.waveNode( style.wave );
		this.plain.set( key, material );
		return material;

	}

	hullMaterial( part ) {

		let material = this.hulls.get( part );
		if ( material ) return material;
		const pv = this.parts[ part ];
		material = createHullMaterial( { THREE, TSL, color: pv.hullColor, thickness: pv.hullThickness } );
		material.name = `hull:${part}`;
		material.mrtNode = mrt( { output, ids: idsNode( part ) } );
		this.hulls.set( part, material );
		this.built ++;
		return material;

	}

	/** Makes `root`'s kit meshes into twins. Call after apply() has run once. */
	register( root ) {

		const meshes = [];
		root.traverse( ( o ) => { if ( o.isMesh && o.userData.style ) meshes.push( o ); } );

		for ( const mesh of meshes ) {

			const style = mesh.userData.style;
			mesh.material = this.styledMaterial( style, style.part );
			mesh.layers.set( LAYER_STYLED );

			const plain = new THREE.Mesh( mesh.geometry, this.plainMaterial( style ) );
			plain.name = 'plain twin';
			plain.layers.set( LAYER_PLAIN );
			plain.castShadow = mesh.castShadow;
			plain.receiveShadow = mesh.receiveShadow;
			mesh.add( plain );

			const entry = { mesh, style, part: style.part, plain, hull: null };
			this.entries.push( entry );
			this.updateHull( entry );

		}

	}

	updateHull( entry ) {

		const pv = this.parts[ entry.part ];
		const want = pv.hullEnabled && pv.hullThickness.value > 0.01 && ! entry.style.wave;

		if ( want && ! entry.hull ) {

			const g = entry.mesh.geometry;
			if ( ! g.getAttribute( 'outlineNormal' ) ) computeOutlineNormals( g );
			const hull = new THREE.Mesh( g, this.hullMaterial( entry.part ) );
			hull.name = 'hull';
			hull.layers.set( LAYER_STYLED );
			hull.castShadow = hull.receiveShadow = false;
			entry.mesh.add( hull );
			entry.hull = hull;

		}

		if ( entry.hull ) entry.hull.visible = want;

	}

	/**
	 * Applies resolved per-part values. Returns the parts whose materials were rebuilt.
	 * @param {object} parts - resolveLook().parts
	 */
	apply( parts ) {

		const rebuilt = [];

		for ( const part of PARTS ) {

			const pv = this.parts[ part ];
			const v = parts[ part ];
			pv.values = v;

			const u = pv.surface;
			u.threshold.value = v[ 'surface.threshold' ];
			u.softness.value = v[ 'surface.softness' ];
			u.shadowTint.value.set( v[ 'surface.shadowTint' ] );
			u.tintStrength.value = v[ 'surface.shadowTintStrength' ];
			u.specIntensity.value = v[ 'surface.spec.intensity' ];
			u.specSize.value = v[ 'surface.spec.size' ];
			u.specSoftness.value = v[ 'surface.spec.softness' ];
			u.rimIntensity.value = v[ 'surface.rim.intensity' ];
			u.rimWidth.value = v[ 'surface.rim.width' ];
			u.rimSoftness.value = v[ 'surface.rim.softness' ];
			u.rimColor.value.set( v[ 'surface.rim.color' ] );
			u.rimLitSide.value = v[ 'surface.rim.litSide' ] ? 1 : 0;
			pv.hullColor.value.set( v[ 'lines.hull.color' ] );
			pv.hullThickness.value = v[ 'lines.hull.thickness' ];
			pv.hullEnabled = v[ 'lines.hull.enabled' ];

			const key = structKey( v );
			if ( pv.struct !== key ) {

				if ( pv.struct !== null ) rebuilt.push( part );
				pv.struct = key;

			}

		}

		for ( const entry of this.entries ) {

			if ( rebuilt.includes( entry.part ) ) entry.mesh.material = this.styledMaterial( entry.style, entry.part );
			this.updateHull( entry );

		}

		// Palette changes are uniform updates on each material's base color.
		for ( const material of this.styled.values() ) material.color.set( paletteColor( material.userData.sourceColor, this.parts[ material.userData.part ].values ) );

		if ( rebuilt.length ) this.disposeUnused();
		return rebuilt;

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
