// The styled scene pass (design §7.7, §6.4 H "render scale / pixelation").
//
// In pixel looks the pass renders at an exact low resolution: each low-res texel covers
// p × p screen pixels (p a whole number), and the styled camera's frustum is widened by
// the few pixels that don't divide evenly, so texel (i, j) is exactly the block
// [i·p, (i+1)·p) on screen. The post graph samples texel centers, so the image is
// blocky, and a camera pan by whole texels shifts it by exactly p screen pixels.

import { PassNode } from 'three/webgpu';

/** Low-res grid for an output of W × H device pixels and a target row count. */
export function pixelGrid( W, H, rows ) {

	const p = Math.max( 1, Math.round( H / Math.max( 1, rows ) ) );
	return { p, width: Math.ceil( W / p ), height: Math.ceil( H / p ) };

}

export class StylePassNode extends PassNode {

	constructor( scene, camera, options ) {

		super( PassNode.COLOR, scene, camera, options );
		/** Target pixel rows in pixel looks; null renders at the resolution scale. */
		this.pixelRows = null;

	}

	setSize( width, height ) {

		if ( this.pixelRows === null ) return super.setSize( width, height );
		this._width = width;
		this._height = height;
		const g = pixelGrid( Math.floor( width * this._pixelRatio ), Math.floor( height * this._pixelRatio ), this.pixelRows );
		this.renderTarget.setSize( g.width, g.height );

	}

}
