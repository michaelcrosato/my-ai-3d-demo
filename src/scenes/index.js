// Scene library (design §6.1): the reference stage, Harbor Isle, the P1 set and the toybox.

import lookdev from './lookdev.js';
import harbor from './harbor.js';
import garden from './garden.js';
import plaza from './plaza.js';
import dungeon from './dungeon.js';
import kart from './kart.js';
import platforms from './platforms.js';
import hangar from './hangar.js';
import meadow from './meadow.js';
import campsite from './campsite.js';
import toybox from './toybox.js';
import { TIERS, countTriangles } from './kit/core.js';

export { TIERS, countTriangles };

const countMeshes = ( root ) => { let n = 0; root.traverse( ( o ) => { if ( o.isMesh ) n ++; } ); return n; };

export const SCENES = [ harbor, lookdev, garden, plaza, dungeon, kart, platforms, hangar, meadow, campsite, toybox ];

/** Density multipliers for props (§6.2). */
export const DENSITY = { min: 0.5, max: 4, default: 1 };
export const sceneById = new Map( SCENES.map( ( s ) => [ s.id, s ] ) );

/**
 * Builds a scene at a tier and prop density. Returns the root, one animate(t) that
 * drives every userData.animate in the tree, the triangle count and the mesh count.
 */
export function buildScene( scene, { tier = 0, seed, density = 1 } = {} ) {

	const { root } = scene.build( { tier, seed, density } );
	const animators = [];
	root.traverse( ( o ) => { if ( o.userData.animate ) animators.push( o.userData.animate ); } );

	return {
		root,
		triangles: countTriangles( root ),
		objects: countMeshes( root ),
		animate: ( t ) => { for ( const a of animators ) a( t ); },
	};

}
