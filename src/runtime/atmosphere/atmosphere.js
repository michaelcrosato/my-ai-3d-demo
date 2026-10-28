// Atmosphere (design §6.4 D, §7.7 WORLD stage): gradient sky with a sun disc and toon
// clouds on a camera-centered dome, and distance plus height fog evaluated inside every
// styled material (scene.fogNode), optionally tinted by the sky in the view direction.

import * as THREE from 'three/webgpu';
import { Fn, uniform, vec2, vec3, float, mix, smoothstep, step, select, exp, floor, fract, fwidth, max, abs, acos, clamp, positionWorld, positionView, cameraPosition, fog, mrt, output, mx_fractal_noise_float } from 'three/tsl';

export function createAtmosphereUniforms() {

	return {
		zenith: uniform( new THREE.Color( '#87ceeb' ) ),
		horizon: uniform( new THREE.Color( '#87ceeb' ) ),
		ground: uniform( new THREE.Color( '#87ceeb' ) ),
		exponent: uniform( 1 ),
		sunDirection: uniform( new THREE.Vector3( 0, 1, 0 ) ),
		sunColor: uniform( new THREE.Color( '#ffffff' ) ),
		sunRadius: uniform( 0 ), // radians
		sunSoftness: uniform( 0.5 ),
		fogType: uniform( 0 ), // 0 off · 1 linear · 2 exp · 3 exp2
		fogAmount: uniform( 1 ),
		fogDensity: uniform( 0.008 ),
		fogStart: uniform( 10 ),
		fogEnd: uniform( 200 ),
		fogOffset: uniform( 0 ), // fog-free distance in front of the camera (far isometric shots)
		fogColor: uniform( new THREE.Color( '#c8dcf0' ) ),
		fogSkyTint: uniform( 1 ),
		fogBands: uniform( 0 ),
		heightDensity: uniform( 0 ),
		heightBase: uniform( 0 ),
		heightFalloff: uniform( 0.25 ),
		clouds: uniform( 0 ),
		cloudCoverage: uniform( 0.45 ),
		cloudSoftness: uniform( 0.06 ),
		cloudBands: uniform( 2 ),
		cloudScale: uniform( 1 ),
		cloudSpeed: uniform( 0.3 ),
		cloudColor: uniform( new THREE.Color( '#ffffff' ) ),
		cloudShade: uniform( new THREE.Color( '#a9b8dc' ) ),
		time: uniform( 0 ), // the runtime shares its clock uniform here
	};

}

export const FOG_TYPES = { off: 0, linear: 1, exp: 2, exp2: 3 };

/** Sky gradient color in direction `dir` (normalized, world space); no sun. */
export function skyGradient( u, dir ) {

	const up = clamp( dir.y, 0, 1 ).pow( u.exponent );
	const above = mix( u.horizon, u.zenith, up );
	const below = mix( u.horizon, u.ground, smoothstep( 0, 0.08, dir.y.negate() ) );
	return mix( below, above, step( 0, dir.y ) );

}

/** Toon clouds: drifting fractal noise on a virtual cloud plane, lit toward the sun and banded. */
export function cloudLayer( u, dir, sky ) {

	const up = max( dir.y, 0 );
	// A virtual cloud plane: big puffs overhead, compressed toward the horizon.
	const uv = dir.xz.div( up.add( 0.3 ) ).mul( u.cloudScale.reciprocal().mul( 1.1 ) ).add( vec2( u.time.mul( u.cloudSpeed ).mul( 0.01 ), u.time.mul( u.cloudSpeed ).mul( 0.003 ) ) );
	const n = mx_fractal_noise_float( vec3( uv, 0.5 ), 3 ).mul( 1.2 ).add( 0.5 );
	const edge = u.cloudCoverage.oneMinus();
	const mask = smoothstep( edge.sub( u.cloudSoftness ), edge.add( u.cloudSoftness ).add( 1e-3 ), n );
	// Lit side: density falls toward the sun; the bands flatten it into cel tones.
	const toward = mx_fractal_noise_float( vec3( uv.add( u.sunDirection.xz.normalize().mul( 0.06 ) ), 0.5 ), 3 ).mul( 1.2 ).add( 0.5 );
	const lit = n.sub( toward ).mul( 5 ).add( 0.65 ).clamp( 0, 1 );
	const bands = max( u.cloudBands, 1 );
	const banded = select( u.cloudBands.greaterThan( 0.5 ), floor( lit.mul( bands ).add( 0.5 ) ).div( bands ), lit );
	const color = mix( u.cloudShade, u.cloudColor, banded );
	const fade = smoothstep( 0.0, 0.08, dir.y );
	return mix( sky, color, mask.mul( fade ).mul( u.clouds ) );

}

