// MEDIUM stage (design §7.7): media effects → ink lines → pixel edges → anti-aliasing.
// Lines come after the media, so a painted look never smears its ink.

import { Fn, vec2, vec3, vec4, float, max, smoothstep, colorToDirection, perspectiveDepthToViewZ } from 'three/tsl';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { screenLines } from './lines.js';

export const MEDIUM = [
	{
		id: 'lines.screen', label: 'Screen-space ink', stage: 'medium',
		enabled: ( v ) => v[ 'lines.screen.enabled' ],
		requires: () => [ 'depth', 'normal', 'ids' ],
		build( c, ctx ) {

			return screenLines( c, { depth: ctx.tex( 'depth' ), normal: ctx.tex( 'normal' ), ids: ctx.tex( 'ids' ) }, ctx.U.lines, ctx.atmos, { uv: ctx.uv, texel: ctx.texel, scale: ctx.lineScale } );

		},
	},
	{
		id: 'retro.pixel', label: 'Pixelation and pixel edges', stage: 'medium',
		enabled: ( v ) => v[ 'retro.pixel.enabled' ],
		requires: () => [ 'depth', 'normal' ],
		build( c, ctx ) {

			// One-texel edge highlights, as in three's pixelation pass: outer depth steps
			// darken, creases facing the viewer lighten. Read on the low-res grid.
			const { U } = ctx;
			const depth = ctx.tex( 'depth' ), normal = ctx.tex( 'normal' );
			const strength = ctx.P.get( 'retro.pixel.edges' );

			return Fn( () => {

				const dist = ( uv ) => perspectiveDepthToViewZ( depth.sample( uv ).r, U.lines.near, U.lines.far ).negate();
				const d0 = dist( ctx.uv ).toVar();
				const n0 = colorToDirection( normal.sample( ctx.uv ).rgb ).toVar();
				const depthEdge = float( 0 ).toVar(), normalEdge = float( 0 ).toVar();

				for ( const [ x, y ] of [ [ 1, 0 ], [ - 1, 0 ], [ 0, 1 ], [ 0, - 1 ] ] ) {

					const uv = ctx.uv.add( vec2( x, y ).mul( ctx.texel ) );
					const d = dist( uv );
					const n = colorToDirection( normal.sample( uv ).rgb );
					depthEdge.assign( max( depthEdge, d.sub( d0 ).div( d0 ).clamp( 0, 1 ) ) );
					// Only creases on the near side and facing up/left light up, so each edge is one texel.
					const facing = smoothstep( - 0.01, 0.01, n0.sub( n ).dot( vec3( - 1, 1, 1 ).normalize() ) );
					const sameSurface = smoothstep( 0, 0.02, d.sub( d0 ).div( d0 ).abs() ).oneMinus();
					normalEdge.assign( max( normalEdge, n0.dot( n ).oneMinus().mul( facing ).mul( sameSurface ) ) );

				}

				const dark = smoothstep( 0.03, 0.06, depthEdge );
				const light = smoothstep( 0.08, 0.15, normalEdge ).mul( dark.oneMinus() );
				return c.mul( float( 1 ).sub( dark.mul( strength ).mul( 0.6 ) ) ).mul( float( 1 ).add( light.mul( strength ).mul( 0.5 ) ) );

			} )();

		},
	},
	{
		id: 'quality.fxaa', label: 'FXAA', stage: 'medium', always: true,
		// The pass renders without MSAA whenever it writes extra buffers; pixel looks stay crisp.
		enabled: ( v, ctx ) => ctx.samples === 0 && ! v[ 'retro.pixel.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			return vec3( ctx.own( fxaa( vec4( c, 1 ) ) ).rgb );

		},
	},
];
