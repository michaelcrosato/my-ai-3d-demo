// Structures for the M2 scenes: fences, hedges, walls, pillars, stairs, ramps, rails,
// lamps and torches, a shrine gate, stone lanterns, city buildings, stands and tents.

import { THREE, byTier, faceted, displace, mesh, merge, place, group, practical } from './core.js';
import { box, cylinder } from './shapes.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const A = 'architecture', P = 'props';
const ft = ( g, tier ) => tier === 1 ? faceted( g ) : g;

/** Picket fence along +x, `length` long. */
export function fence( tier, length, { color = '#f3efe6', part = P } = {} ) {

	const g = [];
	const posts = Math.max( 2, Math.round( length / 1.6 ) + 1 );
	for ( let i = 0; i < posts; i ++ ) g.push( place( new THREE.BoxGeometry( 0.1, 0.9, 0.1 ), { p: [ i / ( posts - 1 ) * length, 0.45, 0 ] } ) );
	if ( tier === 0 ) g.push( place( new THREE.BoxGeometry( length, 0.5, 0.04 ), { p: [ length / 2, 0.45, 0 ] } ) );
	else for ( const y of [ 0.3, 0.68 ] ) g.push( place( new THREE.BoxGeometry( length, 0.07, 0.04 ), { p: [ length / 2, y, 0.05 ] } ) );

	if ( tier >= 2 ) {

		const n = Math.round( length / 0.2 );
		for ( let i = 0; i < n; i ++ ) {

			const x = ( i + 0.5 ) * length / n;
			g.push( place( new THREE.BoxGeometry( 0.08, 0.78, 0.025 ), { p: [ x, 0.42, 0.08 ] } ) );
			if ( tier === 3 ) g.push( place( new THREE.ConeGeometry( 0.057, 0.08, 4 ), { p: [ x, 0.85, 0.08 ], r: [ 0, Math.PI / 4, 0 ] } ) );

		}

	}

	return mesh( merge( g ), { part, color } );

}

/** A clipped hedge block. T3 adds leafy bumps. */
export function hedge( tier, [ w, h, d ], { color = '#5a9a4a', seed = 0 } = {} ) {

	let g = tier >= 2 ? new RoundedBoxGeometry( w, h, d, tier === 2 ? 3 : 4, Math.min( w, h, d ) * 0.25 ) : new THREE.BoxGeometry( w, h, d, tier ? 2 : 1, tier ? 2 : 1, tier ? 2 : 1 );
	g.translate( 0, h / 2, 0 );
	if ( tier === 3 ) {

		displace( g, { amount: Math.min( w, h, d ) * 0.06, scale: 5, seed, center: new THREE.Vector3( 0, h / 2, 0 ) } );

	}

	return mesh( ft( g, tier ), { part: 'foliage', color } );

}

/** Stone wall along +x. T3 lays individual stones in courses. */
export function wall( tier, length, height, { thick = 0.6, color = '#8a8580', part = A } = {} ) {

	if ( tier < 3 ) {

		const body = box( tier, [ length, height, thick ], { part, color }, { bevel: 0.04 } );
		body.position.set( length / 2, height / 2, 0 );
		const root = group( 'wall', body );
		if ( tier >= 1 ) {

			const cap = box( tier, [ length + 0.1, 0.15, thick + 0.12 ], { part, color: '#9d9892' } );
			cap.position.set( length / 2, height + 0.07, 0 );
			root.add( cap );

		}

		return root;

	}

	const stones = [];
	const rows = Math.max( 2, Math.round( height / 0.35 ) );
	for ( let r = 0; r < rows; r ++ ) {

		const sh = height / rows;
		for ( let x = ( r % 2 ) * - 0.35; x < length; x += 0.7 ) {

			const w = Math.min( 0.66, length - Math.max( 0, x ) );
			if ( w <= 0.05 ) continue;
			stones.push( place( new RoundedBoxGeometry( w, sh * 0.92, thick, 1, 0.04 ), { p: [ Math.max( 0, x ) + w / 2, ( r + 0.5 ) * sh, ( ( r * 7 + Math.round( x * 3 ) ) % 3 - 1 ) * 0.02 ] } ) );

		}

	}

	return group( 'wall', mesh( merge( stones ), { part, color } ) );

}

