// Graffiti Plaza (design §6.1), inspired by Jet Set Radio / Jet Grind Radio and Bomb
// Rush Cyberfunk: a hard-surface city square with saturated paint, rails, ramps and
// procedural graffiti, under a low, wide chase camera.

import { THREE, createRng, count, at, group, mesh, place, merge, building, stairs, ramp, rail, lampPost, bench, trashCan, skater, character } from './kit/index.js';

/** Procedural graffiti: overlapping blobs, stars and stripes on a thin panel (no letters or logos). */
function graffiti( tier, rng, { w = 4, h = 2.4, colors } ) {

	const root = group( 'graffiti' );
	const byColor = {};
	const n = [ 3, 6, 10, 16 ][ tier ];

	for ( let i = 0; i < n; i ++ ) {

		const c = rng.pick( colors );
		const kind = rng.pick( [ 'blob', 'blob', 'star', 'stripe' ] );
		const s = rng.range( 0.25, 0.7 ) * h * 0.5;
		let g;
		if ( kind === 'blob' ) g = new THREE.CircleGeometry( s, tier >= 2 ? 24 : 8 );
		else if ( kind === 'star' ) {

			const pts = [];
			for ( let k = 0; k < 10; k ++ ) { const a = k / 10 * Math.PI * 2; const r = k % 2 ? s * 0.45 : s; pts.push( new THREE.Vector2( Math.cos( a ) * r, Math.sin( a ) * r ) ); }
			g = new THREE.ShapeGeometry( new THREE.Shape( pts ) );

		} else g = new THREE.PlaneGeometry( s * 3, s * 0.35 );
		( byColor[ c ] ||= [] ).push( place( g, { p: [ rng.range( - w / 2 + s, w / 2 - s ), rng.range( s * 0.6, h - s * 0.6 ), 0.01 + i * 0.002 ], r: [ 0, 0, rng.range( - 0.5, 0.5 ) ] } ) );

	}

	for ( const [ c, g ] of Object.entries( byColor ) ) root.add( mesh( merge( g ), { part: 'props', color: c, castShadow: false } ) );
	return root;

}

const PAINT = [ '#ff2e88', '#00c8ff', '#ffe600', '#7cff3a', '#ff7a1a', '#a06cd5' ];

