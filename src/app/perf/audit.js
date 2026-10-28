// Performance audit (design §6.11, §7.14): ranks the current look's effects by GPU cost
// and says what will run on phones.
//
// Deterministic: a frozen clock and the current shot. Variants: plain, full, and full − e
// for every removable effect (optionally plain + e). Each variant is warmed up (compiles
// don't pollute timings), then measured in interleaved rounds to cancel thermal drift.
// Marginal cost(e) = median(full) − median(full − e): TSL fuses chained per-pixel work into
// one shader, so removing an effect and re-measuring is what maps cost to effects.

import * as THREE from 'three/webgpu';
import { texture, vec2, vec4, screenUV, float } from 'three/tsl';
import { timestampsSupported, gpuIdle } from '../../runtime/perf/timer.js';
import { rubric, BUDGETS, VERDICTS } from '../../runtime/perf/cost-model.js';
import { EFFECTS, activeEffects, withPartMasks, passRequirements } from '../../runtime/post/graph.js';
import { resolveLook } from '../../runtime/look/resolve.js';
import { byId, PARTS } from '../../runtime/registry/index.js';

export const AUDIT_TARGETS = {
	desktop: { label: 'Desktop 1080p', width: 1920, height: 1080 },
	'phone-portrait': { label: 'Phone portrait (1080 × 2340)', width: 1080, height: 2340 },
	'phone-landscape': { label: 'Phone landscape (2340 × 1080)', width: 2340, height: 1080 },
	'phone-75': { label: 'Phone portrait at 0.75 render scale', width: 810, height: 1755 },
	native: { label: 'This window, as it is', width: 0, height: 0 },
	small: { label: 'Small (640 × 360, quick)', width: 640, height: 360 },
};

/** The overrides that remove one effect, or null for effects that are always on. */
export function removeEffect( id ) {

	if ( [ 'quality.fxaa', 'quality.smaa', 'quality.traa' ].includes( id ) ) return { 'quality.aa': 'none' };
	if ( id === 'retro.quantize' ) return { 'retro.quantize.mode': 'off' };
	if ( byId.has( `${id}.enabled` ) ) return { [ `${id}.enabled` ]: false };
	return null;

}

/** Resolved values with overrides applied to the global values and every part. */
function withOverrides( resolved, o ) {

	const parts = {};
	for ( const p of PARTS ) {

		parts[ p ] = { ...resolved.parts[ p ] };
		for ( const [ k, v ] of Object.entries( o ) ) if ( k in parts[ p ] ) parts[ p ][ k ] = v;

	}

	return { global: { ...resolved.global, ...o }, parts, sources: resolved.sources };

}

const median = ( a ) => { const s = [ ...a ].sort( ( x, y ) => x - y ); const m = s.length >> 1; return s.length % 2 ? s[ m ] : ( s[ m - 1 ] + s[ m ] ) / 2; };
const p90 = ( a ) => { const s = [ ...a ].sort( ( x, y ) => x - y ); return s[ Math.min( s.length - 1, Math.floor( s.length * 0.9 ) ) ]; };
const round = ( x, n = 2 ) => Math.round( x * 10 ** n ) / 10 ** n;

/**
 * Runs the audit. The caller pauses the animation loop and sizes the renderer.
 * @param {object} o - { app, renderer, target, rounds, frames, warmup, standalone, onProgress }
 */
