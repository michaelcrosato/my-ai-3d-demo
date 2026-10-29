// DISPLAY stage (design §7.7): afterimage trails → posterize / palette quantize + dither
// → chromatic aberration · lens distortion → speed lines → vignette → grain → letterbox
// → VHS → CRT. Quantizing happens in display space, so steps are perceptually even; grain
// comes last of the image effects, so nothing smears it; the tape and the CRT simulate
// the medium and the screen themselves.

import * as THREE from 'three/webgpu';
import { Fn, vec2, vec3, vec4, float, int, ivec2, mix, max, abs, step, smoothstep, sin, cos, dot, fract, floor, length, atan, select, luminance, textureLoad, interleavedGradientNoise, uniform, uniformArray, screenUV, screenSize, screenCoordinate, uv, nodeObject, convertToTexture, If, Loop } from 'three/tsl';
import AfterImageNode from 'three/addons/tsl/display/AfterImageNode.js';
import { displayToOklab } from './colorspace.js';
import { PALETTES, bayerMatrix } from '../color/lut.js';
import { hexToRgb, hexToOklab } from '../color/color.js';

export const MAX_PALETTE = 16;

/**
 * Afterimage trails: three's AfterImageNode keeps the brightest of the new frame and the
 * faded old one, so only bright things trail. Trails here blend toward the history, so
 * dark objects on a light background leave trails too.
 */
class TrailsNode extends AfterImageNode {

	constructor( textureNode, damp ) {

		super( textureNode, damp );
		// 1 on the first frame and after a resize: the history is empty, so start from the frame.
		this.reset = uniform( 1 );

	}

	updateBefore( frame ) {

		frame.renderer.getDrawingBufferSize( _size );
		this.reset.value = this._compRT.width !== _size.x || this._compRT.height !== _size.y ? 1 : 0;
		super.updateBefore( frame );

	}

	setup( builder ) {

		const current = this.textureNode, old = this._textureNodeOld;
		old.uvNode = current.uvNode || uv();
		const material = this._materialComposed || ( this._materialComposed = new THREE.NodeMaterial() );
		material.name = 'Trails';
		material.fragmentNode = Fn( () => mix( current.sample(), old.sample(), this.damp.mul( this.reset.oneMinus() ) ) )();
		builder.getNodeProperties( this ).textureNode = current;
		return this._textureNode;

	}

}

const _size = new THREE.Vector2();

const trails = ( node, damp ) => nodeObject( new TrailsNode( convertToTexture( node ), nodeObject( damp ) ) );

/** A cheap hash in [0, 1). */
const hash = ( x ) => fract( sin( x.mul( 12.9898 ) ).mul( 43758.5453 ) );

/** Four Bayer matrices in one 16×64 R8 texture: rows 0–15 = 16×16, then 8×8, 4×4 and 2×2 tiled. */
function bayerTexture() {

	const data = new Uint8Array( 16 * 64 );
	[ 16, 8, 4, 2 ].forEach( ( n, block ) => {

		const m = bayerMatrix( n );
		for ( let y = 0; y < 16; y ++ ) for ( let x = 0; x < 16; x ++ ) data[ ( block * 16 + y ) * 16 + x ] = Math.round( ( m[ y % n ][ x % n ] + 0.5 ) / ( n * n ) * 255 );

	} );
	const t = new THREE.DataTexture( data, 16, 64, THREE.RedFormat, THREE.UnsignedByteType );
	t.minFilter = t.magFilter = THREE.NearestFilter;
	t.needsUpdate = true;
	return t;

}

let bayer = null;

/** Ordered-dither threshold in [0, 1) at integer grid coordinate `coord`; pattern = enum index. */
export function ditherThreshold( coord, pattern ) {

	bayer ??= bayerTexture();
	const row = float( 3 ).sub( pattern ).clamp( 0, 3 ).mul( 16 );
	const ordered = textureLoad( bayer, ivec2( int( coord.x ).mod( 16 ), int( coord.y ).mod( 16 ).add( int( row ) ) ) ).r;
	return select( pattern.greaterThan( 3.5 ), interleavedGradientNoise( coord ), ordered );

}

/** Uniforms for the quantize palette (display colors and their OKLab), written by applyDisplayLists(). */
export function createDisplayLists() {

	return {
		paletteRgb: uniformArray( Array.from( { length: MAX_PALETTE }, () => new THREE.Vector3() ), 'vec3' ),
		paletteLab: uniformArray( Array.from( { length: MAX_PALETTE }, () => new THREE.Vector3() ), 'vec3' ),
		paletteCount: uniform( 2 ),
	};

}

export function quantizePalette( v ) {

	const id = v[ 'retro.quantize.palette' ];
	const colors = id === 'look' ? v[ 'palette.colors' ] : PALETTES[ id ];
	return ( colors && colors.length >= 2 ? colors : PALETTES.onebit ).slice( 0, MAX_PALETTE );

}

