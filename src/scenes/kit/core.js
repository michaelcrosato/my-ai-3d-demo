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
 * @param {object} o - part, color (sRGB hex), roughness, emissive, emissiveIntensity, wave, doubleSided,
 *   map (a kitTexture() name; the geometry needs uvs), interactable (the highlight's target)
 */
export function mesh( geometry, { part, color = '#cccccc', roughness = 0.8, metalness = 0, emissive = null, emissiveIntensity = 1, wave = null, wind = null, opacity = 1, doubleSided = false, castShadow = true, receiveShadow = true, name = '', map = null, interactable = false } = {} ) {

	const m = new THREE.Mesh( geometry, PLACEHOLDER );
	m.name = name;
	m.castShadow = castShadow && opacity >= 1;
	m.receiveShadow = receiveShadow;
	m.userData.style = { part, color, roughness, metalness, emissive, emissiveIntensity, wave, wind, opacity, doubleSided };
	if ( map ) m.userData.style.map = kitTexture( map );
	if ( interactable ) m.userData.style.interactable = true;
	return m;

}

/** Tags every kit mesh under `object` as interactable (what the highlight outlines); returns it. */
export function interactable( object ) {

	object.traverse( ( o ) => { if ( o.userData.style ) o.userData.style.interactable = true; } );
	return object;

}

const textures = new Map();

/**
 * Small procedural textures (64 × 64, sRGB, repeating), for the surfaces where texturing is
 * the point: the retro filters (nearest, N64, affine warp) only show on textured surfaces.
 * Values are near white with dark mortar or seams, so the mesh color tints them.
 */
export function kitTexture( kind ) {

	if ( textures.has( kind ) ) return textures.get( kind );
	const N = 64, data = new Uint8Array( N * N * 4 );
	const hash = ( x, y ) => { let h = Math.imul( x, 374761393 ) ^ Math.imul( y, 668265263 ) ^ kind.length * 977; h = Math.imul( h ^ h >>> 13, 1274126177 ); return ( ( h ^ h >>> 16 ) >>> 0 ) / 4294967296; };
	for ( let y = 0; y < N; y ++ ) for ( let x = 0; x < N; x ++ ) {

		let v = 1;
		if ( kind === 'bricks' ) {

			// 4 courses of 2 bricks, offset every other course, 2-texel mortar.
			const row = Math.floor( y / 16 ), bx = ( x + ( row % 2 ) * 16 ) % 64;
			const mortar = y % 16 < 2 || bx % 32 < 2;
			v = mortar ? 0.42 : 0.78 + 0.2 * hash( Math.floor( bx / 32 ) + row * 7, row ) + 0.06 * ( hash( x, y ) - 0.5 );

		} else if ( kind === 'cobbles' ) {

			// Rounded stones in a jittered 4 × 4 grid: dark gaps between them.
			let best = 9, second = 9;
			for ( let j = - 1; j <= 4; j ++ ) for ( let i = - 1; i <= 4; i ++ ) {

				const cx = ( i + 0.25 + 0.5 * hash( ( i + 4 ) % 4, ( j + 4 ) % 4 ) ) * 16, cy = ( j + 0.25 + 0.5 * hash( ( j + 4 ) % 4 + 9, ( i + 4 ) % 4 ) ) * 16;
				const d = Math.hypot( x - cx, y - cy );
				if ( d < best ) { second = best; best = d; } else if ( d < second ) second = d;

			}

			v = second - best < 2 ? 0.3 : 0.7 + 0.25 * ( 1 - Math.min( 1, best / 10 ) ) + 0.05 * ( hash( x, y ) - 0.5 );

		} else if ( kind === 'planks' ) {

			const plank = Math.floor( x / 16 );
			v = x % 16 < 1 ? 0.4 : 0.75 + 0.15 * hash( plank, 3 ) + 0.08 * Math.sin( ( y + hash( plank, 5 ) * 40 ) * 0.6 + x * 0.2 );

		} else {

			// checker: a UV test card.
			v = ( Math.floor( x / 8 ) + Math.floor( y / 8 ) ) % 2 ? 1 : 0.55;

		}

		const k = ( y * N + x ) * 4, c = Math.round( Math.min( 1, Math.max( 0, v ) ) * 255 );
		data[ k ] = data[ k + 1 ] = data[ k + 2 ] = c;
		data[ k + 3 ] = 255;

	}

	const t = new THREE.DataTexture( data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType );
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.magFilter = THREE.LinearFilter;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	t.generateMipmaps = true;
	t.name = `kit:${kind}`;
	t.needsUpdate = true;
	textures.set( kind, t );
	return t;

}

/** Scales a geometry's uvs, so a repeating texture tiles `sx` × `sy` times; returns it. */
export function tileUv( geometry, sx, sy = sx ) {

	const uv = geometry.getAttribute( 'uv' );
	for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, uv.getX( i ) * sx, uv.getY( i ) * sy );
	uv.needsUpdate = true;
	return geometry;

}

/**
 * A practical light (torch, campfire, lamp). The runtime puts it in both render
 * sets and animates `flicker` (0–1) as noise on its intensity, scaled by the look's
 * practical-light controls in the styled set.
 */
export function practical( { color = '#ffb35c', intensity = 12, distance = 10, flicker = 0, seed = 0 } = {} ) {

	const light = new THREE.PointLight( color, intensity, distance, 2 );
	light.name = 'practical light';
	light.userData.practical = { flicker, seed };
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
