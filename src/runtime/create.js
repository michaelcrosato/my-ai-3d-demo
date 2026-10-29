// The public runtime API (design Appendix C): createStyle() wraps StyleRuntime for a game.
//
//   const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } );
//   const wall = style.material( { part: 'architecture', color: '#d9a066', role: 'wall' } );
//   style.convertScene( scene );                 // retrofit untagged meshes in one call
//   renderer.setAnimationLoop( () => { update(); style.render(); } );
//
// No DOM access: the host page owns the canvas, the loop and input.

import * as THREE from 'three/webgpu';
import { StyleRuntime } from './style.js';
import { resolveRecipe, blendResolved } from './look/resolve.js';
import { validateLook } from './look/validate.js';
import { tagMeshes } from './parts/convert.js';
import { byId, PARTS } from './registry/index.js';
import { setCustomLut, decodeLut } from './color/lut.js';

const PLAIN = { schema: 'stylelab.look@1', id: 'plain', name: 'Plain', baseline: true, params: {} };
const ease = ( t ) => ( t < 0.5 ? 2 * t * t : 1 - Math.pow( - 2 * t + 2, 2 ) / 2 );

/** The shadow frame and a default shot from a scene's bounds. */
function frameOf( scene, camera ) {

	scene.updateMatrixWorld( true );
	const box = new THREE.Box3();
	scene.traverse( ( o ) => { if ( o.isMesh && ! o.userData.stylelabTwin ) box.expandByObject( o ); } );
	const sphere = box.isEmpty() ? new THREE.Sphere( new THREE.Vector3(), 10 ) : box.getBoundingSphere( new THREE.Sphere() );
	const center = sphere.center.toArray();
	return {
		shadow: { center, radius: Math.max( 2, Math.min( sphere.radius, 60 ) ) },
		shots: { main: { pos: camera.position.toArray(), target: center, fov: camera.fov } },
		defaultShot: 'main',
		far: camera.far,
	};

}

/** Mobile when the platform says so; desktop otherwise. */
const autoQuality = () => ( globalThis.navigator?.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/.test( globalThis.navigator?.userAgent || '' ) ) ? 'mobile' : 'desktop';

export class Style {

	constructor( { renderer, scene, camera, looks = [], quality = 'auto', sceneParams = {}, frame = null, convert = true, lens = true } ) {

		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;
		this.sceneParams = sceneParams;
		this.looks = new Map( [ [ 'plain', PLAIN ] ] );
		this.plan = null;
		for ( const l of looks ) this.addLook( l );
		this.current = looks.length ? ( looks[ 0 ].looks ? looks[ 0 ].looks[ 0 ].id : looks[ 0 ].id ) : 'plain';
		this.quality = quality === 'auto' ? autoQuality() : quality;
		this.overrides = {};
		this.partOverrides = {};
		this.zoneWeights = {};
		this.transition = null;
		this.time = 0;
		this.focus = new THREE.Vector3();
		// The look's lens width (lens.fovScale) scales this FOV; set it when your game changes
		// the camera's FOV, or pass lens: false to leave the camera alone.
		this.baseFov = camera.fov;
		this.lens = lens;

		// The host's sun and sky lights would double the look's light rig: hide them.
		// Point and spot lights become practicals (torches, lamps) that follow the look.
		scene.traverse( ( o ) => { if ( o.isDirectionalLight || o.isHemisphereLight || o.isAmbientLight ) { o.visible = false; o.userData.stylelabHidden = true; } } );
		if ( convert ) tagMeshes( scene );

		this.runtime = new StyleRuntime( { renderer, camera } );
		const def = frame || frameOf( scene, camera );
		this.focus.fromArray( def.shadow.center );
		this.runtime.setScene( scene, def );
		this.resolved = this.resolve();
		this.runtime.apply( this.resolved );

	}

	/** Adds a look (JSON) or a looks.json plan ({ looks, plan, modes }). */
	addLook( json ) {

		if ( json.looks ) { this.plan = json; for ( const l of json.looks ) this.addLook( l ); return; }
		const { ok, errors } = validateLook( json );
		if ( ! ok ) throw new Error( `createStyle: invalid look ${json.id}: ${errors.slice( 0, 3 ).join( '; ' )}` );
		// An imported .cube travels inside the look (grade.lut.preset 'custom').
		if ( json.lut ) setCustomLut( decodeLut( json.lut ) );
		this.looks.set( json.id, json );

	}

	/** Resolves the current look with tweaks, quality tier and zone weights. */
	resolve( id = this.current ) {

		const getLook = ( x ) => this.looks.get( x ) || PLAIN;
		const look = getLook( id );
		const tier = this.quality === 'mobile' ? look.tiers?.mobile?.params || {} : {};
		const parts = Object.fromEntries( Object.entries( this.partOverrides ).map( ( [ p, o ] ) => [ p, { overrides: o } ] ) );
		let r = resolveRecipe( { recipe: { base: id }, getLook, parts, sceneParams: this.sceneParams, overrides: { ...tier, ...this.overrides } } );
		for ( const [ zid, w ] of Object.entries( this.zoneWeights ) ) {

			if ( w > 0 && this.looks.has( zid ) && zid !== id ) r = blendResolved( r, resolveRecipe( { recipe: { base: zid }, getLook, sceneParams: this.sceneParams, overrides: tier } ), Math.min( 1, w ) );

		}

		return r;

	}

