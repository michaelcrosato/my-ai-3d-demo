// Shared helpers for the M0 spikes. Every spike renders offscreen, reads pixels
// back and records numeric checks, so outcomes don't depend on eyeballing.

import * as THREE from 'three/webgpu';
import { luma } from '../gpu/readback.js';

export const SIZE = 256;

export class SpikeReport {

	constructor( spike ) {

		this.id = spike.id;
		this.key = spike.key;
		this.title = spike.title;
		this.checks = [];
		this.notes = [];
		this.fallback = false;
		this.errorMessage = null;
		this.ms = 0;

	}

	/** A gating check: any failure makes the spike "no-go". */
	check( name, pass, value, expect ) {

		this.checks.push( { name, pass: !! pass, value: fmt( value ), expect, info: false } );
		return !! pass;

	}

	/** An informational measurement; never changes the status. */
	info( name, value, note = '' ) {

		this.checks.push( { name, pass: true, value: fmt( value ), expect: note, info: true } );

	}

	note( text ) {

		this.notes.push( text );

	}

	error( e ) {

		this.errorMessage = String( e && e.stack ? e.stack.split( '\n' ).slice( 0, 4 ).join( ' | ' ) : e );

	}

	get status() {

		if ( this.errorMessage ) return 'error';
		if ( this.checks.some( ( c ) => ! c.info && ! c.pass ) ) return 'no-go';
		return this.fallback ? 'go-fallback' : 'go';

	}

	toJSON() {

		return { id: this.id, key: this.key, title: this.title, status: this.status, ms: Math.round( this.ms ), checks: this.checks, notes: this.notes, error: this.errorMessage };

	}

}

function fmt( v ) {

	if ( typeof v === 'number' ) return Number.isInteger( v ) ? v : Number( v.toFixed( 4 ) );
	if ( Array.isArray( v ) ) return v.map( fmt );
	return v;

}

/** Orthographic camera looking straight down at the [-1, 1]² square; screen right = +X. */
export function topDownCamera() {

	const camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.01, 50 );
	camera.position.set( 0, 10, 0 );
	camera.up.set( 0, 0, - 1 );
	camera.lookAt( 0, 0, 0 );
	return camera;

}

/** Orthographic camera looking down -Z at the [-r, r]² square. */
export function frontCamera( r = 1.1 ) {

	const camera = new THREE.OrthographicCamera( - r, r, r, - r, 0.01, 50 );
	camera.position.set( 0, 0, 5 );
	camera.lookAt( 0, 0, 0 );
	return camera;

}

export function groundPlane( material, size = 4 ) {

	const mesh = new THREE.Mesh( new THREE.PlaneGeometry( size, size ), material );
	mesh.rotation.x = - Math.PI / 2;
	mesh.receiveShadow = true;
	return mesh;

}

export function disposeScene( scene ) {

	scene.traverse( ( o ) => {

		if ( o.geometry ) o.geometry.dispose();
		if ( o.material ) for ( const m of [].concat( o.material ) ) m.dispose();
		if ( o.shadow && o.shadow.map ) o.shadow.map.dispose();

	} );

}

/**
 * Counts colors that cover at least `minShare` of the sampled pixels.
 * Colors are bucketed to 6 bits per channel so anti-aliasing noise doesn't split clusters.
 */
export function countClusters( pixels, include, minShare = 0.02 ) {

	const counts = new Map();
	let total = 0;

	for ( let y = 0; y < pixels.height; y ++ ) {

		for ( let x = 0; x < pixels.width; x ++ ) {

			if ( ! include( x, y ) ) continue;
			const p = pixels.at( x, y );
			const key = ( p[ 0 ] >> 2 ) << 12 | ( p[ 1 ] >> 2 ) << 6 | ( p[ 2 ] >> 2 );
			counts.set( key, ( counts.get( key ) || 0 ) + 1 );
			total ++;

		}

	}

	let clusters = 0;
	for ( const c of counts.values() ) if ( c >= total * minShare ) clusters ++;
	return clusters;

}

/** Number of pixels along row `y` whose luma lies strictly between lo and hi (a transition band). */
export function transitionWidth( pixels, y, lo, hi ) {

	let n = 0;
	for ( let x = 0; x < pixels.width; x ++ ) {

		const l = luma( pixels.at( x, y ) );
		if ( l > lo && l < hi ) n ++;

	}

	return n;

}

/** Luma statistics over a rectangle given in normalized coordinates. */
export function regionLuma( pixels, u0, v0, u1, v1 ) {

	let n = 0, sum = 0, sum2 = 0;

	for ( let y = Math.floor( v0 * pixels.height ); y < Math.floor( v1 * pixels.height ); y ++ ) {

		for ( let x = Math.floor( u0 * pixels.width ); x < Math.floor( u1 * pixels.width ); x ++ ) {

			const l = luma( pixels.at( x, y ) );
			sum += l; sum2 += l * l; n ++;

		}

	}

	const mean = sum / n;
	return { mean, std: Math.sqrt( Math.max( 0, sum2 / n - mean * mean ) ) };

}
