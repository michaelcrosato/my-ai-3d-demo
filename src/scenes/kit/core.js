// Shared asset-kit helpers (design §6.1, §6.2). Builders are deterministic for a
// given seed, and only build geometry: every mesh carries its part and colors in
// userData, and the style runtime creates the materials (styled and plain twins).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };

export const TIERS = [
	{ id: 0, key: 'blockout', name: 'Blockout' },
	{ id: 1, key: 'lowpoly', name: 'Low-poly' },
	{ id: 2, key: 'crafted', name: 'Crafted' },
	{ id: 3, key: 'detailed', name: 'Detailed' },
];

/** Picks the value for a tier from [T0, T1, T2, T3]. */
export const byTier = ( tier, values ) => values[ Math.min( tier, values.length - 1 ) ];

/** Seeded PRNG (mulberry32). */
export function createRng( seed = 1 ) {

	let a = seed >>> 0;
	const next = () => {

		a = a + 0x6d2b79f5 >>> 0;
		let t = a;
		t = Math.imul( t ^ t >>> 15, t | 1 );
		t ^= t + Math.imul( t ^ t >>> 7, t | 61 );
		return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;

	};

	next.range = ( lo, hi ) => lo + ( hi - lo ) * next();
	next.pick = ( list ) => list[ Math.floor( next() * list.length ) ];
	next.fork = () => createRng( Math.floor( next() * 2 ** 31 ) );
	return next;

}

// Value noise for displacement, deterministic and seamless across shared positions.
function hash3( x, y, z, seed ) {

	let h = Math.imul( x, 374761393 ) ^ Math.imul( y, 668265263 ) ^ Math.imul( z, 2147483647 ) ^ Math.imul( seed, 144665 );
	h = Math.imul( h ^ h >>> 13, 1274126177 );
	return ( ( h ^ h >>> 16 ) >>> 0 ) / 4294967296;

}

export function noise3( x, y, z, seed = 0 ) {

	const xi = Math.floor( x ), yi = Math.floor( y ), zi = Math.floor( z );
	const s = ( t ) => t * t * ( 3 - 2 * t );
	const u = s( x - xi ), v = s( y - yi ), w = s( z - zi );
	const L = ( a, b, t ) => a + ( b - a ) * t;
	const c = ( dx, dy, dz ) => hash3( xi + dx, yi + dy, zi + dz, seed );
	return L(
		L( L( c( 0, 0, 0 ), c( 1, 0, 0 ), u ), L( c( 0, 1, 0 ), c( 1, 1, 0 ), u ), v ),
		L( L( c( 0, 0, 1 ), c( 1, 0, 1 ), u ), L( c( 0, 1, 1 ), c( 1, 1, 1 ), u ), v ),
		w,
	) * 2 - 1;

}

export function fbm( x, y, z, seed = 0, octaves = 3 ) {

	let sum = 0, amp = 0.5, f = 1;
	for ( let i = 0; i < octaves; i ++ ) { sum += amp * noise3( x * f, y * f, z * f, seed + i ); amp *= 0.5; f *= 2; }
	return sum;

}

/** Pushes vertices radially from `center` by noise; shared positions move together, so no cracks. */
export function displace( geometry, { amount = 0.1, scale = 1, seed = 0, center = new THREE.Vector3(), octaves = 3, axis = null } = {} ) {

	const pos = geometry.getAttribute( 'position' );
	const p = new THREE.Vector3(), d = new THREE.Vector3();

	for ( let i = 0; i < pos.count; i ++ ) {

		p.fromBufferAttribute( pos, i );
		const n = fbm( p.x * scale, p.y * scale, p.z * scale, seed, octaves ) * amount;
		if ( axis ) d.copy( axis ); else d.subVectors( p, center ).normalize();
		p.addScaledVector( d, n );
		pos.setXYZ( i, p.x, p.y, p.z );

	}

	pos.needsUpdate = true;
	geometry.computeVertexNormals();
	return geometry;

}

