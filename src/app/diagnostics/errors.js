// Captures console errors and warnings, uncaught exceptions, rejected promises and
// WebGPU device errors, deduplicated, for the Verify panel and the test API.

const MAX_LENGTH = 1500;

function format( value ) {

	if ( value instanceof Error ) return value.stack || value.message;
	if ( typeof value === 'object' && value !== null ) {

		try { return JSON.stringify( value ); } catch { return String( value ); }

	}

	return String( value );

}

export function installErrorCapture() {

	const entries = [];
	const listeners = new Set();

	const add = ( level, parts ) => {

		const message = parts.map( format ).join( ' ' ).slice( 0, MAX_LENGTH );
		const existing = entries.find( ( e ) => e.level === level && e.message === message );
		if ( existing ) existing.count ++;
		else entries.push( { level, message, count: 1, time: new Date().toISOString() } );
		for ( const fn of listeners ) fn( entries );

	};

	for ( const level of [ 'error', 'warn' ] ) {

		const original = console[ level ].bind( console );
		console[ level ] = ( ...args ) => {

			add( level, args );
			original( ...args );

		};

	}

	window.addEventListener( 'error', ( e ) => add( 'error', [ `${e.message} (${e.filename}:${e.lineno})` ] ) );
	window.addEventListener( 'unhandledrejection', ( e ) => add( 'error', [ 'Unhandled rejection:', e.reason ] ) );

	return {
		entries,
		add,
		errors: () => entries.filter( ( e ) => e.level === 'error' ),
		warnings: () => entries.filter( ( e ) => e.level === 'warn' ),
		onChange: ( fn ) => listeners.add( fn ),
		attachDevice( device ) {

			device.addEventListener( 'uncapturederror', ( e ) => add( 'error', [ '[webgpu]', e.error?.message || e.error ] ) );
			device.lost.then( ( info ) => { if ( info.reason !== 'destroyed' ) add( 'error', [ '[webgpu] device lost:', info.message ] ); } );

		},
	};

}
