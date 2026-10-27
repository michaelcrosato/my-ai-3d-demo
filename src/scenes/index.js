// Scene library (design §6.1). M1 ships the reference stage and Harbor Isle.

import lookdev from './lookdev.js';
import harbor from './harbor.js';
import { TIERS, countTriangles } from './kit/core.js';

export { TIERS, countTriangles };

export const SCENES = [ harbor, lookdev ];
export const sceneById = new Map( SCENES.map( ( s ) => [ s.id, s ] ) );

/**
 * Builds a scene at a tier. Returns the root, one animate(t) that drives every
 * userData.animate in the tree, and the triangle count.
 */
export function buildScene( scene, { tier = 0, seed } = {} ) {

	const { root } = scene.build( { tier, seed } );
	const animators = [];
	root.traverse( ( o ) => { if ( o.userData.animate ) animators.push( o.userData.animate ); } );

	return {
		root,
		triangles: countTriangles( root ),
		animate: ( t ) => { for ( const a of animators ) a( t ); },
	};

}