export async function runAudit( { app, renderer, target = 'desktop', rounds = 3, frames = 60, warmup = 20, standalone = false, onProgress = () => {} } ) {

	const runtime = app.runtime;
	const full = app.target;
	const v = withPartMasks( full.global, full.parts );
	const effectIds = activeEffects( v ).filter( ( id ) => removeEffect( id ) );
	const timer = timestampsSupported( renderer ) ? 'timestamp' : 'wallclock';
	const plainLook = resolveLook( { look: { baseline: true, params: {} }, sceneParams: app.scene().params } );

	const variants = [
		{ id: 'plain', label: 'Plain (baseline look)', values: plainLook },
		{ id: 'full', label: 'Full look', values: full },
		...effectIds.map( ( id ) => ( { id: `-${id}`, effect: id, label: `Full − ${EFFECTS.find( ( e ) => e.id === id ).label}`, values: withOverrides( full, removeEffect( id ) ) } ) ),
		...( standalone ? effectIds.map( ( id ) => {

			const o = Object.fromEntries( Object.entries( removeEffect( id ) ).map( ( [ k ] ) => [ k, full.global[ k ] ] ) );
			return { id: `+${id}`, effect: id, label: `Plain + ${EFFECTS.find( ( e ) => e.id === id ).label}`, values: withOverrides( plainLook, o ) };

		} ) : [] ),
	];

	// One frame's GPU time: timestamps when the renderer has them, else render → GPU idle.
	const frame = async () => {

		if ( timer === 'timestamp' ) {

			runtime.render();
			return ( await renderer.resolveTimestampsAsync( 'render' ) ) || 0;

		}

		await gpuIdle( renderer );
		const t0 = performance.now();
		runtime.render();
		await gpuIdle( renderer );
		return performance.now() - t0;

	};

	// Warm-up: compile each variant (timed separately) and settle.
	let step = 0;
	const total = variants.length * ( 1 + rounds );
	for ( const variant of variants ) {

		runtime.apply( variant.values );
		const t0 = performance.now();
		runtime.render();
		await gpuIdle( renderer );
		variant.compileMs = round( performance.now() - t0, 0 );
		for ( let i = 0; i < warmup; i ++ ) await frame();
		variant.samples = [];
		onProgress( ++ step / total, `Warming up ${variant.label}` );

	}

	// Calibration: 1 FPE = a fullscreen pass with nine texture taps at this resolution.
	const calibration = await calibrate( renderer, { frames: Math.max( 10, frames >> 1 ), timer } );

	// Measure in interleaved rounds (the order rotates each round).
	for ( let r = 0; r < rounds; r ++ ) {

		const order = variants.map( ( _, i ) => variants[ ( i + r ) % variants.length ] );
		for ( const variant of order ) {

			runtime.apply( variant.values );
			for ( let i = 0; i < 3; i ++ ) await frame(); // settle after the switch
			for ( let i = 0; i < frames; i ++ ) variant.samples.push( await frame() );
			onProgress( ++ step / total, `Round ${r + 1} of ${rounds}: ${variant.label}` );

		}

	}

	const stat = ( id ) => variants.find( ( x ) => x.id === id );
	for ( const variant of variants ) { variant.median = round( median( variant.samples ), 3 ); variant.p90 = round( p90( variant.samples ), 3 ); delete variant.values; }

	const fullMs = stat( 'full' ).median, plainMs = stat( 'plain' ).median;
	const kit = rubric( full.global, full.parts );
	const effects = effectIds.map( ( id ) => {

		const marginal = Math.max( 0, fullMs - stat( `-${id}` ).median );
		const alone = standalone ? Math.max( 0, stat( `+${id}` ).median - plainMs ) : null;
		const fpe = calibration.msPerFpe > 0 ? marginal / calibration.msPerFpe : null;
		return {
			id, label: EFFECTS.find( ( e ) => e.id === id ).label, marginal: round( marginal, 3 ), standalone: alone === null ? null : round( alone, 3 ),
			pct: round( 100 * marginal / Math.max( 1e-6, fullMs ), 1 ), fpeMeasured: fpe === null ? null : round( fpe, 2 ), fpeRubric: kit.effects.find( ( e ) => e.id === id )?.fpe ?? null,
		};

	} ).sort( ( a, b ) => b.marginal - a.marginal );

	const sumMarginal = round( effects.reduce( ( s, e ) => s + e.marginal, 0 ), 3 );
	const buffers = [ ...passRequirements( v ) ];
	const size = renderer.getDrawingBufferSize( new THREE.Vector2() );
	// One clean frame of the full look for the per-frame counters.
	runtime.apply( full );
	renderer.info.reset();
	runtime.render();
	const info = { ...renderer.info.render };
	const report = {
		target, targetLabel: AUDIT_TARGETS[ target ]?.label || target, resolution: [ size.x, size.y ], timer, rounds, frames,
		scene: app.scene().name, look: app.look().name,
		variants: variants.map( ( { id, label, median: m, p90: p, compileMs } ) => ( { id, label, median: m, p90: p, compileMs } ) ),
		effects, totals: { full: fullMs, plain: plainMs, styledOverhead: round( fullMs - plainMs, 3 ), sumMarginal, interaction: round( fullMs - plainMs - sumMarginal, 3 ) },
		calibration, rubric: kit,
		stats: { drawCalls: info.drawCalls, triangles: info.triangles, mrtAttachments: 1 + buffers.length, buffers, renderTargetMB: round( size.x * size.y * ( 4 + 4 + buffers.length * 4 ) / 1048576 * 2, 1 ) },
		recommendations: recommend( effects, kit, fullMs ),
	};
	return report;

}

