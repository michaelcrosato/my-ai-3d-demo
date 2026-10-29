// The export bundle (design §6.12): STYLE.md, look.json / looks.json, the runtime, the kit,
// starter.html, grade.cube, palette files, reference and contact sheets, and the snapshot
// snippet. Text files are made on demand; images render through the app.

import { generateBrief } from '../../runtime/brief/brief.js';
import { toCube, toGpl } from '../../runtime/export/files.js';
import { lookFromResolved } from '../../runtime/look/resolve.js';
import { SCENES } from '../../scenes/index.js';
import { bakeGradeLut } from './grade.js';
import { lutFor } from '../app.js';
import { zip, toBytes } from './zip.js';

/* global __STYLELAB_FILES__ */
const EMBEDDED = typeof __STYLELAB_FILES__ !== 'undefined' ? __STYLELAB_FILES__ : null;

/** The runtime, kit and starter template: embedded in the built file, fetched from dist/ in dev. */
export async function embeddedFile( name ) {

	if ( EMBEDDED ) return EMBEDDED[ name ];
	// Dev (index.html): the runtime and kit come from the last build. The starter template
	// comes from src, because the built starter.html already has its default looks filled in.
	if ( name === 'starter.html' ) {

		const res = await fetch( 'src/export/starter.html' ); // dev only: never reached in the build
		const map = JSON.stringify( JSON.parse( document.querySelector( 'script[type="importmap"]' ).textContent ), null, '\t' );
		return ( await res.text() ).replace( '/*IMPORTMAP*/', () => map );

	}

	const res = await fetch( `./dist/${name}` );
	if ( ! res.ok ) throw new Error( `${name} isn't built yet: run npm run build` );
	return res.text();

}

export const SNAPSHOT_SNIPPET = `// Style Lab snapshot (design §6.1): exports your game's scene as a .glb with part tags, so you
// can try looks on your own level in Style Lab (drop the file on the window).
// Tag meshes with mesh.userData.part = 'terrain' | 'water' | 'foliage' | 'architecture' |
// 'props' | 'characters' | 'hero' | 'vfx'; untagged meshes are guessed from names and shape.
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export async function snapshot( scene, name = 'my-game' ) {

	// userData (including part tags) travels as glTF extras.
	const glb = await new GLTFExporter().parseAsync( scene, { binary: true, onlyVisible: true } );
	const a = document.createElement( 'a' );
	a.href = URL.createObjectURL( new Blob( [ glb ], { type: 'model/gltf-binary' } ) );
	a.download = \`\${name}.glb\`;
	a.click();
	setTimeout( () => URL.revokeObjectURL( a.href ), 1000 );

}
`;

