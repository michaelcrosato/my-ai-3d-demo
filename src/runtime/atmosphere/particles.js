// Ambient particles (design §6.4 D): dust, pollen, embers, snow or rain drifting in a box
// around the camera. One instanced sprite draws them all; positions come from the instance
// index and the clock in the shader, wrapped around the camera, so there is no simulation
// and the field is the same every time at the same clock (captures stay deterministic).
//
// The particles render in the styled set only. Their extra MRT outputs (normal, ids,
// emissive, velocity) have alpha 0, so with normal blending they leave those buffers
// untouched: ink lines, masks and AO never see a snowflake.

import * as THREE from 'three/webgpu';
import { uniform, vec2, vec3, vec4, float, select, sin, cos, mod, abs, length, smoothstep, hash, instanceIndex, cameraPosition, uv, mrt, output } from 'three/tsl';

export const MAX_PARTICLES = 4000;
export const PARTICLE_TYPES = [ 'dust', 'pollen', 'embers', 'snow', 'rain' ];
const BOX = 24; // meters: the field repeats every BOX around the camera

/**
 * @param {object} o
 * @param {Node} o.time - the runtime clock (seconds)
 * @param {number} o.layer - render layer of the styled set
 * @returns {{ object: THREE.Sprite, u: object, apply: (v: object) => void }}
 */
export function createParticles( { time, layer } ) {

	const u = { type: uniform( 0 ), size: uniform( 1 ), speed: uniform( 1 ), color: uniform( new THREE.Color( '#fff3d6' ) ) };
	const pick = ( dust, pollen, embers, snow, rain ) => select( u.type.lessThan( 0.5 ), dust, select( u.type.lessThan( 1.5 ), pollen, select( u.type.lessThan( 2.5 ), embers, select( u.type.lessThan( 3.5 ), snow, rain ) ) ) );

	const h1 = hash( instanceIndex ), h2 = hash( instanceIndex.add( 7919 ) ), h3 = hash( instanceIndex.add( 15737 ) ), h4 = hash( instanceIndex.add( 31337 ) );
	const t = time.mul( u.speed );
	const ph = h4.mul( Math.PI * 2 );
	const drift = pick(
		vec3( sin( t.mul( 0.3 ).add( ph ) ).mul( 0.4 ), sin( t.mul( 0.21 ).add( h1.mul( 6.28 ) ) ).mul( 0.3 ), cos( t.mul( 0.27 ).add( h2.mul( 6.28 ) ) ).mul( 0.4 ) ),
		vec3( t.mul( 0.6 ).add( sin( t.mul( 0.8 ).add( ph ) ).mul( 0.5 ) ), t.mul( - 0.1 ).add( sin( t.mul( 1.3 ).add( h1.mul( 6.28 ) ) ).mul( 0.2 ) ), t.mul( 0.2 ) ),
		vec3( sin( t.mul( 1.7 ).add( ph ) ).mul( 0.3 ), t.mul( h1.mul( 0.8 ).add( 0.8 ) ), cos( t.mul( 1.3 ).add( h2.mul( 6.28 ) ) ).mul( 0.3 ) ),
		vec3( sin( t.mul( 0.9 ).add( ph ) ).mul( 0.5 ), t.mul( h1.mul( 0.4 ).add( 0.8 ) ).negate(), cos( t.mul( 0.7 ).add( h2.mul( 6.28 ) ) ).mul( 0.5 ) ),
		vec3( t.mul( 0.5 ), t.mul( h1.mul( 2 ).add( 9 ) ).negate(), 0 ),
	);
	const p = vec3( h1, h2, h3 ).mul( BOX ).add( drift );
	const rel = mod( p.sub( cameraPosition ).add( BOX / 2 ), BOX ).sub( BOX / 2 );

	const material = new THREE.SpriteNodeMaterial( { transparent: true, depthWrite: false } );
	material.name = 'ambient particles';
	material.positionNode = cameraPosition.add( rel );
	const s = u.size.mul( h4.add( 0.5 ) );
	material.scaleNode = pick( vec2( 0.03 ), vec2( 0.05 ), vec2( 0.06 ), vec2( 0.05 ), vec2( 0.012, 0.35 ) ).mul( s );
	// Embers glow (HDR, so bloom catches them); the rest take the color as it is.
	material.colorNode = u.color.mul( pick( float( 1 ), float( 1 ), float( 4 ), float( 1 ), float( 0.9 ) ) );
	const q = uv().sub( 0.5 );
	const dot = smoothstep( 0.5, 0.15, length( q ) );
	const streak = smoothstep( 0.5, 0.1, abs( q.x ) ).mul( smoothstep( 0.5, 0.3, abs( q.y ) ) );
	const shape = select( u.type.greaterThan( 3.5 ), streak, dot );
	// Fade at the edges of the box (no popping when particles wrap) and right at the lens.
	const dist = length( rel );
	const fade = smoothstep( BOX * 0.5, BOX * 0.32, dist ).mul( smoothstep( 0.2, 0.8, dist ) );
	material.opacityNode = shape.mul( fade ).mul( pick( float( 0.6 ), float( 0.8 ), float( 1 ), float( 0.9 ), float( 0.4 ) ) );
	material.mrtNode = mrt( { output, normal: vec4( 0 ), ids: vec4( 0 ), emissive: vec4( 0 ), velocity: vec4( 0 ) } );

	const object = new THREE.Sprite( material );
	object.name = 'ambient particles';
	object.frustumCulled = false;
	object.layers.set( layer );
	object.visible = false;
	object.userData.stylelabTwin = true;

	return {
		object, u,
		apply( v ) {

			const n = v[ 'atmosphere.particles.enabled' ] ? Math.round( v[ 'atmosphere.particles.density' ] * MAX_PARTICLES ) : 0;
			object.visible = n > 0;
			object.count = Math.max( 1, n );
			u.type.value = Math.max( 0, PARTICLE_TYPES.indexOf( v[ 'atmosphere.particles.type' ] ) );
			u.size.value = v[ 'atmosphere.particles.size' ];
			u.speed.value = v[ 'atmosphere.particles.speed' ];
			u.color.value.set( v[ 'atmosphere.particles.color' ] );

		},
	};

}
