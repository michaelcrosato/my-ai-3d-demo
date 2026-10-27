import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, shortUA } from '../src/app/verify/report.js';

const env = {
	backend: 'WebGPU', requestedBackend: 'auto', protocol: 'file:', pixelRatioUsed: 2, timestampQuery: true,
	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
	adapter: { vendor: 'apple', architecture: 'metal-3', description: '' },
	viewport: { width: 2560, height: 1440 },
};

test( 'shortUA names common browsers and platforms', () => {

	assert.equal( shortUA( env.userAgent ), 'Chrome 141 / macOS' );
	assert.equal( shortUA( 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0' ), 'Edge 141 / Windows' );
	assert.equal( shortUA( 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' ), 'Safari 18 / iOS' );
	assert.equal( shortUA( 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0' ), 'Firefox 140 / Linux' );

} );

test( 'report has the header, env, counts, failures, spikes, errors and perf', () => {

	const text = formatReport( {
		build: { version: '0.1.0', commit: 'abc1234' },
		env,
		date: '2026-11-02T10:00:00Z',
		checks: [
			{ id: 'M0-01', title: 'Backend badge shows WebGPU', status: 'pass' },
			{ id: 'M0-02', title: 'Works when opened from disk', status: 'fail', note: 'blank page' },
			{ id: 'M0-03', title: 'No errors', status: 'unsure' },
			{ id: 'M0-04', title: 'Spikes pass' },
		],
		spikes: [
			{ id: 1, key: 'cel-ramp', status: 'go', checks: [], notes: [] },
			{ id: 7, key: 'timestamps', status: 'go-fallback', checks: [], notes: [ 'No timestamp queries on this GPU.' ] },
			{ id: 2, key: 'mrt-ids', status: 'no-go', checks: [ { name: 'box writes part 3', pass: false, info: false, value: [ 0, 0 ], expect: '[3, 10]' } ], notes: [] },
		],
		log: [ { level: 'error', message: '[webgpu] validation failed\nstack…', count: 3 }, { level: 'warn', message: 'benign', count: 1 } ],
		perf: { gpuMs: 3.14159, cpuMs: 0.5, fps: 59.6, method: 'timestamp' },
	} );

	const lines = text.split( '\n' );
	assert.equal( lines[ 0 ], '### Style Lab verify report — v0.1.0 (abc1234) — 2026-11-02' );
	assert.equal( lines[ 1 ], 'Env: Chrome 141 / macOS · WebGPU · apple metal-3 · 2560×1440 @2 · timestamp-query ✓ · file:' );
	assert.ok( text.includes( 'Checks: 1 pass · 1 fail · 1 unsure · 1 not done' ) );
	assert.ok( text.includes( '❌ M0-02 Works when opened from disk — "blank page"' ) );
	assert.ok( ! text.includes( 'M0-01' ), 'passing checks without notes are omitted' );
	assert.ok( text.includes( 'Spikes (WebGPU): 1 go · 1 go-fallback · 1 no-go · 0 error' ) );
	assert.ok( text.includes( '⚠️ S7 timestamps — go-fallback: No timestamp queries on this GPU.' ) );
	assert.ok( text.includes( '❌ S2 mrt-ids — no-go: box writes part 3 (got [0,0], want [3, 10])' ) );
	assert.ok( text.includes( '  - [webgpu] validation failed ×3' ), 'errors show first line and count' );
	assert.ok( text.includes( 'Warnings (1):' ) );
	assert.ok( text.includes( 'Perf: GPU 3.14 ms/frame (timestamp) · CPU 0.50 ms · 60 fps' ) );

} );

test( 'forced backend and software adapters are labeled', () => {

	const text = formatReport( {
		build: { version: '0.1.0', commit: 'x' },
		env: { ...env, backend: 'WebGL2', requestedBackend: 'webgl', adapter: { vendor: 'google', architecture: 'swiftshader', isFallbackAdapter: true } },
		checks: [],
	} );

	assert.ok( text.includes( 'WebGL2 (forced webgl) · google swiftshader (software fallback)' ) );
	assert.ok( text.includes( 'Errors (0)' ) );

} );