/** Column with base and capital. T3 adds fluting. */
export function pillar( tier, height, radius, { color = '#a29e96', part = A } = {} ) {

	const root = group( 'pillar' );
	const shaft = cylinder( tier, radius, height, { part, color } );
	shaft.position.y = height / 2;
	root.add( shaft );

	if ( tier >= 1 ) {

		const ends = [ place( new THREE.BoxGeometry( radius * 2.6, 0.25, radius * 2.6 ), { p: [ 0, 0.12, 0 ] } ), place( new THREE.BoxGeometry( radius * 2.6, 0.25, radius * 2.6 ), { p: [ 0, height - 0.12, 0 ] } ) ];
		if ( tier >= 2 ) ends.push( place( new THREE.CylinderGeometry( radius * 1.1, radius * 1.3, 0.2, 32 ), { p: [ 0, 0.32, 0 ] } ), place( new THREE.CylinderGeometry( radius * 1.3, radius * 1.1, 0.2, 32 ), { p: [ 0, height - 0.32, 0 ] } ) );
		root.add( mesh( merge( ends ), { part, color: '#b5b0a7' } ) );

	}

	if ( tier >= 3 ) {

		const flutes = [];
		for ( let i = 0; i < 16; i ++ ) {

			const a = i / 16 * Math.PI * 2;
			flutes.push( place( new THREE.BoxGeometry( 0.04, height - 0.8, 0.04 ), { p: [ Math.cos( a ) * radius * 1.01, height / 2, Math.sin( a ) * radius * 1.01 ], r: [ 0, - a, 0 ] } ) );

		}

		root.add( mesh( merge( flutes ), { part, color: '#948f87' } ) );

	}

	return root;

}

/** Straight stairs going up along +z. */
export function stairs( tier, { steps = 5, width = 3, rise = 0.25, run = 0.45, color = '#9a958d', part = A } = {} ) {

	const g = [];
	for ( let i = 0; i < steps; i ++ ) {

		const geom = tier >= 2 ? new RoundedBoxGeometry( width, rise * ( i + 1 ), run, 2, 0.03 ) : new THREE.BoxGeometry( width, rise * ( i + 1 ), run );
		g.push( place( geom, { p: [ 0, rise * ( i + 1 ) / 2, i * run ] } ) );

	}

	return mesh( merge( g ), { part, color } );

}

/** Quarter-pipe ramp facing +z (riding surface curves up toward -z). */
export function ramp( tier, { width = 4, height = 1.6, color = '#c9ccd3', part = P } = {} ) {

	const root = group( 'ramp' );
	if ( tier === 0 ) {

		const shape = new THREE.Shape( [ new THREE.Vector2( 0, 0 ), new THREE.Vector2( height * 1.4, 0 ), new THREE.Vector2( 0, height ) ] );
		const g = new THREE.ExtrudeGeometry( shape, { depth: width, bevelEnabled: false } );
		g.rotateY( Math.PI / 2 );
		g.translate( - width / 2, 0, 0 );
		root.add( mesh( g, { part, color } ) );
		return root;

	}

	const seg = byTier( tier, [ 0, 5, 16, 32 ] );
	const pts = [ new THREE.Vector2( 0, 0 ) ];
	for ( let i = 0; i <= seg; i ++ ) {

		const a = i / seg * Math.PI / 2;
		pts.push( new THREE.Vector2( height - Math.sin( a ) * height, height - Math.cos( a ) * height ) );

	}

	pts.push( new THREE.Vector2( 0, height ) );
	const g = new THREE.ExtrudeGeometry( new THREE.Shape( pts ), { depth: width, bevelEnabled: false, curveSegments: seg } );
	g.rotateY( Math.PI / 2 );
	g.translate( - width / 2, 0, 0 );
	root.add( mesh( ft( g, tier ), { part, color } ) );

	if ( tier >= 2 ) {

		const coping = cylinder( tier, 0.05, width, { part, color: '#7c818c' } );
		coping.rotation.z = Math.PI / 2;
		coping.position.set( 0, height, 0 );
		root.add( coping );

	}

	return root;

}

