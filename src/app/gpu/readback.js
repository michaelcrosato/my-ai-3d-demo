// Offscreen rendering and pixel readback, normalized across backends:
// rows are tightly packed (WebGPU pads rows to 256 bytes) and top-down
// (WebGL reads bottom-up).

import { RenderTarget, UnsignedByteType, Vector2 } from 'three/webgpu';

export class Pixels {

	constructor( data, width, height ) {

		this.data = data;
		this.width = width;
		this.height = height;

	}

	at( x, y ) {

		const i = ( Math.min( this.height - 1, Math.max( 0, y | 0 ) ) * this.width + Math.min( this.width - 1, Math.max( 0, x | 0 ) ) ) * 4;
		return [ this.data[ i ], this.data[ i + 1 ], this.data[ i + 2 ], this.data[ i + 3 ] ];

	}

	/** Pixel at normalized coordinates (0..1, origin top-left). */
	atUV( u, v ) {

		return this.at( u * ( this.width - 1 ), v * ( this.height - 1 ) );

	}

}

export const luma = ( p ) => ( 0.2126 * p[ 0 ] + 0.7152 * p[ 1 ] + 0.0722 * p[ 2 ] ) / 255;

function normalize( raw, width, height, bottomUp ) {

	const tight = width * 4;
	const stride = raw.length === width * height * 4 ? tight : Math.ceil( tight / 256 ) * 256;
	const out = new Uint8Array( width * height * 4 );

	for ( let y = 0; y < height; y ++ ) {

		const src = ( bottomUp ? height - 1 - y : y ) * stride;
		out.set( raw.subarray( src, src + tight ), y * tight );

	}

	return out;

}

/** Renders `renderFn` into a fresh RGBA8 target and returns its Pixels. */
export async function renderToPixels( renderer, width, height, renderFn ) {

	const target = new RenderTarget( width, height, { type: UnsignedByteType, depthBuffer: true } );
	const previous = renderer.getRenderTarget();

	try {

		renderer.setRenderTarget( target );
		await renderFn();
		renderer.setRenderTarget( previous );
		const raw = await renderer.readRenderTargetPixelsAsync( target, 0, 0, width, height );
		const bottomUp = renderer.backend.isWebGPUBackend !== true;
		return new Pixels( normalize( new Uint8Array( raw.buffer, raw.byteOffset, raw.byteLength ), width, height, bottomUp ), width, height );

	} finally {

		renderer.setRenderTarget( previous );
		target.dispose();

	}

}

/**
 * Runs `fn` with the renderer temporarily sized to width x height at pixel ratio 1,
 * so pass nodes render 1:1 with the readback target. The canvas CSS size is untouched.
 */
export async function withRendererSize( renderer, width, height, fn ) {

	const size = renderer.getSize( new Vector2() );
	const ratio = renderer.getPixelRatio();

	renderer.setPixelRatio( 1 );
	renderer.setSize( width, height, false );

	try {

		return await fn();

	} finally {

		renderer.setPixelRatio( ratio );
		renderer.setSize( size.x, size.y, false );

	}

}

/**
 * Mean and standard deviation of luma, plus clipped fractions, sampled every `step` pixels.
 * Every pixel by default: sparser sampling aliases with ordered dither patterns (a 1-bit
 * frame read as nearly all ink).
 */
export function pixelStats( pixels, step = 1 ) {

	let n = 0, sum = 0, sum2 = 0, black = 0, white = 0;

	for ( let y = 0; y < pixels.height; y += step ) {

		for ( let x = 0; x < pixels.width; x += step ) {

			const l = luma( pixels.at( x, y ) );
			sum += l; sum2 += l * l; n ++;
			if ( l < 0.01 ) black ++;
			if ( l > 0.99 ) white ++;

		}

	}

	const mean = sum / n;
	return { meanLuma: mean, lumaStd: Math.sqrt( Math.max( 0, sum2 / n - mean * mean ) ), clippedBlack: black / n, clippedWhite: white / n };

}

/**
 * Advances three's node frame, as the renderer's animation loop does each frame. Post nodes
 * (depth of field, bloom, AO…) run their internal passes once per node frame, so renders
 * made outside the loop (captures, the audit) would otherwise reuse the previous render's
 * results: a capture after an audit showed the audit's depth of field, and back-to-back
 * audit frames skipped those passes.
 */
export function stepNodeFrame( renderer ) {

	renderer._nodes?.nodeFrame?.update();

}
