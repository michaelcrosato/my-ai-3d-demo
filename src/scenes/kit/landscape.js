// Landscape pieces for the M2 scenes: pines, flower beds, wind-swept grass, distant
// ridges (silhouette layers), ponds and lava.

import { THREE, byTier, faceted, displace, mesh, merge, place, group, fbm } from './core.js';

export function pine( tier, rng, { height = 5, color = '#2f5d3a', trunk = '#5b3b22' } = {} ) {

	const root = group( 'pine' );
	const trunkG = new THREE.CylinderGeometry( 0.1, 0.18, height * 0.35, byTier( tier, [ 5, 6, 10, 16 ] ) );
	trunkG.translate( 0, height * 0.175, 0 );
	root.add( mesh( tier === 1 ? faceted( trunkG ) : trunkG, { part: 'foliage', color: trunk } ) );

	const layers = byTier( tier, [ 1, 3, 4, 6 ] );
	const cones = [];
	for ( let i = 0; i < layers; i ++ ) {

		const t = i / Math.max( 1, layers - 1 );
		const r = height * ( layers === 1 ? 0.3 : 0.34 - t * 0.2 );
		const h = height * ( layers === 1 ? 0.8 : 0.42 - t * 0.12 );
		const g = new THREE.ConeGeometry( r, h, byTier( tier, [ 7, 7, 16, 24 ] ), tier === 3 ? 3 : 1 );
		if ( tier === 3 ) displace( g, { amount: r * 0.1, scale: 3 / r, seed: Math.floor( rng() * 999 ), axis: null } );
		cones.push( place( g, { p: [ 0, height * ( layers === 1 ? 0.6 : 0.35 + t * 0.48 ), 0 ], r: [ 0, rng() * Math.PI, 0 ] } ) );

	}

	const canopy = merge( cones );
	root.add( mesh( tier === 1 ? faceted( canopy ) : canopy, { part: 'foliage', color } ) );
	return root;

}

/** Flowers scattered in a w × d bed, one mesh per color. */
export function flowers( tier, rng, { w = 3, d = 1.2, n = 24, colors = [ '#f7a6c1', '#ffe08a', '#c7a6f7', '#ffffff' ], stem = '#4f8a3a' } = {} ) {

	const root = group( 'flowers' );
	const heads = {}, stems = [];
	for ( let i = 0; i < n; i ++ ) {

		const x = rng.range( - w / 2, w / 2 ), z = rng.range( - d / 2, d / 2 ), h = rng.range( 0.25, 0.45 );
		const c = rng.pick( colors );
		const head = tier === 0 ? new THREE.BoxGeometry( 0.14, 0.14, 0.14 ) : new THREE.IcosahedronGeometry( 0.08, tier >= 2 ? 1 : 0 );
		( heads[ c ] ||= [] ).push( place( head, { p: [ x, h, z ] } ) );
		if ( tier >= 1 ) stems.push( place( new THREE.CylinderGeometry( 0.012, 0.012, h, 4 ), { p: [ x, h / 2, z ] } ) );

	}

	for ( const [ c, g ] of Object.entries( heads ) ) root.add( mesh( merge( g ), { part: 'foliage', color: c, castShadow: false } ) );
	if ( stems.length ) root.add( mesh( merge( stems ), { part: 'foliage', color: stem, castShadow: false } ) );
	return root;

}

/**
 * A field of grass blades in a w × d area, merged into one mesh that sways with
 * the wind (applied by the runtime from style.wind). Blade count grows with tier.
 */
export function grass( tier, rng, { w = 20, d = 20, perSquareMeter = 6, color = '#7fb24a', height = 0.5, avoid = null } = {} ) {

	const n = Math.round( w * d * perSquareMeter * byTier( tier, [ 0.05, 0.25, 1, 3 ] ) );
	const pos = [];
	const segs = tier >= 3 ? 2 : 1;

	for ( let i = 0; i < n; i ++ ) {

		const x = rng.range( - w / 2, w / 2 ), z = rng.range( - d / 2, d / 2 );
		if ( avoid && avoid( x, z ) ) continue;
		const h = height * rng.range( 0.6, 1.3 ), bw = 0.06 * rng.range( 0.7, 1.3 );
		const a = rng() * Math.PI, lean = rng.range( - 0.15, 0.15 );
		const cx = Math.cos( a ) * bw, cz = Math.sin( a ) * bw;

		if ( segs === 1 ) pos.push( x - cx, 0, z - cz, x + cx, 0, z + cz, x + lean, h, z + lean );
		else {

			const mx = x + lean * 0.4, mz = z + lean * 0.4, my = h * 0.55;
			pos.push( x - cx, 0, z - cz, x + cx, 0, z + cz, mx + cx * 0.6, my, mz + cz * 0.6 );
			pos.push( x - cx, 0, z - cz, mx + cx * 0.6, my, mz + cz * 0.6, mx - cx * 0.6, my, mz - cz * 0.6 );
			pos.push( mx - cx * 0.6, my, mz - cz * 0.6, mx + cx * 0.6, my, mz + cz * 0.6, x + lean, h, z + lean );

		}

	}

	const g = new THREE.BufferGeometry();
	g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	g.computeVertexNormals();
	return mesh( g, { part: 'foliage', color, doubleSided: true, castShadow: false, wind: { strength: 0.12, height } } );

}