/** Grind rail along +x on short posts. */
export function rail( tier, length, { height = 0.6, color = '#ffe600', part = P } = {} ) {

	const seg = byTier( tier, [ 6, 8, 16, 24 ] );
	const g = [ place( new THREE.CylinderGeometry( 0.05, 0.05, length, seg ), { p: [ length / 2, height, 0 ], r: [ 0, 0, Math.PI / 2 ] } ) ];
	const n = Math.max( 2, Math.round( length / 2 ) + 1 );
	for ( let i = 0; i < n; i ++ ) g.push( place( new THREE.CylinderGeometry( 0.035, 0.035, height, seg ), { p: [ i / ( n - 1 ) * length, height / 2, 0 ] } ) );
	return mesh( merge( g ), { part, color, roughness: 0.35, metalness: 0.4 } );

}

/** Street lamp with a glowing head and a practical light. */
export function lampPost( tier, { height = 4, glow = '#ffe9b0', light = true } = {} ) {

	const root = group( 'lamp post' );
	const pole = cylinder( tier, 0.07, height, { part: P, color: '#3a3f4a' } );
	pole.position.y = height / 2;
	root.add( pole );
	const head = mesh( tier >= 2 ? new THREE.SphereGeometry( 0.22, 24, 16 ) : new THREE.BoxGeometry( 0.35, 0.35, 0.35 ), { part: 'vfx', color: glow, emissive: glow, emissiveIntensity: 2.5, castShadow: false } );
	head.position.y = height + 0.1;
	root.add( head );
	if ( light ) {

		const l = practical( { color: glow, intensity: 10, distance: 9 } );
		l.position.y = height - 0.2;
		root.add( l );

	}
	return root;

}

/** Wall torch: bracket, flame and a flickering practical light. */
export function torch( tier, { seed = 0, light = true } = {} ) {

	const root = group( 'torch' );
	root.add( mesh( new THREE.CylinderGeometry( 0.05, 0.035, 0.45, byTier( tier, [ 6, 6, 12, 16 ] ) ), { part: P, color: '#4a3220' } ) );
	const flame = mesh( tier >= 2 ? new THREE.ConeGeometry( 0.1, 0.32, 16 ) : new THREE.OctahedronGeometry( 0.12 ), { part: 'vfx', color: '#ffb347', emissive: '#ff8a1e', emissiveIntensity: 4, castShadow: false } );
	flame.position.y = 0.38;
	root.add( flame );
	if ( light ) {

		const l = practical( { color: '#ff9a3c', intensity: 9, distance: 9, flicker: 1, seed } );
		l.position.y = 0.6;
		root.add( l );

	}

	flame.userData.animate = ( t ) => { flame.scale.y = 1 + Math.sin( t * 13 + seed ) * 0.12 + Math.sin( t * 29 + seed ) * 0.06; };
	return root;

}

/** Shrine gate: two pillars, two crossbeams, upturned ends from T2. */
export function gate( tier, { width = 4, height = 4.2, color = '#c8402e' } = {} ) {

	const root = group( 'gate' );
	for ( const x of [ - width / 2, width / 2 ] ) {

		const post = cylinder( tier, 0.2, height, { part: A, color } );
		post.position.set( x, height / 2, 0 );
		root.add( post );

	}

	const beams = [ place( new THREE.BoxGeometry( width + 0.6, 0.22, 0.3 ), { p: [ 0, height * 0.78, 0 ] } ) ];
	let top;
	if ( tier >= 2 ) {

		const shape = new THREE.Shape();
		const w = width / 2 + 1.1;
		shape.moveTo( - w, 0.25 ); shape.quadraticCurveTo( 0, - 0.12, w, 0.25 ); shape.lineTo( w, 0.5 ); shape.quadraticCurveTo( 0, 0.15, - w, 0.5 ); shape.lineTo( - w, 0.25 );
		top = new THREE.ExtrudeGeometry( shape, { depth: 0.5, bevelEnabled: false, curveSegments: tier === 3 ? 24 : 10 } );
		top.translate( 0, height - 0.1, - 0.25 );

	} else top = place( new THREE.BoxGeometry( width + 1.4, 0.3, 0.45 ), { p: [ 0, height + 0.1, 0 ] } );

	root.add( mesh( merge( beams ), { part: A, color } ), mesh( top, { part: A, color: tier >= 2 ? '#2b2b2b' : color } ) );
	return root;

}

