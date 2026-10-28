// grade.cube (design §6.12): the look's grade module baked into a 33³ LUT by running the
// tool's own GRADE stage on the GPU over an identity lattice, so the file matches what you
// see. The lattice is laid out as a (size × size) × size image: x = r + b·size, y = g.

import * as THREE from 'three/webgpu';
import { vec3, vec4, floor, mod, screenCoordinate } from 'three/tsl';
import { GRADE, createGradeLists, applyGradeLists } from '../../runtime/post/stage-grade.js';
import { ParamUniforms } from '../../runtime/post/params.js';

/**
 * Bakes the display-space grade (CDL, contrast, saturation, hue, split tone, selective
 * color, LUT preset, gradient map) for resolved global values. Returns a Float32Array of
 * RGBA in .cube order (red fastest, then green, then blue), 0–1.
 */
export async function bakeGradeLut( renderer, values, size = 33 ) {

	const W = size * size, H = size;
	const P = new ParamUniforms();
	P.apply( values );
	const lists = createGradeLists();
	applyGradeLists( lists, values );

	const x = floor( screenCoordinate.x ), y = floor( screenCoordinate.y );
	let c = vec3( mod( x, size ), y, floor( x.div( size ) ) ).div( size - 1 );
	const ctx = { P, lists, v: values };
	for ( const e of GRADE ) if ( e.enabled( values, ctx ) ) c = e.build( c, ctx );

	const material = new THREE.NodeMaterial();
	material.fragmentNode = vec4( c.clamp( 0, 1 ), 1 );
	const quad = new THREE.QuadMesh( material );
	const rt = new THREE.RenderTarget( W, H, { type: THREE.FloatType, depthBuffer: false } );
	const previous = renderer.getRenderTarget();

	try {

		renderer.setRenderTarget( rt );
		quad.render( renderer );
		renderer.setRenderTarget( previous );
		const raw = await renderer.readRenderTargetPixelsAsync( rt, 0, 0, W, H );
		const data = raw instanceof Float32Array ? raw : new Float32Array( raw.buffer, raw.byteOffset, raw.byteLength / 4 );
		// Rows may be padded (WebGPU aligns to 256 bytes) and WebGL reads bottom-up.
		const stride = data.length === W * H * 4 ? W * 4 : Math.ceil( W * 16 / 256 ) * 256 / 4;
		const bottomUp = renderer.backend.isWebGPUBackend !== true;
		const out = new Float32Array( size * size * size * 4 );
		for ( let g = 0; g < size; g ++ ) {

			const row = ( bottomUp ? H - 1 - g : g ) * stride;
			for ( let b = 0; b < size; b ++ ) for ( let r = 0; r < size; r ++ ) {

				const src = row + ( r + b * size ) * 4, dst = ( ( b * size + g ) * size + r ) * 4;
				out[ dst ] = data[ src ]; out[ dst + 1 ] = data[ src + 1 ]; out[ dst + 2 ] = data[ src + 2 ]; out[ dst + 3 ] = 1;

			}

		}

		return out;

	} finally {

		renderer.setRenderTarget( previous );
		rt.dispose();
		material.dispose();

	}

}
