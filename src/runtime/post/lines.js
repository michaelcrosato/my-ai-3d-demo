// Screen-space ink lines (design §7.9). Reads linear depth, view normals and part/object
// ids at 8 offsets (4 opposite pairs) around each pixel. The offset radius is the line thickness at
// 1080p scaled by the output height, so lines look the same on every screen.
//
// Depth and id edges are drawn only on the nearer side of a boundary, so ink
// belongs to the object in front, as an illustrator would draw it.

import { Fn, vec2, vec3, float, screenUV, screenSize, max, mix, smoothstep, step, abs, colorToDirection, perspectiveDepthToViewZ } from 'three/tsl';
import { fogFactor } from '../atmosphere/atmosphere.js';

// Opposite pairs: the Laplacian of inverse depth is zero on any plane, so grazing
// surfaces (the sea toward the horizon) don't fire, while silhouettes do.
const PAIRS = [ [ 1, 0 ], [ 0, 1 ], [ 0.7071, 0.7071 ], [ 0.7071, - 0.7071 ] ];

/**
 * @param {Node} color - display-referred image to ink over
 * @param {object} b - { depth, normal, ids } texture nodes from the scene pass
 * @param {object} u - line uniforms: thickness, color, silhouette, crease, creaseThreshold, depthThreshold, idWeight, followFog, near, far
 * @param {object} atmos - atmosphere uniforms (fog)
 */
export function screenLines( color, b, u, atmos ) {

	return Fn( () => {

		const uv = screenUV;
		const px = vec2( 1 ).div( screenSize );
		const radius = max( u.thickness.mul( screenSize.y.div( 1080 ) ), 0.0 );

		const dist = ( d ) => perspectiveDepthToViewZ( d, u.near, u.far ).negate();
		const d0 = dist( b.depth.sample( uv ).r ).toVar();
		const n0 = colorToDirection( b.normal.sample( uv ).rgb ).toVar();
		const id0 = b.ids.sample( uv ).rg.toVar();

		const depthEdge = float( 0 ).toVar();
		const normalEdge = float( 0 ).toVar();
		const idEdge = float( 0 ).toVar();

		const w0 = d0.reciprocal();

		for ( const [ x, y ] of PAIRS ) {

			const o = vec2( x, y ).mul( px ).mul( radius );
			const samples = [ uv.add( o ), uv.sub( o ) ];
			const da = dist( b.depth.sample( samples[ 0 ] ).r ), db = dist( b.depth.sample( samples[ 1 ] ).r );

			// Negative on the near side of a silhouette (one neighbor much farther away).
			const lap = da.reciprocal().add( db.reciprocal() ).sub( w0.mul( 2 ) ).div( w0 );
			depthEdge.assign( max( depthEdge, lap.negate() ) );

			for ( const [ k, s ] of samples.entries() ) {

				const n = colorToDirection( b.normal.sample( k === 0 ? uv.add( o.mul( 0.5 ) ) : uv.sub( o.mul( 0.5 ) ) ).rgb );
				normalEdge.assign( max( normalEdge, n.dot( n0 ).oneMinus() ) );
				const id = b.ids.sample( s ).rg;
				const differs = step( 0.5 / 255, abs( id.x.sub( id0.x ) ).add( abs( id.y.sub( id0.y ) ) ) );
				const notCloser = step( d0.mul( 0.999 ), k === 0 ? da : db );
				idEdge.assign( max( idEdge, differs.mul( notCloser ) ) );

			}

		}

		// Grazing surfaces (a wavy sea toward the horizon) hide small real occlusions; raise
		// the threshold there so only clear silhouettes get ink.
		const th = u.depthThreshold.div( abs( n0.z ).clamp( 0.25, 1 ) );
		const silhouette = smoothstep( th.mul( 0.5 ), th, depthEdge ).mul( u.silhouette );
		const crease = smoothstep( u.creaseThreshold.mul( 0.8 ), u.creaseThreshold.mul( 1.25 ), normalEdge ).mul( u.crease );
		const edge = max( silhouette, max( crease, idEdge.mul( u.idWeight ) ) ).mul( step( 0.01, radius ) );

		// Ink recedes into the atmosphere like everything else.
		const fade = fogFactor( atmos, d0 ).mul( u.followFog ).oneMinus();
		return vec3( mix( color.rgb, u.color, edge.clamp().mul( fade ) ) );

	} )();

}