/** Stone lantern with a warm glow. */
export function stoneLantern( tier, { light = false, seed = 0 } = {} ) {

	const root = group( 'stone lantern' );
	const stone = '#8f8b84';
	const g = [
		place( new THREE.BoxGeometry( 0.6, 0.15, 0.6 ), { p: [ 0, 0.07, 0 ] } ),
		place( new THREE.CylinderGeometry( 0.12, 0.15, 0.7, byTier( tier, [ 6, 6, 16, 24 ] ) ), { p: [ 0, 0.5, 0 ] } ),
		place( new THREE.BoxGeometry( 0.55, 0.1, 0.55 ), { p: [ 0, 0.9, 0 ] } ),
		place( new THREE.ConeGeometry( 0.48, 0.32, 4 ), { p: [ 0, 1.48, 0 ], r: [ 0, Math.PI / 4, 0 ] } ),
	];
	root.add( mesh( tier === 1 ? faceted( merge( g ) ) : merge( g ), { part: A, color: stone } ) );
	const glow = mesh( new THREE.BoxGeometry( 0.34, 0.3, 0.34 ), { part: 'vfx', color: '#ffe3a0', emissive: '#ffb84d', emissiveIntensity: 2, castShadow: false } );
	glow.position.y = 1.12;
	root.add( glow );
	if ( light ) {

		const l = practical( { intensity: 4, distance: 6, flicker: 0.4, seed } );
		l.position.y = 1.15;
		root.add( l );

	}
	return root;

}

/** City building: windows, ledges, rooftop units. Footprint centered, ground at y = 0. */
export function building( tier, rng, { w = 6, d = 5, h = 9, color = '#d36b4a', window = '#28324a', part = A } = {} ) {

	const root = group( 'building' );
	const body = box( tier, [ w, h, d ], { part, color }, { bevel: 0.02 } );
	body.position.y = h / 2;
	root.add( body );
	if ( tier === 0 ) return root;

	const floors = Math.max( 2, Math.floor( h / 2.6 ) );
	const cols = Math.max( 1, Math.floor( w / 1.6 ) );
	const wins = [], trims = [];

	for ( let f = 0; f < floors; f ++ ) {

		const y = 1.6 + f * ( h - 1.6 ) / floors;
		for ( let c = 0; c < cols; c ++ ) {

			const x = ( c + 0.5 ) * w / cols - w / 2;
			wins.push( place( new THREE.BoxGeometry( 0.8, 1.1, 0.06 ), { p: [ x, y, d / 2 + 0.01 ] } ) );
			if ( tier >= 2 ) trims.push( place( new THREE.BoxGeometry( 1, 0.1, 0.16 ), { p: [ x, y - 0.6, d / 2 + 0.05 ] } ) );

		}

		if ( tier >= 3 && f > 0 ) trims.push( place( new THREE.BoxGeometry( w + 0.1, 0.12, d + 0.1 ), { p: [ 0, y - 0.95, 0 ] } ) );

	}

	root.add( mesh( merge( wins ), { part, color: window, roughness: 0.25 } ) );
	const roof = [ place( new THREE.BoxGeometry( w + 0.2, 0.3, d + 0.2 ), { p: [ 0, h + 0.15, 0 ] } ) ];
	if ( tier >= 2 ) {

		for ( let i = 0; i < 2; i ++ ) roof.push( place( new THREE.BoxGeometry( 1.2, 0.8, 1 ), { p: [ rng.range( - w / 3, w / 3 ), h + 0.7, rng.range( - d / 3, d / 3 ) ] } ) );
		trims.push( place( new THREE.BoxGeometry( 1.4, 2.2, 0.12 ), { p: [ 0, 1.1, d / 2 + 0.04 ] } ) );

	}

	root.add( mesh( merge( roof ), { part, color: '#5b5f6a' } ) );
	if ( trims.length ) root.add( mesh( merge( trims ), { part, color: '#e8e4dc' } ) );
	return root;

}

