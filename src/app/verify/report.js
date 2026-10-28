// Formats the Verify report the user pastes back (design §6.14). Pure: no DOM.

const ICON = { pass: '✅', fail: '❌', unsure: '⚠️', go: '✅', 'go-fallback': '⚠️', 'no-go': '❌', error: '💥' };

/** "Chrome 141 / macOS" from a user-agent string. */
export function shortUA( ua = '' ) {

	const version = ( re ) => re.exec( ua )?.[ 1 ];
	const browsers = [ [ 'Edge', /Edg\/(\d+)/ ], [ 'Firefox', /Firefox\/(\d+)/ ], [ 'Chrome', /Chrome\/(\d+)/ ], [ 'Safari', /Version\/(\d+)[\d.]* .*Safari/ ] ];
	const found = browsers.find( ( [ , re ] ) => version( re ) );
	const browser = found ? `${found[ 0 ]} ${version( found[ 1 ] )}` : 'Unknown browser';
	const os = /Android/.test( ua ) ? 'Android' : /iPhone|iPad/.test( ua ) ? 'iOS' : /Mac OS X/.test( ua ) ? 'macOS' : /Windows/.test( ua ) ? 'Windows' : /Linux/.test( ua ) ? 'Linux' : 'unknown OS';
	return `${browser} / ${os}`;

}

function adapterLabel( adapter ) {

	if ( ! adapter ) return 'unknown GPU';
	const parts = [ adapter.vendor, adapter.architecture ].filter( Boolean ).join( ' ' );
	const label = parts ? `${parts}${adapter.description ? ` — ${adapter.description}` : ''}` : adapter.description || 'unknown GPU';
	return adapter.isFallbackAdapter ? `${label} (software fallback)` : label;

}

function firstLine( text, max = 160 ) {

	const line = String( text ).split( '\n' )[ 0 ];
	return line.length > max ? `${line.slice( 0, max - 1 )}…` : line;

}

/**
 * @param {object} d
 * @param {{version: string, commit: string}} d.build
 * @param {object} d.env - from collectCaps(), plus viewport {width, height}
 * @param {Array<{id: string, title: string, status?: string, note?: string, ratingsList?: object[]}>} d.checks
 * @param {Object<string, object[]>} [d.spikeRuns] - spike results by backend name
 * @param {Array<{level: string, message: string, count: number}>} [d.log]
 * @param {object} [d.perf] - {gpuMs, cpuMs, fps, method}
 * @param {string} [d.date] - ISO date
 */
export function formatReport( { build, env, checks, spikeRuns = {}, log = [], perf = null, date = new Date().toISOString() } ) {

	const lines = [];
	lines.push( `### Style Lab verify report — v${build.version} (${build.commit}) — ${date.slice( 0, 10 )}` );

	const vp = env.viewport ? ` · ${env.viewport.width}×${env.viewport.height} @${env.pixelRatioUsed}` : '';
	lines.push( `Env: ${shortUA( env.userAgent )} · ${env.backend}${env.requestedBackend && env.requestedBackend !== 'auto' ? ` (forced ${env.requestedBackend})` : ''} · ${adapterLabel( env.adapter )}${vp} · timestamp-query ${env.timestampQuery ? '✓' : '✗'} · ${env.protocol}` );

	const done = checks.filter( ( c ) => c.status );
	const count = ( s ) => done.filter( ( c ) => c.status === s ).length;
	lines.push( `Checks: ${count( 'pass' )} pass · ${count( 'fail' )} fail · ${count( 'unsure' )} unsure · ${checks.length - done.length} not done` );
	const owed = checks.filter( ( c ) => ! c.status && c.signoff !== false );
	if ( owed.length ) lines.push( `Still owed: ${owed.map( ( c ) => c.id ).join( ', ' )}` );

	for ( const c of checks ) {

		const rated = ( c.ratingsList || [] ).filter( ( r ) => r.evoke || r.like || r.note );
		if ( rated.length ) {

			const text = rated.map( ( r ) => `${r.name} evokes ${r.evoke ?? '–'}/5 · likes ${r.like ?? '–'}/5${r.note ? ` ("${firstLine( r.note, 120 )}")` : ''}` ).join( '; ' );
			lines.push( `${ICON[ c.status ] || '📝'} ${c.id} ${c.title} — ${text}${c.note ? ` — "${firstLine( c.note, 300 )}"` : ''}` );
			continue;

		}

		if ( ! c.status || ( c.status === 'pass' && ! c.note ) ) continue;
		lines.push( `${ICON[ c.status ]} ${c.id} ${c.title}${c.note ? ` — "${firstLine( c.note, 300 )}"` : ''}` );

	}

	for ( const [ backend, spikes ] of Object.entries( spikeRuns ) ) {

		if ( ! spikes.length ) continue;
		const sc = ( s ) => spikes.filter( ( r ) => r.status === s ).length;
		lines.push( `Spikes (${backend}): ${sc( 'go' )} go · ${sc( 'go-fallback' )} go-fallback · ${sc( 'no-go' )} no-go · ${sc( 'error' )} error` );

		for ( const r of spikes ) {

			if ( r.status === 'go' ) continue;
			const failed = r.checks.filter( ( c ) => ! c.info && ! c.pass ).map( ( c ) => `${c.name} (got ${JSON.stringify( c.value )}, want ${c.expect})` );
			const detail = r.error ? firstLine( r.error, 240 ) : failed.length ? failed.join( '; ' ) : firstLine( r.notes[ 0 ] || '' );
			lines.push( `${ICON[ r.status ]} S${r.id} ${r.key} — ${r.status}: ${detail}` );

		}

	}

	const errors = log.filter( ( e ) => e.level === 'error' );
	const warnings = log.filter( ( e ) => e.level === 'warn' );
	lines.push( `Errors (${errors.length})${errors.length ? ':' : ''}` );
	for ( const e of errors.slice( 0, 5 ) ) lines.push( `  - ${firstLine( e.message )}${e.count > 1 ? ` ×${e.count}` : ''}` );
	if ( warnings.length ) {

		lines.push( `Warnings (${warnings.length}):` );
		for ( const w of warnings.slice( 0, 5 ) ) lines.push( `  - ${firstLine( w.message )}${w.count > 1 ? ` ×${w.count}` : ''}` );

	}

	if ( perf ) {

		const gpu = perf.gpuMs != null ? `GPU ${perf.gpuMs.toFixed( 2 )} ms/frame (${perf.method})` : 'GPU n/a';
		lines.push( `Perf: ${gpu} · CPU ${perf.cpuMs.toFixed( 2 )} ms · ${Math.round( perf.fps )} fps` );

	}

	return lines.join( '\n' );

}