/** Times the calibration workload: a fullscreen 9-tap blur of a texture. */
async function calibrate( renderer, { frames, timer } ) {

	const size = renderer.getDrawingBufferSize( new THREE.Vector2() );
	const data = new Uint8Array( 64 * 64 * 4 ).map( ( _, i ) => ( i * 37 ) & 255 );
	const tex = new THREE.DataTexture( data, 64, 64 );
	tex.needsUpdate = true;
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	let c = vec4( 0 );
	for ( let i = 0; i < 9; i ++ ) c = c.add( texture( tex, screenUV.mul( 7 ).add( vec2( ( i % 3 ) / size.x, Math.floor( i / 3 ) / size.y ) ) ) );
	const material = new THREE.NodeMaterial();
	material.fragmentNode = vec4( c.rgb.div( 9 ), float( 1 ) );
	const quad = new THREE.QuadMesh( material );
	const rt = new THREE.RenderTarget( size.x, size.y );
	const previous = renderer.getRenderTarget();
	const once = async () => {

		if ( timer === 'timestamp' ) { renderer.setRenderTarget( rt ); quad.render( renderer ); renderer.setRenderTarget( previous ); return ( await renderer.resolveTimestampsAsync( 'render' ) ) || 0; }
		await gpuIdle( renderer );
		const t0 = performance.now();
		renderer.setRenderTarget( rt );
		quad.render( renderer );
		renderer.setRenderTarget( previous );
		await gpuIdle( renderer );
		return performance.now() - t0;

	};

	try {

		for ( let i = 0; i < 5; i ++ ) await once();
		const samples = [];
		for ( let i = 0; i < frames; i ++ ) samples.push( await once() );
		return { msPerFpe: round( median( samples ), 4 ), workload: 'fullscreen pass, 9 texture taps' };

	} finally {

		renderer.setRenderTarget( previous );
		rt.dispose();
		material.dispose();
		tex.dispose();

	}

}

/** Recommendations: the cheapest set of drops that reaches each phone verdict. */
function recommend( effects, kit, fullMs ) {

	const out = [];
	const budget = ( id ) => BUDGETS.find( ( b ) => b.id === id ).fpe;
	let fpe = kit.total, ms = 0;
	const dropped = [];
	for ( const e of [ ...effects ].sort( ( a, b ) => ( b.fpeRubric ?? 0 ) - ( a.fpeRubric ?? 0 ) ) ) {

		if ( fpe <= budget( 'phone-mid' ) ) break;
		fpe -= ( e.fpeRubric ?? 0 ) * kit.scale;
		ms += e.marginal;
		dropped.push( e.label );
		const verdict = fpe <= budget( 'phone-mid' ) ? 'safe' : fpe <= budget( 'phone-high' ) ? 'high' : 'desktop';
		if ( verdict !== kit.verdict ) out.push( `Dropping ${dropped.join( ', ' )} saves ${round( ms, 2 )} ms (${round( 100 * ms / Math.max( 1e-6, fullMs ), 0 )}% of this frame) → ${VERDICTS[ verdict ]}.` );

	}

	if ( kit.buffers.length >= 3 ) out.push( `This look writes ${kit.buffers.length} extra buffers (${kit.buffers.join( ', ' )}). On phones each one costs memory bandwidth on every frame; Make phone-friendly variant swaps screen lines for hull outlines.` );
	if ( ! out.length ) out.push( kit.verdict === 'safe' ? 'Nothing to drop: this look fits a mid-range phone budget.' : 'Make phone-friendly variant applies the standard substitutions.' );
	return out;

}

/** The report as Markdown, for pasting back (on-device runs update the budget table). */
export function reportText( r, env = {} ) {

	const lines = [
		`# Style Lab audit · ${r.look} on ${r.scene}`,
		`Target: ${r.targetLabel}, ${r.resolution.join( ' × ' )} · timer: ${r.timer} · ${r.rounds} rounds × ${r.frames} frames`,
		env.adapter ? `Device: ${env.adapter} · ${env.backend || ''} · ${env.userAgent || ''}` : '',
		'',
		`Full ${r.totals.full} ms · plain ${r.totals.plain} ms · sum of marginal costs ${r.totals.sumMarginal} ms (interactions ${r.totals.interaction} ms)`,
		`Calibration: 1 FPE = ${r.calibration.msPerFpe} ms (${r.calibration.workload})`,
		`Rubric: ${r.rubric.total} FPE → ${r.rubric.label}`,
		'',
		'| Effect | Marginal ms | % of frame | FPE measured | FPE rubric |',
		'|---|---|---|---|---|',
		...r.effects.map( ( e ) => `| ${e.label} | ${e.marginal} | ${e.pct}% | ${e.fpeMeasured ?? '–'} | ${e.fpeRubric ?? '–'} |` ),
		'',
		`Draw calls ${r.stats.drawCalls} · triangles ${r.stats.triangles} · attachments ${r.stats.mrtAttachments} · render targets ≈ ${r.stats.renderTargetMB} MB`,
		...r.recommendations.map( ( t ) => `- ${t}` ),
	];
	return lines.filter( ( l, i ) => l !== '' || lines[ i - 1 ] !== '' ).join( '\n' );

}
