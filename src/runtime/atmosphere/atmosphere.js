// Atmosphere (design §6.4 D, §7.7 WORLD stage): a gradient or physical (Preetham) sky with
// a sun disc and toon clouds on a camera-centered dome, and distance plus height fog
// evaluated inside every styled material (scene.fogNode), optionally tinted by the sky in
// the view direction and scaled per part.

import * as THREE from 'three/webgpu';
import { Fn, uniform, vec2, vec3, float, mix, smoothstep, step, select, exp, floor, fract, fwidth, max, abs, acos, cos, pow, clamp, positionWorld, positionView, cameraPosition, fog, mrt, output, mx_fractal_noise_float } from 'three/tsl';

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
		turbidity: uniform( 4 ),
		rayleigh: uniform( 1.5 ),
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

/**
 * Physical sky (Preetham, as three's SkyMesh, evaluated per pixel): Rayleigh and Mie
 * scattering of the sun along the view direction, with haze from the turbidity. The
 * result is scaled into the same range as the gradient sky; the sun disc is drawn by skyColor().
 */
export function physicalSky( u, dir ) {

	const pi = Math.PI;
	const up = vec3( 0, 1, 0 );
	const sun = u.sunDirection;
	// Sun intensity falls off below the horizon (the earth's shadow), as in the original.
	const zenithCos = clamp( sun.dot( up ), - 1, 1 );
	const sunE = float( 1000 ).mul( max( 0, float( 1 ).sub( exp( float( 1.6110731556870734 ).sub( acos( zenithCos ) ).div( 1.5 ).negate() ) ) ) );
	const sunfade = float( 1 ).sub( clamp( float( 1 ).sub( exp( sun.y.mul( 0.1 ) ) ), 0, 1 ) );
	const betaR = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 ).mul( u.rayleigh.sub( sunfade.oneMinus() ) );
	const betaM = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 ).mul( float( 0.434 ).mul( u.turbidity ).mul( 0.2 ).mul( 10E-18 ) ).mul( 0.005 );
	// Optical length along the view ray.
	const zenith = acos( max( 0, dir.dot( up ) ) );
	const inverse = float( 1 ).div( cos( zenith ).add( float( 0.15 ).mul( pow( float( 93.885 ).sub( zenith.mul( 180 / pi ) ), - 1.253 ) ) ) );
	const Fex = exp( betaR.mul( inverse.mul( 8.4E3 ) ).add( betaM.mul( inverse.mul( 1.25E3 ) ) ).negate() );
	// In-scattering.
	const cosTheta = dir.dot( sun );
	const rPhase = float( 3 / ( 16 * pi ) ).mul( pow( cosTheta.mul( 0.5 ).add( 0.5 ), 2 ).add( 1 ) );
	const g = 0.8;
	const mPhase = float( ( 1 - g * g ) / ( 4 * pi ) ).div( pow( float( 1 + g * g ).sub( cosTheta.mul( 2 * g ) ), 1.5 ) );
	const ratio = betaR.mul( rPhase ).add( betaM.mul( mPhase ) ).div( betaR.add( betaM ) );
	const Lin = pow( sunE.mul( ratio ).mul( Fex.oneMinus() ), vec3( 1.5 ) ).mul( mix( vec3( 1 ), pow( sunE.mul( ratio ).mul( Fex ), vec3( 0.5 ) ), clamp( pow( float( 1 ).sub( up.dot( sun ) ), 5 ), 0, 1 ) ) );
	const color = Lin.add( vec3( 0.1 ).mul( Fex ) ).mul( 0.04 ).add( vec3( 0, 0.0003, 0.00075 ) );
	return pow( color, vec3( float( 1 ).div( sunfade.mul( 1.2 ).add( 1.2 ) ) ) ).mul( 0.4 );

}

/** The sky's base color in direction `dir`: the gradient, or the physical sky. */
export function skyBase( u, dir, physical = false ) {

	return physical ? physicalSky( u, dir ) : skyGradient( u, dir );

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

/** Full sky color: gradient (or physical sky) plus a sun disc with a soft halo, and clouds over both. */
export function skyColor( u, dir, physical = false ) {

	const angle = acos( clamp( dir.dot( u.sunDirection ), - 1, 1 ) );
	const r = max( u.sunRadius, 1e-4 );
	const disc = smoothstep( r.mul( u.sunSoftness.mul( - 0.85 ).add( 1 ) ).sub( 1e-4 ), r, angle ).oneMinus().mul( step( 1e-4, u.sunRadius ) );
	const halo = exp( angle.div( r.mul( 3 ) ).negate() ).mul( 0.15 ).mul( step( 1e-4, u.sunRadius ) );
	return cloudLayer( u, dir, skyBase( u, dir, physical ).add( u.sunColor.mul( disc.add( halo ) ) ) );

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

/**
 * scene.fogNode for the styled set. Plain materials set `fog = false`. `amountFor(material)`
 * returns a material's per-part fog amount (a uniform), read when each material is built.
 */
export function createFogNode( u, { physical = false, amountFor = () => null } = {} ) {

	const viewDir = positionWorld.sub( cameraPosition ).normalize();
	const flat = vec3( viewDir.x, max( viewDir.y, 0 ), viewDir.z ).normalize();
	const color = mix( u.fogColor, skyBase( u, flat, physical ), u.fogSkyTint );
	const factor = fogFactor( u, positionView.length(), positionWorld );
	return fog( color, Fn( ( _, builder ) => {

		const amount = amountFor( builder.material );
		return amount ? factor.mul( amount ) : factor;

	} )() );

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
	setSkyModel( styled, u, false );
	styled.mrtNode = mrt( { output, ids: idsNode } );

	// The baseline's solid sky-blue background (design §6.9 "agent default").
	const plain = new THREE.MeshBasicNodeMaterial( { side: THREE.BackSide, depthWrite: false, fog: false, color: new THREE.Color( '#87ceeb' ) } );

	return { styled: dome( styled, layerStyled ), plain: dome( plain, layerPlain ) };

}

/** Points the styled dome's material at the gradient or the physical sky (a structural change). */
export function setSkyModel( material, u, physical ) {

	material.colorNode = Fn( () => skyColor( u, positionWorld.sub( cameraPosition ).normalize(), physical ) )();
	material.needsUpdate = true;

}