/** Grandstand along +x with a crowd of colored blobs (heads from T2). */
export function stands( tier, rng, length, { rows = 4, colors = [ '#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1' ] } = {} ) {

	const root = group( 'stands' );
	const steps = [];
	for ( let r = 0; r < rows; r ++ ) steps.push( place( new THREE.BoxGeometry( length, 0.5 * ( r + 1 ), 0.9 ), { p: [ length / 2, 0.25 * ( r + 1 ), - r * 0.9 ] } ) );
	root.add( mesh( merge( steps ), { part: A, color: '#a7abb3' } ) );

	const per = byTier( tier, [ 0, 6, 12, 20 ] );
	if ( per ) {

		const bodies = {}, heads = [];
		for ( let r = 0; r < rows; r ++ ) for ( let i = 0; i < Math.round( per * length / 10 ); i ++ ) {

			const c = rng.pick( colors );
			const x = ( i + 0.5 ) * length / Math.round( per * length / 10 ) + rng.range( - 0.15, 0.15 );
			const y = 0.5 * ( r + 1 ) + 0.3, z = - r * 0.9;
			( bodies[ c ] ||= [] ).push( place( tier === 1 ? new THREE.BoxGeometry( 0.35, 0.55, 0.3 ) : new THREE.CapsuleGeometry( 0.17, 0.25, 2, 8 ), { p: [ x, y, z ] } ) );
			if ( tier >= 2 ) heads.push( place( new THREE.SphereGeometry( 0.13, 10, 8 ), { p: [ x, y + 0.42, z ] } ) );

		}

		for ( const [ c, g ] of Object.entries( bodies ) ) root.add( mesh( merge( g ), { part: 'characters', color: c, castShadow: false } ) );
		if ( heads.length ) root.add( mesh( merge( heads ), { part: 'characters', color: '#f1c27d', castShadow: false } ) );

	}

	if ( tier >= 2 ) {

		const roofG = [ place( new THREE.BoxGeometry( length + 0.4, 0.15, rows * 0.9 + 0.6 ), { p: [ length / 2, rows * 0.5 + 2.6, - ( rows - 1 ) * 0.45 ] } ) ];
		for ( const x of [ 0, length ] ) roofG.push( place( new THREE.CylinderGeometry( 0.08, 0.08, rows * 0.5 + 2.6, 10 ), { p: [ x, ( rows * 0.5 + 2.6 ) / 2, - ( rows - 1 ) * 0.9 ] } ) );
		root.add( mesh( merge( roofG ), { part: A, color: '#d9dde3' } ) );

	}

	return root;

}

/** A ridge tent along x. */
export function tent( tier, { color = '#e67e22', length = 2.4, width = 2, height = 1.5 } = {} ) {

	const root = group( 'tent' );
	const shape = new THREE.Shape( [ new THREE.Vector2( - width / 2, 0 ), new THREE.Vector2( width / 2, 0 ), new THREE.Vector2( 0, height ) ] );
	const g = new THREE.ExtrudeGeometry( shape, { depth: length, bevelEnabled: tier >= 2, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 } );
	g.translate( 0, 0, - length / 2 );
	g.rotateY( Math.PI / 2 );
	root.add( mesh( faceted( g ), { part: P, color } ) );

	if ( tier >= 1 ) {

		const door = new THREE.Shape( [ new THREE.Vector2( - 0.4, 0 ), new THREE.Vector2( 0.4, 0 ), new THREE.Vector2( 0, height * 0.75 ) ] );
		const dg = new THREE.ShapeGeometry( door );
		dg.rotateY( Math.PI / 2 );
		dg.translate( length / 2 + 0.02, 0.01, 0 );
		root.add( mesh( dg, { part: P, color: '#3b2a1e', doubleSided: true, castShadow: false } ) );

	}

	if ( tier >= 2 ) {

		const ropes = [];
		for ( const sx of [ - 1, 1 ] ) for ( const sz of [ - 1, 1 ] ) {

			const a = new THREE.Vector3( sx * ( length / 2 ), height * 0.9, 0 ), b = new THREE.Vector3( sx * ( length / 2 + 0.8 ), 0, sz * ( width / 2 + 0.6 ) );
			ropes.push( new THREE.TubeGeometry( new THREE.LineCurve3( a, b ), 1, 0.012, 4 ) );

		}

		root.add( mesh( merge( ropes ), { part: P, color: '#d8c7a3', castShadow: false } ) );

	}

	return root;

}
