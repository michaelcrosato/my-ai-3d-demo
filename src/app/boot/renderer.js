// Renderer bootstrap and capability detection.

import * as THREE from 'three/webgpu';

export async function createRenderer( { canvas, backend = 'auto', dprCap = 2 } ) {

	const renderer = new THREE.WebGPURenderer( {
		canvas,
		antialias: true,
		forceWebGL: backend === 'webgl',
		trackTimestamp: true,
	} );

	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, dprCap ) );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;

	await renderer.init();

	return renderer;

}

export const backendName = ( renderer ) => ( renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2' );

/** Facts about the GPU and browser, for the Verify report. */
export async function collectCaps( renderer, requested ) {

	const caps = {
		backend: backendName( renderer ),
		requestedBackend: requested,
		threeRevision: THREE.REVISION,
		secureContext: window.isSecureContext,
		protocol: location.protocol,
		userAgent: navigator.userAgent,
		devicePixelRatio: window.devicePixelRatio,
		pixelRatioUsed: renderer.getPixelRatio(),
		timestampQuery: renderer.hasFeature( 'timestamp-query' ),
		webgpuAvailable: !! navigator.gpu,
	};

	if ( renderer.backend.isWebGPUBackend ) {

		const device = renderer.backend.device;
		let info = device.adapterInfo;
		if ( ! info && navigator.gpu ) info = ( await navigator.gpu.requestAdapter() )?.info;
		caps.adapter = info ? { vendor: info.vendor, architecture: info.architecture, description: info.description, isFallbackAdapter: info.isFallbackAdapter } : null;
		caps.features = [ ...device.features ].sort();
		caps.maxColorAttachments = device.limits.maxColorAttachments;
		caps.maxTextureSize = device.limits.maxTextureDimension2D;

	} else {

		const gl = renderer.backend.gl;
		const ext = gl.getExtension( 'WEBGL_debug_renderer_info' );
		caps.adapter = { description: ext ? gl.getParameter( ext.UNMASKED_RENDERER_WEBGL ) : gl.getParameter( gl.RENDERER ) };
		caps.maxColorAttachments = gl.getParameter( gl.MAX_DRAW_BUFFERS );
		caps.maxTextureSize = gl.getParameter( gl.MAX_TEXTURE_SIZE );
		caps.floatColorBuffer = !! gl.getExtension( 'EXT_color_buffer_float' );

	}

	return caps;

}