export default {
	id: 'plaza',
	name: 'Graffiti Plaza',
	inspiredBy: [ 'Jet Set Radio / Jet Grind Radio', 'Bomb Rush Cyberfunk' ],
	genre: 'skate / action',
	notes: 'Thick lines on hard surfaces and saturated paint: does ink make the city graphic, or just noisy? Rails and ramps are thin and long, so watch them break up at distance.',
	shots: {
		hero: { label: 'Low chase (wide lens)', pos: [ 9, 2.6, 15 ], target: [ - 1, 2.2, 0 ], fov: 72 },
		gameplay: { label: 'Gameplay (chase)', pos: [ 0.5, 2.2, 13 ], target: [ 0, 1.6, 2 ], fov: 80 },
		wide: { label: 'Wide', pos: [ 26, 19, 30 ], target: [ 0, 2, - 2 ], fov: 45 },
		close: { label: 'Close-up (skater)', pos: [ 4.6, 1.6, 7.6 ], target: [ 3, 1.2, 4.4 ], fov: 38 },
	},
	defaultShot: 'hero',
	focus: [ 3, 1.2, 4.4 ],
	shadow: { center: [ 0, 0, 0 ], radius: 22 },
	far: 500,
	params: {
		'lighting.key.elevation': 62, 'lighting.key.azimuth': 40, 'lighting.key.color': '#ffffff', 'lighting.key.intensity': 3.2,
		'lighting.ambient.sky': '#bfe3ff', 'lighting.ambient.ground': '#9aa0aa', 'lighting.ambient.intensity': 0.8,
		'atmosphere.sky.zenith': '#1e9bff', 'atmosphere.sky.horizon': '#bfefff', 'atmosphere.sky.ground': '#bfefff',
		'atmosphere.fog.color': '#bfefff',
	},

	build( { tier = 0, seed = 33, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'plaza' );

		root.add( mesh( new THREE.PlaneGeometry( 70, 70 ).rotateX( - Math.PI / 2 ), { part: 'terrain', color: '#b9bcc4', castShadow: false } ) );
		// Painted ground shapes (big and few, so ink outlines them instead of drawing noise).
		const paint = [ [ 'circle', 4.2, [ 3, 0.01, 3 ], '#ff2e88' ], [ 'box', [ 12, 3.2 ], [ - 4, 0.012, 9 ], '#00c8ff' ], [ 'circle', 2.6, [ 12, 0.011, - 2 ], '#ffe600' ] ];
		for ( const [ kind, size, p, color ] of paint.slice( 0, tier === 0 ? 1 : 3 ) ) {

			const g = kind === 'circle' ? new THREE.RingGeometry( size * 0.8, size, tier >= 2 ? 64 : 16 ) : new THREE.PlaneGeometry( size[ 0 ], size[ 1 ] );
			g.rotateX( - Math.PI / 2 );
			root.add( at( mesh( g, { part: 'terrain', color, castShadow: false } ), p ) );

		}

		const platform = mesh( new THREE.BoxGeometry( 10, 1.2, 6 ), { part: 'architecture', color: '#8e939e' } );
		platform.position.set( - 8, 0.6, - 5 );
		root.add( platform );
		root.add( at( stairs( tier, { steps: 4, width: 4, rise: 0.3, run: 0.5 } ), [ - 8, 0, - 0.2 ], [ 0, Math.PI, 0 ] ) );

		const bRng = rng.fork();
		const blocks = [
			[ - 14, - 16, 10, 8, 14, '#ff6b6b' ], [ - 2, - 18, 9, 7, 18, '#4ecdc4' ], [ 10, - 16, 10, 8, 12, '#ffe66d' ],
			[ 20, - 4, 8, 10, 16, '#a06cd5' ], [ - 22, - 2, 8, 10, 11, '#ff9f1c' ], [ 20, 12, 8, 8, 9, '#2ec4b6' ],
		];
		for ( const [ x, z, w, d, h, color ] of blocks ) {

			const b = at( building( tier, bRng.fork(), { w, d, h, color } ), [ x, 0, z ], [ 0, Math.abs( x ) > 18 ? - Math.sign( x ) * Math.PI / 2 : 0, 0 ] );
			root.add( b );

		}

		// Graffiti on the walls facing the plaza.
		const gRng = rng.fork();
		for ( const [ x, z, r ] of [ [ - 14, - 11.9, 0 ], [ - 2, - 14.4, 0 ], [ 10, - 11.9, 0 ], [ 14.9, - 4, - Math.PI / 2 ], [ - 16.9, - 2, Math.PI / 2 ] ].slice( 0, count( 3, density ) + 2 ) ) {

			root.add( at( graffiti( tier, gRng.fork(), { w: 6, h: 3, colors: PAINT } ), [ x, 0.4, z ], [ 0, r, 0 ] ) );

		}

		root.add( at( ramp( tier, { width: 5, height: 1.8 } ), [ 6, 0, - 4 ] ) );
		root.add( at( rail( tier, 8, { color: '#ffe600' } ), [ - 3, 0, 5 ] ) );
		root.add( at( rail( tier, 6, { color: '#ff2e88', height: 0.9 } ), [ - 12, 1.2, - 2.2 ] ) );

		for ( const [ x, z ] of [ [ - 12, 8 ], [ 12, 8 ], [ - 4, - 10 ], [ 14, - 9 ] ].slice( 0, count( 3, density ) ) ) root.add( at( lampPost( tier, { light: false } ), [ x, 0, z ] ) );
		for ( const [ x, z, r ] of [ [ 2, 9, 0 ], [ - 9, 9, 0.3 ], [ 9, 2, - 1.2 ] ].slice( 0, count( 2, density ) ) ) root.add( at( bench( tier, { color: '#00c8ff' } ), [ x, 0, z ], [ 0, r, 0 ] ) );
		for ( const [ x, z ] of [ [ 4, 10.5 ], [ - 15, 5 ], [ 16, 6 ] ].slice( 0, count( 2, density ) ) ) root.add( at( trashCan( tier, { color: '#ff7a1a' } ), [ x, 0, z ] ) );

		// Billboard on poles.
		const board = group( 'billboard' );
		board.add( mesh( merge( [ place( new THREE.BoxGeometry( 0.25, 6, 0.25 ), { p: [ - 2.5, 3, 0 ] } ), place( new THREE.BoxGeometry( 0.25, 6, 0.25 ), { p: [ 2.5, 3, 0 ] } ) ] ), { part: 'architecture', color: '#3a3f4a' } ) );
		const panel = mesh( new THREE.BoxGeometry( 7, 3, 0.2 ), { part: 'props', color: '#ffe600' } );
		panel.position.y = 6.5;
		board.add( panel );
		board.add( at( graffiti( tier, gRng.fork(), { w: 6.6, h: 2.6, colors: [ '#ff2e88', '#00c8ff', '#0b0b0f' ] } ), [ 0, 5.2, 0.11 ] ) );
		root.add( at( board, [ - 16, 0, 12 ], [ 0, 0.7, 0 ] ) );

		// The hero skates a figure-eight; two friends hang out on the platform.
		const sk = skater( tier, { part: 'hero', seed: 2 } );
		const idle = sk.userData.animate;
		sk.userData.animate = ( t ) => {

			idle( t );
			const a = t * 0.45;
			sk.position.set( 2 + Math.sin( a ) * 4, 0, 3 + Math.sin( a * 2 ) * 2 );
			sk.rotation.y = Math.atan2( Math.cos( a ) * 4, Math.cos( a * 2 ) * 4 );

		};

		root.add( sk );
		root.add( at( skater( tier, { part: 'characters', shirt: '#00c8ff', cap: '#ff2e88', seed: 5 } ), [ - 9, 1.2, - 4 ], [ 0, 0.6, 0 ] ) );
		root.add( at( character( tier, { part: 'characters', shirt: '#7cff3a', pants: '#2b2f3a', seed: 7 } ), [ - 6.5, 1.2, - 5.5 ], [ 0, - 0.8, 0 ] ) );
		return { root };

	},
};