export function applyDisplayLists( L, v ) {

	const colors = quantizePalette( v );
	colors.forEach( ( hex, i ) => { L.paletteRgb.array[ i ].set( ...hexToRgb( hex ) ); L.paletteLab.array[ i ].set( ...hexToOklab( hex ) ); } );
	L.paletteCount.value = colors.length;

}

export const DISPLAY = [
	{
		id: 'lens.afterimage', label: 'Afterimage trails', stage: 'display',
		enabled: ( v ) => v[ 'lens.afterimage.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Frame feedback: each frame blends toward the history by the damping.
			return ctx.own( trails( vec4( c, 1 ), ctx.P.get( 'lens.afterimage.damping' ) ) ).getTextureNode().sample( ctx.uv ).rgb;

		},
	},
	{
		id: 'retro.quantize', label: 'Color depth and dithering', stage: 'display',
		enabled: ( v ) => v[ 'retro.quantize.mode' ] !== 'off',
		requires: () => [],
		key: ( v ) => v[ 'retro.quantize.mode' ],
		build( c, ctx ) {

			const P = ctx.P, L = ctx.lists;
			const d = ditherThreshold( ctx.coord, P.get( 'retro.dither.pattern' ) ).sub( 0.5 ).mul( P.get( 'retro.dither.amount' ) );

			if ( ctx.v[ 'retro.quantize.mode' ] === 'posterize' ) {

				const n = P.get( 'retro.quantize.levels' ).sub( 1 );
				return floor( c.clamp( 0, 1 ).mul( n ).add( 0.5 ).add( d ) ).div( n ).clamp( 0, 1 );

			}

			// Palette: dither in proportion to the palette's spacing, then the nearest color in OKLab.
			return Fn( () => {

				const spread = float( 1 ).div( float( L.paletteCount ).sqrt() );
				const lab = displayToOklab( c.add( d.mul( spread ) ) ).toVar();
				const best = vec3( 0 ).toVar(), bestD = float( 1e9 ).toVar();

				Loop( { start: int( 0 ), end: int( L.paletteCount ), type: 'int', condition: '<' }, ( { i } ) => {

					const delta = lab.sub( L.paletteLab.element( i ) );
					const dd = dot( delta, delta );
					If( dd.lessThan( bestD ), () => { bestD.assign( dd ); best.assign( L.paletteRgb.element( i ) ); } );

				} );

				return best;

			} )();

		},
	},
	{
		id: 'lens.ca', label: 'Chromatic aberration', stage: 'display', neighborhood: true,
		enabled: ( v ) => v[ 'lens.ca.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Red and blue split radially; up to ~6 px at 1080p in the corners at amount 1.
			const tex = ctx.texture( c );
			const p = screenUV.sub( 0.5 );
			const o = p.mul( length( p ).mul( 2 ) ).mul( ctx.P.get( 'lens.ca.amount' ).mul( 0.012 ) );
			return vec3( tex.sample( screenUV.add( o ) ).r, tex.sample( screenUV ).g, tex.sample( screenUV.sub( o ) ).b );

		},
	},
	{
		id: 'lens.distortion', label: 'Lens distortion', stage: 'display', neighborhood: true,
		enabled: ( v ) => v[ 'lens.distortion.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const tex = ctx.texture( c );
			const k = ctx.P.get( 'lens.distortion.amount' ).mul( 1.6 );
			const aspect = screenSize.x.div( screenSize.y );
			const p = screenUV.sub( 0.5 ).mul( vec2( aspect, 1 ) );
			const r2 = dot( p, p );
			// Zoom in for barrel distortion so the corners stay filled.
			const corner = aspect.mul( aspect ).add( 1 ).mul( 0.25 );
			const zoom = float( 1 ).div( float( 1 ).add( max( k, 0 ).mul( corner ) ) );
			const q = p.mul( r2.mul( k ).add( 1 ) ).mul( zoom ).div( vec2( aspect, 1 ) ).add( 0.5 );
			return tex.sample( q.clamp( 0, 1 ) ).rgb;

		},
	},
	{
		id: 'motion.speedLines', label: 'Speed lines', stage: 'display',
		enabled: ( v ) => v[ 'motion.speedLines.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Wedges in angular cells around the center; each cell's width, reach and whether
			// it is drawn change 12 times a second, like redrawn animation frames.
			const P = ctx.P;
			const N = 140;
			const aspect = screenSize.x.div( screenSize.y );
			const p = ctx.uv.sub( vec2( P.get( 'motion.speedLines.centerX' ), P.get( 'motion.speedLines.centerY' ) ) ).mul( vec2( aspect, 1 ) );
			const r = length( p ).div( length( vec2( aspect, 1 ) ).mul( 0.5 ) );
			const a = atan( p.y, p.x ).div( Math.PI * 2 ).add( 0.5 ).mul( N );
			const cell = floor( a ), f = fract( a );
			const frame = floor( ctx.U.time.mul( 12 ) );
			const h1 = hash( cell.add( frame.mul( 17.31 ) ) ), h2 = hash( cell.mul( 3.17 ).add( frame.mul( 5.7 ) ).add( 1.3 ) ), h3 = hash( cell.mul( 7.9 ).add( frame ).add( 4.1 ) );
			const amount = P.get( 'motion.speedLines.amount' );
			const on = step( amount.oneMinus(), h1 );
			const width = h2.mul( 0.35 ).add( 0.08 );
			const wedge = smoothstep( width, width.mul( 0.4 ), abs( f.sub( 0.5 ) ) );
			const start = P.get( 'motion.speedLines.clear' ).add( h3.mul( 0.5 ).mul( amount.oneMinus().add( 0.3 ) ) );
			const reach = smoothstep( start, start.add( 0.18 ), r );
			return mix( c, P.get( 'motion.speedLines.color' ), wedge.mul( on ).mul( reach ) );

		},
	},
	{
		id: 'lens.vignette', label: 'Vignette', stage: 'display', always: true,
		enabled: () => true,
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const aspect = screenSize.x.div( screenSize.y );
			const sx = mix( 1, aspect, P.get( 'lens.vignette.roundness' ) );
			const p = ctx.uv.sub( 0.5 ).mul( 2 ).mul( vec2( sx, 1 ) );
			const r = length( p ).div( length( vec2( sx, 1 ) ) );
			const softness = P.get( 'lens.vignette.softness' );
			const v = smoothstep( softness.oneMinus(), softness.mul( 0.2 ).add( 1 ), r ).mul( P.get( 'lens.vignette.amount' ) );
			return mix( c, P.get( 'lens.vignette.color' ), v );

		},
	},
	{
		id: 'media.grain', label: 'Film grain', stage: 'display', always: true,
		enabled: () => true,
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const cell = floor( ctx.coord.div( P.get( 'media.grain.size' ).mul( ctx.gridSize.y.div( 1080 ) ).max( 1 ) ) );
			const seed = floor( ctx.U.time.mul( 24 ) ).mul( P.get( 'media.grain.animated' ) );
			const n = fract( sin( dot( cell.add( vec2( seed.mul( 17.13 ), seed.mul( 41.7 ) ) ), vec2( 12.9898, 78.233 ) ) ).mul( 43758.5453 ) ).sub( 0.5 );
			const response = luminance( c ).sub( 0.5 ).mul( 2 ).pow( 2 ).mul( 0.6 ).oneMinus();
			return c.add( n.mul( P.get( 'media.grain.amount' ) ).mul( 2 ).mul( response ) );

		},
	},
	{
		id: 'lens.letterbox', label: 'Letterbox', stage: 'display', always: true,
		enabled: () => true,
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const screen = screenSize.x.div( screenSize.y ), target = P.get( 'lens.letterbox.aspect' );
			const amount = P.get( 'lens.letterbox.amount' );
			const barY = float( 1 ).sub( screen.div( target ) ).max( 0 ).mul( 0.5 ).mul( amount );
			const barX = float( 1 ).sub( target.div( screen ) ).max( 0 ).mul( 0.5 ).mul( amount );
			const uv = ctx.uv;
			const bar = max( max( step( uv.y, barY ), step( barY.oneMinus(), uv.y ) ).mul( step( 1e-4, barY ) ), max( step( uv.x, barX ), step( barX.oneMinus(), uv.x ) ).mul( step( 1e-4, barX ) ) );
			return mix( c, P.get( 'lens.letterbox.color' ), bar );

		},
	},
	{
		id: 'retro.vhs', label: 'VHS', stage: 'display', neighborhood: true,
		enabled: ( v ) => v[ 'retro.vhs.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const tex = ctx.texture( c );

			return Fn( () => {

				// Tracking: rows slip sideways a little everywhere and a lot in a tear near the bottom.
				const t = ctx.U.time;
				const y = screenUV.y;
				const jitter = P.get( 'retro.vhs.jitter' );
				const row = floor( y.mul( 240 ) );
				const wobble = hash( row.add( floor( t.mul( 30 ) ).mul( 7.13 ) ) ).sub( 0.5 ).mul( 0.004 );
				const tearAt = sin( t.mul( 0.7 ) ).mul( 0.03 ).add( 0.9 );
				const tear = smoothstep( 0.05, 0, abs( y.sub( tearAt ) ) ).mul( sin( y.mul( 160 ).add( t.mul( 23 ) ) ).mul( 0.5 ).add( 0.5 ) ).mul( 0.025 );
				const uvT = vec2( ctx.uv.x.add( wobble.add( tear ).mul( jitter ) ), ctx.uv.y );

				// Chroma bleed: brightness stays sharp, color smears to the right over ~10 px at 1080p.
				const base = tex.sample( uvT ).rgb;
				const Y = luminance( base );
				const px = ctx.texel.x.mul( ctx.gridSize.y.div( 1080 ).max( 1 ) ).mul( P.get( 'retro.vhs.bleed' ).mul( 3 ).add( 0.5 ) );
				const smear = base.add( tex.sample( uvT.sub( vec2( px, 0 ) ) ).rgb ).add( tex.sample( uvT.sub( vec2( px.mul( 2 ), 0 ) ) ).rgb ).add( tex.sample( uvT.sub( vec2( px.mul( 3 ), 0 ) ) ).rgb ).mul( 0.25 );
				const chroma = mix( base.sub( Y ), smear.sub( luminance( smear ) ), P.get( 'retro.vhs.bleed' ) );
				const col = vec3( Y ).add( chroma.mul( 0.92 ) ).toVar();

				// Tape noise: snow everywhere, stronger in a band that rolls up the frame.
				const snow = hash( screenCoordinate.x.mul( 0.137 ).add( screenCoordinate.y.mul( 1.731 ) ).add( fract( t.mul( 7.3 ) ).mul( 91.7 ) ) ).sub( 0.5 );
				const band = smoothstep( 0.06, 0, abs( fract( y.add( t.mul( 0.12 ) ) ).sub( 0.5 ) ) );
				col.addAssign( snow.mul( P.get( 'retro.vhs.noise' ) ).mul( band.mul( 0.6 ).add( 0.25 ) ) );
				return col;

			} )();

		},
	},
	{
		id: 'retro.crt', label: 'CRT', stage: 'display', neighborhood: true,
		enabled: ( v ) => v[ 'retro.crt.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const tex = ctx.texture( c );

			return Fn( () => {

				// Curved glass: bulge the image and darken the rounded corners.
				const k = P.get( 'retro.crt.curvature' );
				const p = screenUV.mul( 2 ).sub( 1 ).toVar();
				p.addAssign( p.mul( p.yx.mul( p.yx ) ).mul( k ) );
				const uv = p.mul( 0.5 ).add( 0.5 );
				const edge = smoothstep( 0, 0.012, uv.x ).mul( smoothstep( 0, 0.012, uv.x.oneMinus() ) ).mul( smoothstep( 0, 0.012, uv.y ) ).mul( smoothstep( 0, 0.012, uv.y.oneMinus() ) );

				const px = vec2( 2 ).div( screenSize ).mul( screenSize.y.div( 1080 ) );
				const col = tex.sample( uv ).rgb.toVar();
				const glow = tex.sample( uv.add( vec2( px.x, 0 ) ) ).rgb.add( tex.sample( uv.sub( vec2( px.x, 0 ) ) ).rgb ).add( tex.sample( uv.add( vec2( 0, px.y ) ) ).rgb ).add( tex.sample( uv.sub( vec2( 0, px.y ) ) ).rgb ).mul( 0.25 );
				col.assign( mix( col, max( col, glow ), P.get( 'retro.crt.glow' ) ).add( glow.mul( P.get( 'retro.crt.glow' ) ).mul( 0.2 ) ) );

				// One scanline per pixel row in pixel looks, else every 3 px at 1080p.
				const rows = ctx.pixel ? ctx.gridSize.y : screenSize.y.div( screenSize.y.div( 360 ).max( 2 ) );
				const phase = fract( uv.y.mul( rows ) );
				const scan = float( 1 ).sub( P.get( 'retro.crt.scanlines' ).mul( cos( phase.mul( Math.PI ) ).pow( 2 ) ) );
				const triad = floor( screenCoordinate.x ).mod( 3 );
				const maskRgb = vec3( select( triad.lessThan( 0.5 ), 1.25, 0.8 ), select( triad.lessThan( 0.5 ).or( triad.greaterThan( 1.5 ) ), 0.8, 1.25 ), select( triad.greaterThan( 1.5 ), 1.25, 0.8 ) );
				const mask = mix( vec3( 1 ), maskRgb, P.get( 'retro.crt.mask' ) );
				const flicker = float( 1 ).add( sin( ctx.U.time.mul( 59 ) ).mul( P.get( 'retro.crt.flicker' ) ) );
				const gain = float( 1 ).add( P.get( 'retro.crt.scanlines' ).mul( 0.4 ) );
				return col.mul( scan ).mul( mask ).mul( flicker ).mul( gain ).mul( edge );

			} )();

		},
	},
];