	/** A material for a new mesh: tagged with its part, colored by the look. */
	material( { part = 'props', color = '#cccccc', role, roughness = 0.8, metalness = 0, emissive = null, emissiveIntensity = 1 } = {} ) {

		if ( ! PARTS.includes( part ) ) throw new Error( `style.material: unknown part ${part} (use one of ${PARTS.join( ', ' )})` );
		const m = new THREE.MeshStandardMaterial( { color, roughness, metalness } );
		m.userData.stylelab = { part, color, role, roughness, metalness, emissive, emissiveIntensity };
		return m;

	}

	/** Tags a mesh (or every mesh under an object) with a part. */
	tag( object, part ) {

		object.traverse( ( o ) => { if ( o.isMesh && ! o.userData.stylelabTwin ) { o.userData.part = part; if ( o.userData.style ) o.userData.style.part = part; } } );
		return object;

	}

	/**
	 * Retrofit: styles every untagged mesh under `root` in one call, keeping its color and
	 * guessing its part from names and shape. Returns the guesses, with reasons.
	 */
	convertScene( root = this.scene, { guessParts = true } = {} ) {

		const { meshes, guesses } = tagMeshes( root, { guess: guessParts } );
		this.runtime.add( root, root.parent || this.scene );
		return meshes.map( ( m, i ) => ( { name: m.name, part: guesses[ i ].part, reason: guesses[ i ].reason } ) );

	}

	/** Adds a new object to the styled scene (tags untagged meshes first). */
	add( object, parent = this.scene ) {

		tagMeshes( object, { guess: false } );
		this.runtime.add( object, parent );
		return object;

	}

	/** Switches looks: { transition: 'morph' | 'crossfade' | 'wipe' | 'cut', duration }. */
	setLook( id, { transition = 'morph', duration = 0.8 } = {} ) {

		if ( ! this.looks.has( id ) ) throw new Error( `style.setLook: unknown look ${id}` );
		const from = this.resolved;
		this.current = id;
		const to = this.resolve();
		if ( transition === 'cut' || duration <= 0 ) { this.transition = null; this.runtime.setTransition( { mode: null } ); return this.show( to ); }
		if ( transition !== 'morph' ) this.runtime.snapshot();
		this.transition = { type: transition, from, to, t: 0, duration };
		if ( transition !== 'morph' ) { this.runtime.setTransition( { mode: transition, progress: 0 } ); this.show( to ); } else this.show( blendResolved( from, to, 0 ) );

	}

	/** Zone weights by look id, e.g. from trigger volumes: { crypt: 0.7 }. */
	setZoneWeights( weights ) { this.zoneWeights = { ...weights }; this.show( this.resolve() ); }

	/** A Tune value for the whole look, or for one part. */
	setParam( id, value, { part = null } = {} ) {

		if ( ! byId.has( id ) ) throw new Error( `style.setParam: unknown parameter ${id}` );
		if ( part ) this.partOverrides[ part ] = { ...this.partOverrides[ part ], [ id ]: value };
		else this.overrides[ id ] = value;
		this.show( this.resolve() );

	}

	/** 'desktop' | 'mobile' | 'auto': mobile applies the look's phone tier. */
	setQuality( q ) { this.quality = q === 'auto' ? autoQuality() : q; this.show( this.resolve() ); }

	show( r ) { this.resolved = r; return this.runtime.apply( r ); }

	/** Advances transitions and renders. `dt` defaults to the time since the last call. */
	render( dt ) {

		const now = performance.now() / 1000;
		if ( dt === undefined ) dt = this.last ? Math.min( 0.1, now - this.last ) : 0;
		this.last = now;
		this.time += dt;
		const tr = this.transition;
		if ( tr ) {

			tr.t = Math.min( 1, tr.t + dt / tr.duration );
			if ( tr.type === 'morph' ) this.show( tr.t >= 1 ? tr.to : blendResolved( tr.from, tr.to, ease( tr.t ) ) );
			else this.runtime.setTransition( { progress: ease( tr.t ) } );
			if ( tr.t >= 1 ) { this.transition = null; this.runtime.setTransition( { mode: null } ); }

		}

		if ( this.lens && this.camera.isPerspectiveCamera ) this.applyLens();
		// The runtime steps the clock ("animate on twos", per part); the camera stays smooth.
		this.runtime.update( this.time, { focus: this.focus } );
		this.runtime.render();

	}

	/**
	 * The look's lens: the base FOV times lens.fovScale, with the camera dollied along its
	 * view line so the focus keeps its size on screen (only the perspective changes), as in
	 * Style Lab.
	 */
	applyLens() {

		const cam = this.camera;
		const next = Math.min( 110, this.baseFov * ( this.resolved.global[ 'lens.fovScale' ] ?? 1 ) );
		if ( Math.abs( next - cam.fov ) < 1e-6 ) return;
		const k = Math.tan( cam.fov * Math.PI / 360 ) / Math.tan( next * Math.PI / 360 );
		cam.position.sub( this.focus ).multiplyScalar( k ).add( this.focus );
		cam.fov = next;
		cam.updateProjectionMatrix();

	}

	dispose() {

		this.runtime.dispose();
		this.scene.traverse( ( o ) => { if ( o.userData.stylelabHidden ) o.visible = true; } );

	}

}

/**
 * Creates the style for a game.
 * @param {object} o - { renderer, scene, camera, looks: look JSONs or a looks.json plan, quality: 'auto' | 'desktop' | 'mobile',
 *   sceneParams: scene-specific values under the look (light direction, sky), frame: { shadow, shots, defaultShot, far }, convert: tag untagged meshes }
 */
export async function createStyle( options ) {

	if ( options.renderer.init && ! options.renderer._initialized ) await options.renderer.init();
	return new Style( options );

}
