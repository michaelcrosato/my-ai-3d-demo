// Light rigs for the render sets (design §7.12). Lights are layer-filtered, and
// shadow cameras left on the default layer inherit the pass layers, so each set's
// sun shades only its own twins (M0 spike 3).

import * as THREE from 'three/webgpu';
import { LAYER_STYLED, LAYER_PLAIN } from '../materials/factory.js';

function sun( layer ) {

	const light = new THREE.DirectionalLight( 0xffffff, 2 );
	light.layers.set( layer );
	light.castShadow = true;
	light.shadow.mapSize.set( 2048, 2048 );
	light.shadow.bias = - 0.0005;
	light.shadow.normalBias = 0.03; // removes self-shadowing stripes (acne) on curved shapes
	return light;

}

function hemisphere( layer ) {

	const light = new THREE.HemisphereLight( 0xffffff, 0x444444, 1 );
	light.layers.set( layer );
	return light;

}

/** Direction toward a light at `elevation`/`azimuth` (degrees); azimuth 0 = from `base` (radians). */
export function lightDirection( elevation, azimuth, base ) {

	const el = elevation * Math.PI / 180, az = azimuth * Math.PI / 180 + base;
	return new THREE.Vector3( Math.cos( el ) * Math.sin( az ), Math.sin( el ), Math.cos( el ) * Math.cos( az ) );

}

export class Rigs {

	constructor( scene ) {

		this.styled = { sun: sun( LAYER_STYLED ), hemi: hemisphere( LAYER_STYLED ) };
		this.plain = { sun: sun( LAYER_PLAIN ), hemi: hemisphere( LAYER_PLAIN ) };
		this.frame = { center: new THREE.Vector3(), radius: 10, base: 0 };

		for ( const rig of [ this.styled, this.plain ] ) {

			scene.add( rig.sun, rig.sun.target, rig.hemi );

		}

		this.direction = new THREE.Vector3( 0, 1, 0 );

	}

	/** Fits the shadow cameras to a scene and sets the azimuth reference (the hero shot). */
	setFrame( { center, radius, heroPos, heroTarget } ) {

		this.frame.center.set( ...center );
		this.frame.radius = radius;
		this.frame.base = Math.atan2( heroPos[ 0 ] - heroTarget[ 0 ], heroPos[ 2 ] - heroTarget[ 2 ] );

		for ( const { sun: s } of [ this.styled, this.plain ] ) {

			Object.assign( s.shadow.camera, { left: - radius, right: radius, top: radius, bottom: - radius, near: 0.5, far: radius * 5 } );
			s.shadow.camera.updateProjectionMatrix();
			s.target.position.copy( this.frame.center );

		}

		// The baseline: a 2.0 sun at 50° elevation, a white/#444 hemisphere at 1.0 (§6.9).
		this.place( this.plain.sun, lightDirection( 50, 45, this.frame.base ) );
		this.plain.sun.intensity = 2;
		this.plain.sun.shadow.radius = 1;

	}

	place( light, dir ) {

		light.position.copy( this.frame.center ).addScaledVector( dir, this.frame.radius * 2.5 );
		light.target.updateMatrixWorld();

	}

	/** Applies the lighting module. Returns the world direction toward the key light. */
	apply( v ) {

		const { sun: s, hemi } = this.styled;
		this.direction.copy( lightDirection( v[ 'lighting.key.elevation' ], v[ 'lighting.key.azimuth' ], this.frame.base ) );
		this.place( s, this.direction );
		s.color.set( v[ 'lighting.key.color' ] );
		s.intensity = v[ 'lighting.key.intensity' ];
		s.castShadow = v[ 'lighting.shadows.enabled' ];
		s.shadow.radius = v[ 'lighting.shadows.softness' ];
		const size = v[ 'lighting.shadows.mapSize' ];
		if ( s.shadow.mapSize.x !== size ) {

			s.shadow.mapSize.set( size, size );
			s.shadow.map?.dispose();
			s.shadow.map = null;

		}
		hemi.color.set( v[ 'lighting.ambient.sky' ] );
		hemi.groundColor.set( v[ 'lighting.ambient.ground' ] );
		hemi.intensity = v[ 'lighting.ambient.intensity' ];
		return this.direction;

	}

	dispose() {

		for ( const rig of [ this.styled, this.plain ] ) { rig.sun.shadow.dispose(); rig.sun.removeFromParent(); rig.sun.target.removeFromParent(); rig.hemi.removeFromParent(); }

	}

}