/** Flat (faceted) normals: one normal per triangle. */
export function faceted( geometry ) {

	const g = geometry.index ? geometry.toNonIndexed() : geometry;
	g.computeVertexNormals();
	return g;

}

const KEEP = [ 'position', 'normal' ];

/** Merges geometries (already transformed) into one; keeps position and normal only. */
export function merge( geometries ) {

	const anyFlat = geometries.some( ( g ) => ! g.index );
	const prepared = geometries.map( ( g ) => {

		let out = anyFlat && g.index ? g.toNonIndexed() : g;
		if ( out === g ) out = g.clone();
		for ( const name of Object.keys( out.attributes ) ) if ( ! KEEP.includes( name ) ) out.deleteAttribute( name );
		if ( ! out.getAttribute( 'normal' ) ) out.computeVertexNormals();
		return out;

	} );
	return mergeGeometries( prepared, false );

}

/** Applies position/rotation/scale to a geometry (for merging). */
export function place( geometry, { p = [ 0, 0, 0 ], r = [ 0, 0, 0 ], s = [ 1, 1, 1 ] } = {} ) {

	const m = new THREE.Matrix4().compose(
		new THREE.Vector3( ...p ),
		new THREE.Quaternion().setFromEuler( new THREE.Euler( ...r ) ),
		new THREE.Vector3( ...( typeof s === 'number' ? [ s, s, s ] : s ) ),
	);
	return geometry.applyMatrix4( m );

}

const PLACEHOLDER = new THREE.MeshBasicMaterial();

/**
 * A kit mesh: geometry plus the style metadata the runtime reads.
 * @param {object} o - part, color (sRGB hex), roughness, emissive, emissiveIntensity, wave, doubleSided
 */
export function mesh( geometry, { part, color = '#cccccc', roughness = 0.8, metalness = 0, emissive = null, emissiveIntensity = 1, wave = null, wind = null, opacity = 1, doubleSided = false, castShadow = true, receiveShadow = true, name = '' } = {} ) {

	const m = new THREE.Mesh( geometry, PLACEHOLDER );
	m.name = name;
	m.castShadow = castShadow && opacity >= 1;
	m.receiveShadow = receiveShadow;
	m.userData.style = { part, color, roughness, metalness, emissive, emissiveIntensity, wave, wind, opacity, doubleSided };
	return m;

}

/**
 * A practical light (torch, campfire, lamp). The runtime puts it in both render
 * sets; `flicker` (0–1) animates its intensity with noise.
 */
export function practical( { color = '#ffb35c', intensity = 12, distance = 10, flicker = 0, seed = 0 } = {} ) {

	const light = new THREE.PointLight( color, intensity, distance, 2 );
	light.name = 'practical light';
	light.userData.practical = { flicker };
	if ( flicker > 0 ) {

		light.userData.animate = ( t ) => {

			const n = Math.sin( t * 11.3 + seed ) * 0.5 + Math.sin( t * 23.7 + seed * 2.1 ) * 0.3 + Math.sin( t * 5.1 + seed * 0.7 ) * 0.2;
			light.intensity = intensity * ( 1 + n * flicker * 0.35 );

		};

	}

	return light;

}

/** Number of props for a base count at a density multiplier (×0.5–×4). */
export const count = ( base, density = 1 ) => Math.max( 1, Math.round( base * density ) );

/** Sets the position (and optional rotation/scale) of an object; returns it. */
export function at( object, p = [ 0, 0, 0 ], r = [ 0, 0, 0 ], s = 1 ) {

	object.position.set( ...p );
	object.rotation.set( ...r );
	if ( typeof s === 'number' ) object.scale.setScalar( s ); else object.scale.set( ...s );
	return object;

}

export function group( name, ...children ) {

	const g = new THREE.Group();
	g.name = name;
	for ( const c of children ) if ( c ) g.add( c );
	return g;

}

/** Triangle count of every mesh under `root`. */
export function countTriangles( root ) {

	let n = 0;
	root.traverse( ( o ) => { if ( o.isMesh ) n += ( o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute( 'position' ).count ) / 3; } );
	return n;

}
