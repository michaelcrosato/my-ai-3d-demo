// Blob shadows (design §6.4 A): a soft dark disc under each object of the parts that
// have them, like the round shadow under a platformer character.
//
// Instead of transparent decal meshes (which would blend into the ids and normal
// buffers and z-fight on uneven ground), every styled material darkens itself where
// it lies under a blob owner. Owners are the scene's top-level objects whose meshes
// mostly belong to a blob-enabled part; their positions are uniforms updated each
// frame, so moving characters and karts carry their blobs along.

import * as THREE from 'three/webgpu';
import { Fn, uniformArray, uniform, float, int, Loop, max, smoothstep, step, positionWorld } from 'three/tsl';

export const MAX_BLOBS = 48;
const MAX_FOOTPRINT = 6; // meters: buildings and terrain never get blobs

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

export class BlobShadows {

	constructor() {

		this.data = uniformArray( Array.from( { length: MAX_BLOBS }, () => new THREE.Vector4() ), 'vec4' );
		this.count = uniform( 0, 'int' );
		this.softness = uniform( 0.6 );
		this.opacity = uniform( 0.5 );
		this.size = 1.1;
		this.candidates = [];
		this.owners = [];
		this.parts = new Set();
		this.node = null;

	}

	/** Collects candidate owners: top-level objects, each with its dominant part and local bounds. */
	setScene( root ) {

		this.candidates = [];
		root.updateMatrixWorld( true );
		const inverse = new THREE.Matrix4();

		for ( const object of root.children ) {

			const counts = {};
			const box = new THREE.Box3();
			inverse.copy( object.matrixWorld ).invert();

			object.traverse( ( o ) => {

				if ( ! o.isMesh || ! o.userData.style ) return;
				counts[ o.userData.style.part ] = ( counts[ o.userData.style.part ] || 0 ) + 1;
				if ( ! o.geometry.boundingBox ) o.geometry.computeBoundingBox();
				box.union( _box.copy( o.geometry.boundingBox ).applyMatrix4( o.matrixWorld ).applyMatrix4( inverse ) );

			} );

			const part = Object.entries( counts ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ]?.[ 0 ];
			if ( ! part || box.isEmpty() ) continue;
			box.getSize( _size );
			if ( Math.max( _size.x, _size.z ) > MAX_FOOTPRINT * 2 ) continue;
			this.candidates.push( { object, part, box } );

		}

		this.select();

	}

	/** Parts whose objects get blobs. Returns true when the set changed. */
	setParts( parts ) {

		const next = new Set( parts );
		const changed = next.size !== this.parts.size || [ ...next ].some( ( p ) => ! this.parts.has( p ) );
		this.parts = next;
		if ( changed ) this.select();
		return changed;

	}

	select() {

		this.owners = this.candidates.filter( ( c ) => this.parts.has( c.part ) ).slice( 0, MAX_BLOBS );

	}

	get active() {

		return this.parts.size > 0;

	}

	/** Per frame: owners' world footprints into the uniform array (x, base y, z, radius). */
	update() {

		let n = 0;

		for ( const { object, box } of this.owners ) {

			_box.copy( box ).applyMatrix4( object.matrixWorld );
			_box.getSize( _size );
			const r = Math.max( 0.15, Math.max( _size.x, _size.z ) * 0.5 * this.size );
			this.data.array[ n ++ ].set( ( _box.min.x + _box.max.x ) / 2, _box.min.y, ( _box.min.z + _box.max.z ) / 2, r );

		}

		this.count.value = n;

	}

	/** Darkening in [0, opacity] at the fragment's world position (one node, shared by every material). */
	shade() {

		if ( this.node ) return this.node;

		this.node = Fn( () => {

			const shade = float( 0 ).toVar();

			Loop( { start: int( 0 ), end: this.count, type: 'int', condition: '<' }, ( { i } ) => {

				const b = this.data.element( i );
				const d = positionWorld.xz.sub( b.xz ).length().div( b.w );
				const h = b.y.sub( positionWorld.y );
				const disc = smoothstep( this.softness.oneMinus().mul( 0.95 ), 1, d ).oneMinus();
				// Only surfaces under the object's base; the blob fades as the object rises.
				const below = step( - 0.06, h );
				const fade = smoothstep( 0, max( b.w.mul( 2.5 ), 1 ), h ).oneMinus();
				shade.assign( max( shade, disc.mul( below ).mul( fade ) ) );

			} );

			return shade.mul( this.opacity );

		} )();

		return this.node;

	}

}