/** Full sky color: gradient plus a sun disc with a soft halo, and clouds over both. */
export function skyColor( u, dir ) {

	const angle = acos( clamp( dir.dot( u.sunDirection ), - 1, 1 ) );
	const r = max( u.sunRadius, 1e-4 );
	const disc = smoothstep( r.mul( u.sunSoftness.mul( - 0.85 ).add( 1 ) ).sub( 1e-4 ), r, angle ).oneMinus().mul( step( 1e-4, u.sunRadius ) );
	const halo = exp( angle.div( r.mul( 3 ) ).negate() ).mul( 0.15 ).mul( step( 1e-4, u.sunRadius ) );
	return cloudLayer( u, dir, skyGradient( u, dir ).add( u.sunColor.mul( disc.add( halo ) ) ) );

}

/**
 * Fog opacity at distance `dist`, shared by materials and the ink-line fade. With a
 * world position, height fog is added: exponential density falling off above a base
 * height, integrated along the view ray from the camera.
 */
export function fogFactor( u, distance, world = null ) {

	const dist = max( distance.sub( u.fogOffset ), 0 );
	const linear = smoothstep( u.fogStart, u.fogEnd, dist );
	const e = exp( u.fogDensity.mul( dist ).negate() ).oneMinus();
	const e2 = exp( u.fogDensity.mul( dist ).pow( 2 ).negate() ).oneMinus();
	let f = select( u.fogType.equal( 1 ), linear, select( u.fogType.equal( 2 ), e, select( u.fogType.equal( 3 ), e2, float( 0 ) ) ) );

	if ( world ) {

		const b = u.heightFalloff;
		const dy = world.y.sub( cameraPosition.y );
		const k = b.mul( dy );
		const shape = select( abs( k ).lessThan( 1e-3 ), float( 1 ), exp( k.negate() ).oneMinus().div( k ) );
		const optical = u.heightDensity.mul( dist ).mul( exp( b.mul( cameraPosition.y.sub( u.heightBase ) ).negate().min( 30 ) ) ).mul( shape );
		const h = exp( optical.max( 0 ).negate() ).oneMinus();
		f = f.oneMinus().mul( h.oneMinus() ).oneMinus();

	}

	// Toon bands: quantize, with an anti-aliased step between bands.
	const x = f.mul( u.fogBands );
	const aa = max( fwidth( x ).mul( 0.75 ), 0.02 );
	const banded = floor( x ).add( smoothstep( aa.oneMinus().mul( 0.5 ), aa.add( 1 ).mul( 0.5 ), fract( x ) ) ).div( max( u.fogBands, 1 ) );

	return select( u.fogBands.greaterThan( 0.5 ), banded, f ).mul( u.fogAmount );

}

/** scene.fogNode for the styled set. Plain materials set `fog = false`. */
export function createFogNode( u ) {

	const viewDir = positionWorld.sub( cameraPosition ).normalize();
	const flat = vec3( viewDir.x, max( viewDir.y, 0 ), viewDir.z ).normalize();
	const color = mix( u.fogColor, skyGradient( u, flat ), u.fogSkyTint );
	return fog( color, fogFactor( u, positionView.length(), positionWorld ) );

}

/** A camera-centered dome mesh; depthWrite off so everything draws over it. */
function dome( material, layer ) {

	const mesh = new THREE.Mesh( new THREE.SphereGeometry( 1, 48, 24 ), material );
	mesh.layers.set( layer );
	mesh.frustumCulled = false;
	mesh.renderOrder = - 1000;
	mesh.castShadow = mesh.receiveShadow = false;
	mesh.name = 'sky dome';
	return mesh;

}

/**
 * Styled and plain sky domes. The styled dome writes part id 0 (sky) for the
 * ids buffer; `ids` is passed in so the dome matches the material factory.
 */
export function createSkyDomes( u, { layerStyled, layerPlain, idsNode } ) {

	const styled = new THREE.MeshBasicNodeMaterial( { side: THREE.BackSide, depthWrite: false, fog: false } );
	styled.colorNode = Fn( () => skyColor( u, positionWorld.sub( cameraPosition ).normalize() ) )();
	styled.mrtNode = mrt( { output, ids: idsNode } );

	// The baseline's solid sky-blue background (design §6.9 "agent default").
	const plain = new THREE.MeshBasicNodeMaterial( { side: THREE.BackSide, depthWrite: false, fog: false, color: new THREE.Color( '#87ceeb' ) } );

	return { styled: dome( styled, layerStyled ), plain: dome( plain, layerPlain ) };

}
