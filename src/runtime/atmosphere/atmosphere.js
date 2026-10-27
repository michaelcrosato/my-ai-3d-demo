// Atmosphere (design §6.4 D, §7.7 WORLD stage): gradient sky with a sun disc on a
// camera-centered dome, and distance fog evaluated inside every styled material
// (scene.fogNode), optionally tinted by the sky in the view direction.

import * as THREE from 'three/webgpu';
import { Fn, uniform, vec3, float, mix, smoothstep, step, select, exp, floor, fract, fwidth, max, acos, clamp, positionWorld, positionView, cameraPosition, fog, mrt, output } from 'three/tsl';

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
		fogColor: uniform( new THREE.Color( '#c8dcf0' ) ),
		fogSkyTint: uniform( 1 ),
		fogBands: uniform( 0 ),
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

/** Full sky color: gradient plus a sun disc with a soft halo. */
export function skyColor( u, dir ) {

	const angle = acos( clamp( dir.dot( u.sunDirection ), - 1, 1 ) );
	const r = max( u.sunRadius, 1e-4 );
	const disc = smoothstep( r.mul( u.sunSoftness.mul( - 0.85 ).add( 1 ) ).sub( 1e-4 ), r, angle ).oneMinus().mul( step( 1e-4, u.sunRadius ) );
	const halo = exp( angle.div( r.mul( 3 ) ).negate() ).mul( 0.15 ).mul( step( 1e-4, u.sunRadius ) );
	return skyGradient( u, dir ).add( u.sunColor.mul( disc.add( halo ) ) );

}

/** Fog opacity at distance `dist`, shared by materials and the ink-line fade. */
export function fogFactor( u, dist ) {

	const linear = smoothstep( u.fogStart, u.fogEnd, dist );
	const e = exp( u.fogDensity.mul( dist ).negate() ).oneMinus();
	const e2 = exp( u.fogDensity.mul( dist ).pow( 2 ).negate() ).oneMinus();
	const f = select( u.fogType.equal( 1 ), linear, select( u.fogType.equal( 2 ), e, select( u.fogType.equal( 3 ), e2, float( 0 ) ) ) );

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
	return fog( color, fogFactor( u, positionView.length() ) );

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