/** A jagged mountain ridge as a vertical slab: a silhouette layer for distance. */
export function ridge( tier, rng, { width = 120, height = 18, depth = 4, color = '#6a5a7a', peaks = 7 } = {} ) {

	const pts = [ new THREE.Vector2( - width / 2, - 2 ) ];
	const steps = peaks * byTier( tier, [ 1, 2, 4, 8 ] );
	for ( let i = 0; i <= steps; i ++ ) {

		const t = i / steps;
		const base = Math.sin( t * Math.PI ) * 0.4 + 0.5;
		const peak = Math.abs( Math.sin( t * peaks * Math.PI + rng() * 0.6 ) );
		pts.push( new THREE.Vector2( - width / 2 + t * width, height * ( base * 0.6 + peak * 0.5 ) * rng.range( 0.85, 1.05 ) ) );

	}

	pts.push( new THREE.Vector2( width / 2, - 2 ) );
	const g = new THREE.ExtrudeGeometry( new THREE.Shape( pts ), { depth, bevelEnabled: false } );
	g.translate( 0, 0, - depth / 2 );
	return mesh( faceted( g ), { part: 'terrain', color, castShadow: false } );

}

export function pond( tier, rng, { radius = 2.5, color = '#3f8fbf', stones = true } = {} ) {

	const root = group( 'pond' );
	const water = new THREE.CircleGeometry( radius, byTier( tier, [ 10, 12, 40, 64 ] ) );
	water.rotateX( - Math.PI / 2 );
	water.translate( 0, 0.03, 0 );
	root.add( mesh( water, { part: 'water', color, roughness: 0.2, castShadow: false, wave: tier >= 2 ? { amplitude: 0.02, frequency: 2, falloff: radius * 2 } : null } ) );

	if ( stones && tier >= 1 ) {

		const g = [];
		const n = byTier( tier, [ 0, 8, 14, 22 ] );
		for ( let i = 0; i < n; i ++ ) {

			const a = i / n * Math.PI * 2 + rng() * 0.2, s = rng.range( 0.2, 0.38 );
			g.push( place( new THREE.IcosahedronGeometry( s, tier >= 2 ? 1 : 0 ), { p: [ Math.cos( a ) * radius, 0.05, Math.sin( a ) * radius ], s: [ 1, 0.55, 1 ] } ) );

		}

		root.add( mesh( tier === 1 ? faceted( merge( g ) ) : merge( g ), { part: 'props', color: '#9a968e' } ) );

	}

	return root;

}

/** A glowing lava channel along +x. */
export function lava( tier, { length = 8, width = 1.6 } = {} ) {

	const g = new THREE.PlaneGeometry( length, width, byTier( tier, [ 1, 4, 24, 48 ] ), byTier( tier, [ 1, 2, 6, 12 ] ) );
	g.rotateX( - Math.PI / 2 );
	g.translate( length / 2, 0, 0 );
	return mesh( g, { part: 'vfx', color: '#ff5a1f', emissive: '#ff4a10', emissiveIntensity: 2.2, castShadow: false, receiveShadow: false, wave: tier >= 2 ? { amplitude: 0.04, frequency: 1.6, falloff: 1000 } : null } );

}

/**
 * Rolling ground: a w × d grid displaced by fbm. Returns the mesh and heightAt(x, z),
 * so props can sit on it at every tier (the height function ignores the tier).
 */
export function terrainPatch( tier, { w = 60, d = 60, amp = 1.5, scale = 0.06, seed = 1, color = '#8fbf5a', flat = null } = {} ) {

	const heightAt = ( x, z ) => {

		const h = fbm( x * scale, 0, z * scale, seed, 4 ) * amp;
		return flat ? h * flat( x, z ) : h;

	};

	const seg = byTier( tier, [ 12, 20, 64, 160 ] );
	let g = new THREE.PlaneGeometry( w, d, seg, seg );
	g.rotateX( - Math.PI / 2 );
	const pos = g.getAttribute( 'position' );
	for ( let i = 0; i < pos.count; i ++ ) pos.setY( i, heightAt( pos.getX( i ), pos.getZ( i ) ) );
	g.computeVertexNormals();
	if ( tier === 1 ) g = faceted( g );
	return { mesh: mesh( g, { part: 'terrain', color, castShadow: false } ), heightAt };

}
