// Architecture: house, lighthouse, dock. Each tier adds the features of §6.2:
// T1 secondary shapes and facets, T2 bevels and trims, T3 instanced-style micro detail (merged).

import { THREE, byTier, faceted, mesh, merge, place, group } from './core.js';
import { box, cylinder } from './shapes.js';

const A = 'architecture';

/** Triangular prism roof along x, ridge at height h. */
function gableRoof( w, d, h, overhang ) {

	const shape = new THREE.Shape();
	shape.moveTo( - d / 2 - overhang, 0 );
	shape.lineTo( 0, h );
	shape.lineTo( d / 2 + overhang, 0 );
	shape.lineTo( - d / 2 - overhang, 0 );
	const g = new THREE.ExtrudeGeometry( shape, { depth: w + overhang * 2, bevelEnabled: false } );
	g.translate( 0, 0, - ( w + overhang * 2 ) / 2 );
	g.rotateY( Math.PI / 2 );
	return g;

}

/**
 * @param {number} tier
 * @param {object} c - colors { wall, roof, trim, door }
 */
export function house( tier, c, { w = 3, d = 2.6, h = 2.2 } = {} ) {

	const root = group( 'house' );
	const walls = box( tier, [ w, h, d ], { part: A, color: c.wall }, { bevel: 0.03 } );
	walls.position.y = h / 2;
	root.add( walls );

	if ( tier === 0 ) {

		const roof = mesh( new THREE.ConeGeometry( Math.hypot( w, d ) / 2, 1.3, 4 ), { part: A, color: c.roof } );
		roof.position.y = h + 0.65;
		roof.rotation.y = Math.PI / 4;
		root.add( roof );
		return root;

	}

	const roofH = 1.3, over = byTier( tier, [ 0, 0.25, 0.3, 0.3 ] );
	const roof = mesh( faceted( gableRoof( w, d, roofH, over ) ), { part: A, color: c.roof } );
	roof.position.y = h;
	root.add( roof );

	const door = box( tier, [ 0.7, 1.3, 0.1 ], { part: A, color: c.door } );
	door.position.set( 0, 0.65, d / 2 + 0.03 );
	root.add( door );

	const windows = [];
	const frames = [];

	for ( const x of [ - w / 3.2, w / 3.2 ] ) {

		windows.push( place( new THREE.BoxGeometry( 0.5, 0.5, 0.05 ), { p: [ x, h * 0.6, d / 2 + 0.02 ] } ) );
		frames.push( place( new THREE.BoxGeometry( 0.66, 0.08, 0.1 ), { p: [ x, h * 0.6 - 0.3, d / 2 + 0.04 ] } ) );
		if ( tier >= 2 ) frames.push( place( new THREE.BoxGeometry( 0.66, 0.06, 0.08 ), { p: [ x, h * 0.6 + 0.3, d / 2 + 0.04 ] } ) );

	}

	root.add( mesh( merge( windows ), { part: A, color: '#2b3a55', roughness: 0.3 } ) );
	root.add( mesh( merge( frames ), { part: A, color: c.trim } ) );

	const chimney = box( tier, [ 0.4, 1, 0.4 ], { part: A, color: '#8f8a85' } );
	chimney.position.set( w / 3, h + 0.9, - d / 5 );
	root.add( chimney );

	if ( tier >= 2 ) {

		// Corner trims and a stone plinth.
		const trims = [];
		for ( const x of [ - w / 2, w / 2 ] ) for ( const z of [ - d / 2, d / 2 ] ) trims.push( place( new THREE.BoxGeometry( 0.12, h, 0.12 ), { p: [ x, h / 2, z ] } ) );
		root.add( mesh( merge( trims ), { part: A, color: c.trim } ) );
		const plinth = box( tier, [ w + 0.16, 0.25, d + 0.16 ], { part: A, color: '#9b9590' } );
		plinth.position.y = 0.12;
		root.add( plinth );

	}

	if ( tier >= 3 ) {

		// Shingles: rows of small tiles on both roof slopes, merged into one mesh.
		const tiles = [];
		const slope = Math.atan2( roofH, d / 2 + over );
		const len = Math.hypot( roofH, d / 2 + over );
		const rows = 9, cols = Math.round( ( w + over * 2 ) / 0.22 );

		for ( const side of [ - 1, 1 ] ) {

			for ( let r = 0; r < rows; r ++ ) {

				const t = ( r + 0.5 ) / rows;
				const y = h + roofH * ( 1 - t ) + 0.04;
				const z = side * ( d / 2 + over ) * t;

				for ( let k = 0; k < cols; k ++ ) {

					const x = - ( w + over * 2 ) / 2 + ( k + 0.5 + ( r % 2 ) * 0.5 ) * ( w + over * 2 ) / ( cols + 0.5 );
					tiles.push( place( new THREE.BoxGeometry( 0.2, 0.03, len / rows + 0.04 ), { p: [ x, y, z ], r: [ side * slope, 0, 0 ] } ) );

				}

			}

		}

		root.add( mesh( merge( tiles ), { part: A, color: c.roof } ) );

		// Clapboard siding on the side walls.
		const boards = [];
		for ( let y = 0.3; y < h - 0.1; y += 0.18 ) for ( const x of [ - w / 2 - 0.02, w / 2 + 0.02 ] ) boards.push( place( new THREE.BoxGeometry( 0.04, 0.05, d - 0.1 ), { p: [ x, y, 0 ] } ) );
		root.add( mesh( merge( boards ), { part: A, color: c.trim } ) );

		const handle = mesh( new THREE.SphereGeometry( 0.05, 10, 8 ), { part: A, color: '#d4af37', roughness: 0.3 } );
		handle.position.set( 0.22, 0.65, d / 2 + 0.1 );
		root.add( handle );

	}

	return root;

}

