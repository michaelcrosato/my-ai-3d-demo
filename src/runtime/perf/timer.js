// GPU timing with a fallback chain:
//   timestamp  - GPU timestamp queries (renderer created with trackTimestamp: true)
//   wallclock  - CPU time until the GPU is idle (queue.onSubmittedWorkDone / sync readback)

export function timestampsSupported( renderer ) {

	return renderer.backend.trackTimestamp === true && renderer.hasFeature( 'timestamp-query' );

}

/** Waits until previously submitted GPU work has finished. */
export async function gpuIdle( renderer ) {

	const backend = renderer.backend;

	if ( backend.isWebGPUBackend ) {

		await backend.device.queue.onSubmittedWorkDone();

	} else {

		const gl = backend.gl;
		gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array( 4 ) );

	}

}

/**
 * Measures the average GPU cost of `renderFrame` over `frames` calls.
 * @returns {Promise<{ method: string, msPerFrame: number }>}
 */
export async function measureFrames( renderer, renderFrame, { frames = 30, method = 'auto' } = {} ) {

	const useTimestamps = method === 'timestamp' || ( method === 'auto' && timestampsSupported( renderer ) );

	if ( useTimestamps ) {

		await renderer.resolveTimestampsAsync( 'render' ); // discard anything pending
		for ( let i = 0; i < frames; i ++ ) renderFrame();
		const total = await renderer.resolveTimestampsAsync( 'render' );
		return { method: 'timestamp', msPerFrame: ( total || 0 ) / frames };

	}

	await gpuIdle( renderer );
	const t0 = performance.now();
	for ( let i = 0; i < frames; i ++ ) renderFrame();
	await gpuIdle( renderer );
	return { method: 'wallclock', msPerFrame: ( performance.now() - t0 ) / frames };

}