const slug = ( s ) => String( s ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' ) || 'look';

/**
 * Everything the brief and exports need about the current state.
 * @returns {{ look, resolved, mixedFrom, plan, planLooks }}
 */
export function exportState( app ) {

	const s = app.store.get();
	const resolved = app.target;
	const base = app.look();
	const mixedIds = [ ...new Set( [ s.recipe.base, ...Object.values( s.recipe.modules || {} ).flatMap( ( m ) => [ m.from, m.blend?.with ] ), s.recipe.morph?.with, ...Object.values( s.parts ).map( ( p ) => p.look ) ].filter( Boolean ) ) ];
	const mixed = mixedIds.length > 1 || Object.keys( app.overrides() ).length > 0;
	// A mixed or tweaked state exports as one sparse look; an untouched look exports as itself.
	const look = mixed ? lookFromResolved( resolved, {
		id: `${slug( base.id )}-custom`, name: `${base.name} (custom)`, inspiredBy: base.inspiredBy, tags: base.tags, pillars: base.pillars, mistakes: base.mistakes,
		description: base.description, phone: base.phone, version: 1,
	} ) : { ...base };
	delete look.user;
	// An imported .cube travels with the look that uses it.
	const lut = lutFor( resolved.global );
	if ( lut ) look.lut = lut;

	const name = ( id ) => app.getLook( id ).name;
	const levels = Object.entries( s.plan.levels ).filter( ( [ , l ] ) => l.look ).map( ( [ scene, l ] ) => ( { scene, look: name( l.look ), lookId: l.look, transition: l.transition || 'morph' } ) );
	const zones = SCENES.flatMap( ( sc ) => ( sc.zones || [] ).map( ( z ) => {

		const assigned = s.plan.zones[ sc.id ]?.[ z.id ];
		const lookId = assigned || ( typeof z.look === 'string' ? z.look : null );
		return { scene: sc.id, zone: z.id, look: lookId ? name( lookId ) : `${z.lookName || 'the current look'}, adjusted`, lookId, params: lookId ? null : z.params, blend: z.blend, shape: z.shape, center: z.center, size: z.size, radius: z.radius, priority: z.priority ?? 0 };

	} ) );
	const modes = s.modes.map( ( m ) => ( { name: m.name, look: name( m.look ), lookId: m.look } ) );
	const plan = { levels, zones: zones.filter( ( z ) => z.lookId || s.plan.levels[ z.scene ] ), modes };
	const planLooks = [ ...new Set( [ ...levels.map( ( l ) => l.lookId ), ...plan.zones.map( ( z ) => z.lookId ), ...modes.map( ( m ) => m.lookId ) ].filter( Boolean ) ) ]
		.filter( ( id ) => id !== look.id ).map( ( id ) => { const l = { ...app.getLook( id ) }; delete l.user; return l; } );
	return { look, resolved, mixedFrom: mixedIds.map( name ), plan, planLooks };

}

export function briefText( app, { target = 'runtime', length = 'standard', shareUrl = null } = {} ) {

	const { look, resolved, mixedFrom, plan } = exportState( app );
	return generateBrief( { look, resolved, target, length, shareUrl, mixedFrom, plan, tier: app.store.get().tier } );

}

/** looks.json: the current look plus every look the plan uses, with the plan and modes. */
export function looksJson( app ) {

	const { look, plan, planLooks } = exportState( app );
	return { schema: 'stylelab.looks@1', looks: [ look, ...planLooks ], plan: { levels: plan.levels.map( ( { scene, lookId, transition } ) => ( { scene, look: lookId, transition } ) ), zones: plan.zones.map( ( { look: _, ...z } ) => z ), modes: plan.modes.map( ( { name, lookId } ) => ( { name, look: lookId } ) ) } };

}

/** starter.html with the current look (and the plan's looks) built in. */
export async function starterHtml( app ) {

	const template = await embeddedFile( 'starter.html' );
	const { look, planLooks } = exportState( app );
	return template.replace( '/*LOOKS*/[]/*END*/', () => JSON.stringify( [ look, ...planLooks ] ) );

}

export async function gradeCube( app ) {

	const v = app.target.global;
	const table = await bakeGradeLut( app.runtime.renderer, v );
	return toCube( table, 33, { title: `${app.look().name} grade (Style Lab)` } );

}

/** The palette the look uses: its remap palette, else the key colors by role. */
export function paletteColors( app ) {

	const g = app.target.global;
	if ( g[ 'palette.colors' ].length ) return { colors: g[ 'palette.colors' ], names: [] };
	const roles = [ [ 'sky zenith', g[ 'atmosphere.sky.zenith' ] ], [ 'sky horizon', g[ 'atmosphere.sky.horizon' ] ], [ 'shadow tint', g[ 'surface.shadowTint' ] ], [ 'key light', g[ 'lighting.key.color' ] ], [ 'fog', g[ 'atmosphere.fog.color' ] ], [ 'ink', g[ 'lines.screen.color' ] ] ];
	return { colors: roles.map( ( r ) => r[ 1 ] ), names: roles.map( ( r ) => r[ 0 ] ) };

}

export function paletteGpl( app ) {

	const { colors, names } = paletteColors( app );
	return toGpl( colors, { name: app.look().name, names } );

}

/** palette.png: one swatch per color, labeled. */
export function palettePng( app ) {

	const { colors, names } = paletteColors( app );
	const c = document.createElement( 'canvas' );
	c.width = 96 * colors.length; c.height = 120;
	const ctx = c.getContext( '2d' );
	ctx.font = '11px system-ui, sans-serif';
	colors.forEach( ( hex, i ) => {

		ctx.fillStyle = hex; ctx.fillRect( i * 96, 0, 96, 96 );
		ctx.fillStyle = '#1b1b1c'; ctx.fillRect( i * 96, 96, 96, 24 );
		ctx.fillStyle = '#e6e6e6'; ctx.fillText( names[ i ] ? `${names[ i ]} ${hex}` : hex, i * 96 + 4, 112 );

	} );
	return c.toDataURL( 'image/png' );

}

/** Every file of the bundle, as { name: { text } | { url } | () => Promise }. Heavy ones are lazy. */
export function exportFiles( app, { share } ) {

	const look = exportState( app ).look;
	return [
		{ name: 'STYLE.md', type: 'text/markdown', make: async () => briefText( app, { shareUrl: await share() } ), about: 'The brief (Standard, three.js + runtime). Other targets and lengths: Brief tab.' },
		{ name: `${look.id}.look.json`, type: 'application/json', make: async () => JSON.stringify( look, null, 2 ), about: 'This look (schema stylelab.look@1).' },
		{ name: 'looks.json', type: 'application/json', make: async () => JSON.stringify( looksJson( app ), null, 2 ), about: 'This look plus your level plan, zones and player modes.' },
		{ name: 'stylelab-runtime.js', type: 'text/javascript', make: () => embeddedFile( 'stylelab-runtime.js' ), about: 'The style engine as an ES module (createStyle).' },
		{ name: 'stylelab-kit.js', type: 'text/javascript', make: () => embeddedFile( 'stylelab-kit.js' ), about: 'The procedural asset kit: part-tagged, seeded, tiered.' },
		{ name: 'starter.html', type: 'text/html', make: () => starterHtml( app ), about: 'A minimal game wired to the runtime and kit with this look. Serve it next to the two .js files.' },
		{ name: 'grade.cube', type: 'text/plain', make: () => gradeCube( app ), about: 'The grade as a 33³ LUT for other engines (display-referred, after tone mapping).' },
		{ name: 'palette.gpl', type: 'text/plain', make: async () => paletteGpl( app ), about: 'Palette for GIMP, Krita, Inkscape, Aseprite.' },
		{ name: 'palette.png', type: 'image/png', make: async () => palettePng( app ), url: true, about: 'Palette swatches.' },
		{ name: 'reference.png', type: 'image/png', make: () => app.exportImages.reference(), url: true, about: 'The current view, 1280 × 720.' },
		{ name: 'contact-sheet.png', type: 'image/png', make: () => app.exportImages.contactSheet(), url: true, about: 'This look on every scene (takes a while).' },
		{ name: 'snapshot-snippet.js', type: 'text/javascript', make: async () => SNAPSHOT_SNIPPET, about: 'Add to your game to export its scene as a part-tagged .glb for Style Lab.' },
	];

}

/** Saves text or a data URL as a file. */
/** Every export file in one store-only zip (§6.12, P2). Returns { bytes, names }. */
export async function exportZip( app, options ) {

	const files = exportFiles( app, options );
	const entries = [];
	for ( const f of files ) entries.push( { name: f.name, data: await toBytes( await f.make() ) } );
	return { bytes: zip( entries ), names: entries.map( ( e ) => e.name ) };

}

export function download( name, content, type = 'text/plain' ) {

	const a = document.createElement( 'a' );
	const isUrl = typeof content === 'string' && content.startsWith( 'data:' );
	a.href = isUrl ? content : URL.createObjectURL( new Blob( [ content ], { type } ) );
	a.download = name;
	a.click();
	if ( ! isUrl ) setTimeout( () => URL.revokeObjectURL( a.href ), 2000 );

}
