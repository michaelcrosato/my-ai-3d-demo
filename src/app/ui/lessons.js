// Lesson player (design §6.13, Appendix E): a caption bar over the viewport that steps
// through a lesson. Each step's setup is applied cumulatively from the lesson's start, so
// Back lands on exactly the same state. Tasks show a ✓ when done. The same player runs the
// "Build it from scratch" replay of any look.

import { lessonById, LESSONS } from '../../content/lessons.js';
import { MODULES } from '../../runtime/registry/index.js';
import { h } from './dom.js';

/** Module captions for the build-up replay. */
const MODULE_CAPTIONS = {
	lighting: 'Lighting: the key light, the ambient fill and the shadows.',
	surface: 'Surface: how light becomes tone on every material (the shading model, bands, tint, rim).',
	lines: 'Lines: outlines and ink.',
	palette: 'Palette: the base colors, remapped and adjusted.',
	atmosphere: 'Atmosphere: sky, fog and clouds.',
	lens: 'Lens: field of view, bloom, vignette, focus.',
	grade: 'Grade: exposure, tone mapping and the color grade.',
	media: 'Media: brush, print or paper.',
	retro: 'Retro: pixels, palettes, dither, the old screen.',
	motion: 'Motion: stepped animation and line boil.',
	quality: 'Quality: anti-aliasing and render scale.',
};

/** "Build it from scratch": every module muted, then unmuted one at a time in pipeline order. */
export function buildUpLesson( look ) {

	const used = MODULES.filter( ( m ) => Object.keys( look.params || {} ).some( ( id ) => id.startsWith( `${m.id}.` ) ) );
	const muted = Object.fromEntries( MODULES.map( ( m ) => [ m.id, { mute: true } ] ) );
	const steps = [ { caption: `${look.name}, built from scratch: every module neutral first. This is the bare scene with the look switched off.`, setup: { recipe: { base: look.id, modules: muted } } } ];
	const on = {};
	for ( const m of used ) {

		on[ m.id ] = true;
		const modules = Object.fromEntries( MODULES.filter( ( x ) => ! on[ x.id ] ).map( ( x ) => [ x.id, { mute: true } ] ) );
		steps.push( { caption: `+ ${MODULE_CAPTIONS[ m.id ] || m.label}`, setup: { recipe: { base: look.id, modules } } } );

	}

	steps.push( { caption: `That is ${look.name}: ${( look.pillars || [] ).slice( 0, 2 ).join( ' ' )}`, setup: { recipe: { base: look.id, modules: {} } } } );
	return { id: `build-${look.id}`, title: `Build ${look.name} from scratch`, steps, buildUp: true };

}