export function lighthouse( tier ) {

	const root = group( 'lighthouse' );
	const H = 9;
	const tower = cylinder( tier, 1.5, H, { part: A, color: '#f4f1ea' }, { top: 1.05 } );
	tower.position.y = H / 2;
	root.add( tower );

	if ( tier >= 1 ) {

		const stripes = [];
		for ( const y of [ 2, 5 ] ) stripes.push( place( new THREE.CylinderGeometry( 1.5 - ( y + 0.7 ) / H * 0.45 + 0.03, 1.5 - y / H * 0.45 + 0.03, 1.4, byTier( tier, [ 8, 10, 40, 96 ] ) ), { p: [ 0, y + 0.7, 0 ] } ) );
		root.add( mesh( tier === 1 ? faceted( merge( stripes ) ) : merge( stripes ), { part: A, color: '#c8352e' } ) );

	}

	const lamp = cylinder( tier, 0.75, 1.1, { part: 'vfx', color: '#ffe9a8', emissive: '#ffd76a', emissiveIntensity: 2.5, castShadow: false } );
	lamp.position.y = H + 0.55;
	root.add( lamp );

	const cap = mesh( new THREE.ConeGeometry( 1.05, 1.2, byTier( tier, [ 8, 10, 32, 64 ] ) ), { part: A, color: '#c8352e' } );
	cap.position.y = H + 1.7;
	root.add( cap );

	if ( tier >= 2 ) {

		const gallery = cylinder( tier, 1.4, 0.18, { part: A, color: '#3d3d3d' } );
		gallery.position.y = H + 0.02;
		root.add( gallery );
		const bars = [];
		const n = tier === 3 ? 36 : 16;
		for ( let i = 0; i < n; i ++ ) {

			const a = i / n * Math.PI * 2;
			bars.push( place( new THREE.CylinderGeometry( 0.025, 0.025, 0.6, 5 ), { p: [ Math.cos( a ) * 1.3, H + 0.4, Math.sin( a ) * 1.3 ] } ) );

		}

		bars.push( place( new THREE.TorusGeometry( 1.3, 0.03, 6, tier === 3 ? 64 : 32 ), { p: [ 0, H + 0.7, 0 ], r: [ Math.PI / 2, 0, 0 ] } ) );
		root.add( mesh( merge( bars ), { part: A, color: '#3d3d3d' } ) );
		const door = box( tier, [ 0.7, 1.4, 0.2 ], { part: A, color: '#4e342e' } );
		door.position.set( 0, 0.7, 1.45 );
		root.add( door );

	}

	return root;

}

/** A wooden dock along +z from `start`, `length` long. Returns the group and post positions. */
export function dock( tier, { length = 14, width = 2.6 } = {} ) {

	const root = group( 'dock' );
	const wood = '#9c6b3f', post = '#6d4a2d';
	const posts = [];
	for ( let z = 1; z <= length; z += length / byTier( tier, [ 3, 4, 5, 7 ] ) ) for ( const x of [ - width / 2, width / 2 ] ) posts.push( [ x, z ] );

	if ( tier === 0 ) {

		const deck = mesh( new THREE.BoxGeometry( width, 0.25, length ), { part: A, color: wood } );
		deck.position.set( 0, 1, length / 2 );
		root.add( deck );

	} else {

		const planks = [];
		const n = byTier( tier, [ 1, 10, 28, 56 ] );
		for ( let i = 0; i < n; i ++ ) {

			const z = ( i + 0.5 ) * length / n;
			const tilt = tier === 3 ? ( ( i * 7919 ) % 13 - 6 ) * 0.002 : 0;
			planks.push( place( new THREE.BoxGeometry( width + 0.2, 0.1, length / n * 0.88 ), { p: [ 0, 1.05, z ], r: [ tilt, 0, tilt ] } ) );

		}

		root.add( mesh( merge( planks ), { part: A, color: wood } ) );
		const beams = [ - width / 2 + 0.2, width / 2 - 0.2 ].map( ( x ) => place( new THREE.BoxGeometry( 0.2, 0.2, length ), { p: [ x, 0.9, length / 2 ] } ) );
		root.add( mesh( merge( beams ), { part: A, color: post } ) );

	}

	const segs = byTier( tier, [ 6, 7, 16, 32 ] );
	const postGeoms = posts.map( ( [ x, z ] ) => place( new THREE.CylinderGeometry( 0.16, 0.18, 2.6, segs ), { p: [ x, 0.3, z ] } ) );
	if ( tier >= 3 ) for ( const [ x, z ] of posts ) postGeoms.push( place( new THREE.TorusGeometry( 0.2, 0.05, 8, 24 ), { p: [ x, 1.3, z ], r: [ Math.PI / 2, 0, 0 ] } ) );
	root.add( mesh( tier === 1 ? faceted( merge( postGeoms ) ) : merge( postGeoms ), { part: A, color: post } ) );

	return { root, posts };

}
