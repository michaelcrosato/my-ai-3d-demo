// URL parameters. Pure, so it runs under node:test.
//   ?backend=webgl | webgpu   force a backend (default: auto, WebGPU first)
//   ?spikes=all | 1,3,5       run spikes automatically after boot
//   ?dpr=1.5                  cap the device pixel ratio (default 2)

export function parseParams( search = '' ) {

	const p = new URLSearchParams( search );
	const b = ( p.get( 'backend' ) || '' ).toLowerCase();
	const backend = b === 'webgl' || b === 'webgl2' ? 'webgl' : b === 'webgpu' ? 'webgpu' : 'auto';

	const raw = p.get( 'spikes' );
	let spikes = null;
	if ( raw === 'all' || raw === '' ) spikes = 'all';
	else if ( raw ) spikes = raw.split( ',' ).map( Number ).filter( ( n ) => Number.isInteger( n ) && n > 0 );

	const dpr = Number.parseFloat( p.get( 'dpr' ) );

	return { backend, spikes, dprCap: Number.isFinite( dpr ) && dpr > 0 ? dpr : 2 };

}