export function createLessonPlayer( root, app, { setView, openBrief, runQuickAudit, setTab, toast } ) {

	let lesson = null, index = 0;
	// Tune values on the looks a lesson visits are the lesson's: each look it leaves gets
	// back what it had before the lesson (the look on screen keeps the lesson's values).
	let saved = {}, touched = new Set();
	const restoreOthers = ( keep ) => { for ( const b of touched ) if ( b !== keep ) app.actions.setOverrides( b, saved[ b ] || {} ); };
	const ctx = { held: false, audited: false, briefTab: null };
	ctx.audit = async () => { await runQuickAudit(); ctx.audited = true; };
	ctx.openBrief = ( tab ) => { openBrief( tab ); ctx.briefTab = tab; };

	app.on( ( type, detail ) => {

		if ( type === 'hold' && detail ) ctx.held = true;
		if ( type === 'audited' ) ctx.audited = true;
		if ( type === 'brief-tab' ) ctx.briefTab = detail;
		if ( lesson && [ 'resolved', 'hold', 'audited', 'recipe', 'library', 'brief-tab' ].includes( type ) ) renderTask();

	} );

	/** Applies the lesson's setup, cumulatively, up to step k. */
	function applyUpTo( k ) {

		const acc = { params: {} };
		for ( let i = 0; i <= k; i ++ ) {

			const s = lesson.steps[ i ].setup || {};
			for ( const [ key, value ] of Object.entries( s ) ) if ( key === 'params' ) Object.assign( acc.params, value ); else acc[ key ] = value;

		}

		const a = app.actions;
		a.setScope( null );
		a.setIsolate( null );
		if ( Object.keys( app.store.get().parts ).length ) a.setParts( {} );
		if ( acc.scene && acc.scene !== app.store.get().sceneId ) a.setScene( acc.scene, { tier: acc.tier } );
		else if ( acc.tier !== undefined ) a.setTier( acc.tier );
		if ( acc.recipe ) a.setRecipe( acc.recipe );
		else if ( acc.look ) a.setLook( acc.look, { transition: false } );
		const base = app.store.get().recipe.base;
		restoreOthers( base );
		touched.add( base );
		a.setOverrides( base, {} );
		for ( const [ id, v ] of Object.entries( acc.params ) ) a.setParam( id, v, { part: null } );
		if ( acc.focus ) a.applyFocusPreset();
		setView( acc.view ?? null );
		a.setTurntable( !! acc.turntable );
		if ( acc.compare === 'off' && app.store.get().compare.mode !== 'off' ) a.setCompareMode( app.store.get().compare.mode );
		if ( acc.tab ) setTab( acc.tab );
		if ( lesson.steps[ k ].setup?.brief ) ctx.openBrief( lesson.steps[ k ].setup.brief );

	}

	const task = () => lesson?.steps[ index ].task;
	const isDone = () => { const t = task(); return t ? !! t.done( app, ctx ) : true; };

	function renderTask() {

		const el = root.querySelector( '[data-task]' );
		if ( ! el || ! task() ) return;
		el.classList.toggle( 'done', isDone() );
		el.querySelector( 'b' ).textContent = isDone() ? '✓' : '○';

	}

	function render() {

		if ( ! lesson ) { root.hidden = true; return; }
		const step = lesson.steps[ index ];
		root.replaceChildren(
			h( 'div.lesson-head', {}, h( 'b', {}, lesson.title ), h( 'span.hint', {}, `${index + 1} / ${lesson.steps.length}` ), h( 'button.close', { onclick: () => stop(), title: 'Leave the lesson (the scene stays as it is)' }, '✕' ) ),
			h( 'p.lesson-caption', {}, step.caption ),
			step.task ? h( 'p.lesson-task', { dataset: { task: '' } }, h( 'b', {}, '○' ), ` ${step.task.text}` ) : null,
			h( 'div.row', {},
				h( 'button', { disabled: index === 0, onclick: () => go( index - 1 ) }, '← Back' ),
				h( 'button.primary', { onclick: () => ( index < lesson.steps.length - 1 ? go( index + 1 ) : finish() ) }, index < lesson.steps.length - 1 ? 'Next →' : 'Finish ✓' ),
			),
		);
		root.hidden = false;
		renderTask();

	}

	function go( k ) {

		index = Math.max( 0, Math.min( lesson.steps.length - 1, k ) );
		applyUpTo( index );
		render();
		app.emit?.( 'lesson', { id: lesson.id, index } );

	}

	function finish() {

		if ( ! lesson.buildUp ) {

			const done = new Set( app.store.get().lessons.done );
			done.add( lesson.id );
			app.store.set( { lessons: { done: [ ...done ] } } );
			toast( `Lesson done: ${lesson.title}.` );

		}

		stop();

	}

	function stop() {

		if ( lesson ) restoreOthers( app.store.get().recipe.base );
		lesson = null;
		setView( null );
		render();

	}

	return {
		start( idOrLesson ) {

			lesson = typeof idOrLesson === 'string' ? lessonById.get( idOrLesson ) : idOrLesson;
			if ( ! lesson ) throw new Error( `Unknown lesson ${idOrLesson}` );
			Object.assign( ctx, { held: false, audited: false, briefTab: null } );
			saved = JSON.parse( JSON.stringify( app.store.get().overrides ) );
			touched = new Set();
			go( 0 );

		},
		next: () => lesson && ( index < lesson.steps.length - 1 ? go( index + 1 ) : finish() ),
		back: () => lesson && go( index - 1 ),
		stop,
		/** For test scripts: perform the current step's task. */
		async solve() { const t = task(); if ( t?.solve ) await t.solve( app, ctx ); renderTask(); return isDone(); },
		state: () => ( lesson ? { id: lesson.id, index, total: lesson.steps.length, task: task() ? { text: task().text, done: isDone() } : null } : null ),
		LESSONS,
	};

}
