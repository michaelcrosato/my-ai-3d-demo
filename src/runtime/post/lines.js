// Screen-space ink lines (design §7.9). Reads linear depth, view normals and part/object
// ids at 8 offsets (4 opposite pairs) around each pixel. The offset radius is the line thickness at
// 1080p scaled by the output height, so lines look the same on every screen.
//
// Depth and id edges are drawn only on the nearer side of a boundary, so ink
// belongs to the object in front, as an illustrator would draw it.
//
// Styling: thicker in shadow (light-weighted), a hand wobble that can boil at a few
// frames per second, a pencil / brush / ink texture, colored lines (the darkened local
// color), opacity, distance fade, and fog. Thickness and ink color are per part (§6.7):
// the part under the pixel picks them from the part arrays.

import { Fn, vec2, vec3, float, int, round, max, mix, smoothstep, step, abs, floor, select, luminance, saturation, colorToDirection, perspectiveDepthToViewZ, mx_noise_float } from 'three/tsl';
import { fogFactor } from '../atmosphere/atmosphere.js';

// Opposite pairs: the Laplacian of inverse depth is zero on any plane, so grazing
// surfaces (the sea toward the horizon) don't fire, while silhouettes do.
const PAIRS = [ [ 1, 0 ], [ 0, 1 ], [ 0.7071, 0.7071 ], [ 0.7071, - 0.7071 ] ];

/**
 * @param {Node} color - display-referred image to ink over
 * @param {object} b - { depth, normal, ids } texture nodes from the scene pass
 * @param {object} u - line uniforms: partThickness, partColor (arrays by part index), silhouette, crease, creaseThreshold, depthThreshold, idWeight, followFog, near, far
 * @param {object} atmos - atmosphere uniforms (fog)
 * @param {object} grid - { uv, texel: size of one sample step in uv, scale: sample steps per px at 1080p, coord: integer grid coordinate }
 * @param {object} P - registry uniforms (ParamUniforms) for the styling controls
 * @param {Node} time - seconds
 */
export function screenLines( color, b, u, atmos, { uv, texel, scale, coord }, P, time ) {

	return Fn( () => {

		const px = texel;

		// Hand wobble: a smooth noise offset on where the edges are looked up. Boil re-seeds
		// it a few times per second; 0 fps keeps it still.
		const boil = P.get( 'motion.boil.fps' );
		const seed = select( boil.greaterThan( 0.5 ), floor( time.mul( boil ) ), float( 0 ) ).mul( 3.17 );
		const f = P.get( 'lines.screen.wobbleScale' ).mul( 0.025 );
		const wobble = vec2( mx_noise_float( vec3( coord.mul( f ), seed ) ), mx_noise_float( vec3( coord.mul( f ), seed.add( 11.3 ) ) ) )
			.mul( P.get( 'lines.screen.wobble' ) ).mul( px ).mul( scale );
		const at = uv.add( wobble );

		// Light-weighted lines: up to (1 + weight)× thicker where the image is dark.
		const dark = luminance( color.rgb ).oneMinus().clamp( 0, 1 );
		// Brush texture: line width swells and thins along strokes.
		const texture = P.get( 'lines.screen.texture' ), texAmount = P.get( 'lines.screen.textureAmount' );
		const swell = mx_noise_float( vec3( coord.mul( 0.012 ), 4.1 ) ).mul( 0.5 ).add( 0.5 );
		const brush = mix( float( 1 ), swell.mul( swell ).mul( 2.2 ).add( 0.15 ), texAmount.mul( step( 1.5, texture ).mul( step( texture, 2.5 ) ) ) );
		const part = int( round( b.ids.sample( uv ).r.mul( 255 ) ) );
		const radius = max( u.partThickness.element( part ).mul( scale ).mul( dark.mul( P.get( 'lines.screen.lightWeight' ) ).add( 1 ) ).mul( brush ), 0.0 );

		const dist = ( d ) => perspectiveDepthToViewZ( d, u.near, u.far ).negate();
		const d0 = dist( b.depth.sample( at ).r ).toVar();
		const n0 = colorToDirection( b.normal.sample( at ).rgb ).toVar();
		const id0 = b.ids.sample( at ).rg.toVar();

		const depthEdge = float( 0 ).toVar();
		const normalEdge = float( 0 ).toVar();
		const idEdge = float( 0 ).toVar();

		const w0 = d0.reciprocal();

		for ( const [ x, y ] of PAIRS ) {

			const o = vec2( x, y ).mul( px ).mul( radius );
			const samples = [ at.add( o ), at.sub( o ) ];
			const da = dist( b.depth.sample( samples[ 0 ] ).r ), db = dist( b.depth.sample( samples[ 1 ] ).r );

			// Negative on the near side of a silhouette (one neighbor much farther away).
			const lap = da.reciprocal().add( db.reciprocal() ).sub( w0.mul( 2 ) ).div( w0 );
			depthEdge.assign( max( depthEdge, lap.negate() ) );

			for ( const [ k, s ] of samples.entries() ) {

				const n = colorToDirection( b.normal.sample( k === 0 ? at.add( o.mul( 0.5 ) ) : at.sub( o.mul( 0.5 ) ) ).rgb );
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
		let edge = max( silhouette, max( crease, idEdge.mul( u.idWeight ) ) ).mul( step( 0.01, radius ) ).clamp();

		// Pencil grain breaks the line up; ink blots darken and swell it slightly.
		const grain = mx_noise_float( vec3( coord.mul( 0.9 ), 2.3 ) ).mul( 0.5 ).add( 0.5 );
		const blots = mx_noise_float( vec3( coord.mul( 0.05 ), 6.7 ) ).mul( 0.5 ).add( 0.5 );
		const isPencil = step( 0.5, texture ).mul( step( texture, 1.5 ) ), isInk = step( 2.5, texture );
		edge = edge.mul( mix( float( 1 ), grain.mul( 0.8 ).add( 0.2 ), texAmount.mul( isPencil ) ) );
		edge = edge.mul( mix( float( 1 ), blots.mul( 0.5 ).add( 0.75 ), texAmount.mul( isInk ) ) ).clamp();

		// Ink recedes into the atmosphere and thins with distance, like everything else.
		const fog = fogFactor( atmos, d0 ).mul( u.followFog ).oneMinus();
		const fade = smoothstep( P.get( 'lines.screen.fadeStart' ), P.get( 'lines.screen.fadeEnd' ), d0 ).mul( P.get( 'lines.screen.fade' ) ).oneMinus();
		const alpha = edge.mul( fog ).mul( fade ).mul( P.get( 'lines.screen.opacity' ) );

		// Colored lines: a darker, more saturated version of the color under the line.
		const local = saturation( color.rgb.mul( P.get( 'lines.screen.darken' ) ), float( 1.3 ) );
		const ink = mix( u.partColor.element( part ), local, P.get( 'lines.screen.colorFromSurface' ) );
		return vec3( mix( color.rgb, ink, alpha ) );

	} )();

}
