// Nature: trees, island terrain, sea, foam and clouds.

import { THREE, byTier, faceted, displace, mesh, merge, place, group, fbm } from './core.js';

export function tree( tier, rng, { height = 3.2, leaf = '#5f9e3a', trunk = '#7b5537' } = {} ) {

	const root = group( 'tree' );
	const th = height * 0.45;
	const trunkG = new THREE.CylinderGeometry( byTier( tier, [ 0.18, 0.15, 0.12, 0.12 ] ), 0.22, th, byTier( tier, [ 6, 6, 12, 24 ] ) );
	trunkG.translate( 0, th / 2, 0 );
	root.add( mesh( tier === 1 ? faceted( trunkG ) : trunkG, { part: 'foliage', color: trunk } ) );

	const r = height * 0.32;
	const cy = th + r * 0.8;
	const blobs = byTier( tier, [ 1, 3, 4, 14 ] );
	const leaves = [];

	for ( let i = 0; i < blobs; i ++ ) {

		const a = i / blobs * Math.PI * 2 + rng() * 0.5;
		const spread = i === 0 ? 0 : r * byTier( tier, [ 0, 0.55, 0.55, 0.75 ] );
		const br = i === 0 ? r : r * rng.range( 0.5, 0.72 );
		const g = tier === 0 ? new THREE.SphereGeometry( br, 8, 6 ) : new THREE.IcosahedronGeometry( br, byTier( tier, [ 0, 1, 3, 2 ] ) );
		const p = [ Math.cos( a ) * spread, cy + ( i === 0 ? 0 : rng.range( - 0.2, 0.45 ) * r ), Math.sin( a ) * spread ];
		if ( tier >= 1 ) displace( g, { amount: br * byTier( tier, [ 0, 0.12, 0.08, 0.16 ] ), scale: 2.2 / br, seed: Math.floor( rng() * 999 ) } );
		leaves.push( place( g, { p } ) );

	}

	if ( tier >= 3 ) {

		// Branches into the canopy.
		const branches = [];
		for ( let i = 0; i < 4; i ++ ) {

			const a = i / 4 * Math.PI * 2;
			branches.push( place( new THREE.CylinderGeometry( 0.03, 0.07, r * 1.1, 8 ), { p: [ Math.cos( a ) * r * 0.3, th + r * 0.3, Math.sin( a ) * r * 0.3 ], r: [ Math.sin( a ) * 0.7, 0, - Math.cos( a ) * 0.7 ] } ) );

		}

		root.add( mesh( merge( branches ), { part: 'foliage', color: trunk } ) );

	}

	const canopy = merge( leaves );
	root.add( mesh( tier === 1 ? faceted( canopy ) : canopy, { part: 'foliage', color: leaf } ) );
	return root;

}

/** A hill (lathe profile) with optional noise; part terrain. */
/** Height of a hill profile at distance `r` from its center (without noise). */
export function hillHeight( r, { radius = 16, height = 4, edge = - 0.6, power = 1.3 } = {} ) {

	const t = Math.min( 1, r / radius );
	return edge + ( height - edge ) * ( 0.5 + 0.5 * Math.cos( Math.PI * Math.pow( t, power ) ) );

}

export function hill( tier, { radius = 16, height = 4, color = '#7cb342', seed = 1, rough = 0.15, edge = - 0.6, power = 1.3 } = {} ) {

	const steps = byTier( tier, [ 4, 6, 14, 40 ] );
	const pts = [];
	// Rim to center: LatheGeometry expects the profile bottom-to-top for outward normals.
	for ( let i = steps; i >= 0; i -- ) {

		const t = i / steps;
		pts.push( new THREE.Vector2( Math.max( 0.001, radius * t ), hillHeight( radius * t, { radius, height, edge, power } ) ) );

	}

	let g = new THREE.LatheGeometry( pts, byTier( tier, [ 10, 12, 48, 128 ] ) );
	if ( tier >= 2 ) {

		const pos = g.getAttribute( 'position' );
		const amp = height * rough * ( tier === 3 ? 1 : 0.6 );
		for ( let i = 0; i < pos.count; i ++ ) {

			const x = pos.getX( i ), z = pos.getZ( i );
			const fall = Math.min( 1, Math.hypot( x, z ) / radius );
			pos.setY( i, pos.getY( i ) + fbm( x * 0.18, 0, z * 0.18, seed, tier === 3 ? 5 : 3 ) * amp * ( 1 - fall * fall ) );

		}

		g.computeVertexNormals();

	}

	if ( tier === 1 ) g = faceted( g );
	return mesh( g, { part: 'terrain', color } );

}

/** Flat ring of sand or foam lying on the water. */
export function ring( tier, inner, outer, y, o ) {

	const g = new THREE.RingGeometry( inner, outer, byTier( tier, [ 16, 20, 64, 160 ] ), 1 );
	g.rotateX( - Math.PI / 2 );
	g.translate( 0, y, 0 );
	return mesh( g, { castShadow: false, ...o } );

}

/** The sea: a large disk, with vertex waves applied by the runtime. */
export function sea( tier, { radius = 420, color = '#2f7fb8' } = {} ) {

	const g = new THREE.CircleGeometry( radius, byTier( tier, [ 32, 48, 96, 160 ] ) );
	g.rotateX( - Math.PI / 2 );

	if ( tier >= 2 ) {

		// Concentric rings so the waves have vertices to move near the island.
		const rings = [];
		const n = byTier( tier, [ 0, 0, 40, 110 ] );
		for ( let i = 0; i < n; i ++ ) {

			const r0 = 18 + i * i * 0.032, r1 = 18 + ( i + 1 ) * ( i + 1 ) * 0.032;
			const rg = new THREE.RingGeometry( r0, r1, byTier( tier, [ 0, 0, 96, 220 ] ), 1 );
			rg.rotateX( - Math.PI / 2 );
			rings.push( rg );

		}

		const outer = new THREE.RingGeometry( 18 + n * n * 0.032, radius, 96, 4 );
		outer.rotateX( - Math.PI / 2 );
		rings.push( outer );
		return mesh( merge( rings ), { part: 'water', color, roughness: 0.3, wave: { amplitude: 0.12, frequency: 0.35 }, castShadow: false } );

	}

	return mesh( g, { part: 'water', color, roughness: 0.3, wave: tier >= 1 ? { amplitude: 0.08, frequency: 0.35 } : null, castShadow: false } );

}

export function cloud( tier, rng, { size = 10 } = {} ) {

	const n = byTier( tier, [ 1, 3, 5, 9 ] );
	const parts = [];

	for ( let i = 0; i < n; i ++ ) {

		const r = size * ( i === 0 ? 0.5 : rng.range( 0.28, 0.42 ) );
		const g = tier === 0 ? new THREE.SphereGeometry( r, 10, 7 ) : new THREE.IcosahedronGeometry( r, byTier( tier, [ 0, 1, 3, 4 ] ) );
		g.scale( 1, 0.62, 1 );
		const x = i === 0 ? 0 : rng.range( - 0.9, 0.9 ) * size * 0.55;
		parts.push( place( g, { p: [ x, i === 0 ? 0 : rng.range( - 0.1, 0.18 ) * size, rng.range( - 0.3, 0.3 ) * size * 0.4 ] } ) );

	}

	const g = merge( parts );
	return mesh( tier === 1 ? faceted( g ) : g, { part: 'sky', color: '#ffffff', castShadow: false, receiveShadow: false } );

}
