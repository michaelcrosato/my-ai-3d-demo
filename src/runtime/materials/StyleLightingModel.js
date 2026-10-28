// Styled lighting for the style runtime (design §7.8).
//
// Each light contributes a banded ("ramped") amount of light instead of a smooth
// Lambert term. Shadows and attenuation are folded into that amount before banding,
// so a cast shadow lands on the same band as a form shadow instead of being
// multiplied toward black. A tinted fill is added where the key ramp is low, which
// gives hue-shifted shadows. finish() adds the stepped specular's partner, the rim.

import { Color, LightingModel, MeshToonNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import { float, vec3, uniform, normalView, normalWorld, diffuseColor, luminance, smoothstep, max, min, fwidth, select, step, floor, positionViewDirection, mix, Fn, materialEmissive, screenCoordinate } from 'three/tsl';
import { patternCoord, dotMask, lineMask } from './patterns.js';
import { ditherThreshold } from '../post/stage-display.js';

const RECIPROCAL_PI = 1 / Math.PI;

/** Shading models with structural differences (registry `surface.model`). Toon water shades like toon. */
export const MODELS = [ 'pbr', 'toon', 'halfLambert', 'flat', 'toonWater' ];

/**
 * Creates the uniforms a style material reads. Materials of the same part share
 * one set, so moving a slider updates them all without a rebuild.
 */
export function createSurfaceUniforms( {
	threshold = 0.5,
	softness = 0.02,
	shadowTint = '#5866d0',
	tintStrength = 0.5,
} = {} ) {

	return {
		threshold: uniform( threshold ),
		softness: uniform( softness ),
		shadowTint: uniform( new Color( shadowTint ) ),
		tintStrength: uniform( tintStrength ),
		specIntensity: uniform( 0 ),
		specSize: uniform( 0.15 ),
		specSoftness: uniform( 0.02 ),
		rimIntensity: uniform( 0 ),
		rimWidth: uniform( 0.3 ),
		rimSoftness: uniform( 0.05 ),
		rimColor: uniform( new Color( '#ffffff' ) ),
		rimLitSide: uniform( 0 ),
		// Shading patterns (finish()).
		halftoneSize: uniform( 6 ), halftoneAngle: uniform( 45 ), halftoneThreshold: uniform( 0.75 ), halftoneAmount: uniform( 0.85 ), halftoneColor: uniform( new Color( '#1e1d36' ) ),
		hatchSpacing: uniform( 6 ), hatchAngle: uniform( - 45 ), hatchLayers: uniform( 2 ), hatchThreshold: uniform( 0.3 ), hatchAmount: uniform( 0.85 ), hatchColor: uniform( new Color( '#1e1d36' ) ),
		// Base color (factory colorNode): variation, vertical gradient, toon water.
		variationAmount: uniform( 0.1 ), variationScale: uniform( 0.6 ), variationHue: uniform( 0.4 ),
		gradientAmount: uniform( 0.3 ), gradientHeight: uniform( 3 ),
		waterShallow: uniform( new Color( '#45c3e0' ) ), waterDeep: uniform( new Color( '#1c6fd1' ) ), waterDepth: uniform( 4 ), waterBands: uniform( 3 ),
		waterFoam: uniform( 0.35 ), waterPattern: uniform( 0.4 ), waterFoamColor: uniform( new Color( '#ffffff' ) ),
		// Wind (factory positionNode).
		windStrength: uniform( 1 ), windSpeed: uniform( 1 ), windGusts: uniform( 0.3 ),
	};

}

/** Rim (fresnel) term: 0 inside the shape, 1 at the silhouette. */
export const rimTerm = Fn( ( [ width, softness ] ) => {

	const fresnel = normalView.dot( positionViewDirection ).clamp().oneMinus();
	const edge = width.oneMinus();
	const s = max( softness, fwidth( fresnel ).mul( 0.5 ) );
	return smoothstep( edge.sub( s ), edge.add( s ), fresnel );

} );

export class StyleLightingModel extends LightingModel {

	/**
	 * @param {object} surface
	 * @param {string} surface.model - 'toon' | 'halfLambert' | 'flat' (structural)
	 * @param {number} surface.bands - Number of light bands (structural). 1 = continuous.
	 * @param {object} surface.uniforms - From createSurfaceUniforms().
	 * @param {object} [surface.patterns] - { halftone: 'screen'|'world'|null, hatching: …, dither: bool } (structural)
	 */
	constructor( surface ) {

		super();
		this.surface = surface;
		this.keyRamp = null;

	}

	start( builder ) {

		// Strongest ramp value over all lights; drives the shadow fill and lit-side rim.
		this.keyRamp = float( 0 ).toVar( 'styleKeyRamp' );
		super.start( builder );

	}

	ramp( amount ) {

		const bands = this.surface.bands;

		// Dithered shading: the light steps between bands through an ordered (Bayer 4×4) pattern.
		if ( this.surface.patterns?.dither ) {

			const n = Math.max( 1, bands - 1 );
			return floor( amount.mul( n ).add( ditherThreshold( floor( screenCoordinate.xy ), float( 1 ) ) ) ).div( n ).clamp( 0, 1 );

		}

		if ( bands <= 1 ) return amount;

		const { threshold, softness } = this.surface.uniforms;

		// Never sharper than one pixel, so hard bands stay anti-aliased.
		const s = max( softness, fwidth( amount ).mul( 0.5 ) );
		let r = float( 0 );

		for ( let k = 1; k < bands; k ++ ) {

			// threshold 0.5 spaces the bands evenly; it shifts them all.
			const t = min( threshold.mul( 2 * k / bands ), 0.98 );
			r = r.add( smoothstep( t.sub( s ), t.add( s ), amount ) );

		}

		return r.div( bands - 1 );

	}

	facing( NdotL ) {

		switch ( this.surface.model ) {

			case 'halfLambert': return NdotL.mul( 0.5 ).add( 0.5 ).pow( 2 );
			case 'flat': return float( 1 );
			default: return NdotL.max( 0 );

		}

	}

	direct( { lightDirection, lightColor, lightNode, reflectedLight } ) {

		const NdotL = normalView.dot( lightDirection );

		// lightColor already carries shadow and attenuation; the light's base color
		// doesn't. Their luminance ratio is that scalar visibility. A light at zero
		// intensity gets visibility 0 explicitly: its shadow term can be NaN, which
		// would otherwise ramp to fully lit.
		const base = lightNode.baseColorNode || lightNode.colorNode;
		const baseLuminance = luminance( base );
		const visibility = select( baseLuminance.greaterThan( 1e-5 ), luminance( lightColor ).div( baseLuminance ), 0 );

		const r = this.ramp( this.facing( NdotL ).mul( visibility ).clamp() );
		this.keyRamp.assign( max( this.keyRamp, r ) );

		reflectedLight.directDiffuse.addAssign( diffuseColor.rgb.mul( base ).mul( r ).mul( RECIPROCAL_PI ) );

		// Toon specular: a hard-edged Blinn blob, banded like the light.
		const { specIntensity, specSize, specSoftness } = this.surface.uniforms;
		const H = lightDirection.add( positionViewDirection ).normalize();
		const x = normalView.dot( H ).clamp().oneMinus().div( specSize.mul( specSize ).mul( 0.5 ).max( 1e-4 ) );
		const w = max( specSoftness.mul( 4 ), fwidth( x ).mul( 0.5 ) );
		const spec = smoothstep( w.oneMinus(), w.add( 1 ), x ).oneMinus().mul( step( 0, NdotL ) );
		reflectedLight.directSpecular.addAssign( base.mul( visibility ).mul( spec ).mul( specIntensity ) );

	}

	indirect( builder ) {

		const { irradiance, reflectedLight, ambientOcclusion } = builder.context;

		reflectedLight.indirectDiffuse.addAssign( irradiance.mul( diffuseColor.rgb ).mul( RECIPROCAL_PI ) );
		reflectedLight.indirectDiffuse.mulAssign( ambientOcclusion );

	}

	finish( builder ) {

		const u = this.surface.uniforms;
		const fill = diffuseColor.rgb.mul( u.shadowTint ).mul( u.tintStrength ).mul( this.keyRamp.oneMinus() );
		const rim = rimTerm( u.rimWidth, u.rimSoftness ).mul( u.rimIntensity ).mul( mix( 1, this.keyRamp, u.rimLitSide ) );

		const outgoing = builder.context.outgoingLight;
		outgoing.addAssign( vec3( fill ).add( u.rimColor.mul( rim ) ) );

		// Patterns follow the light: dots and hatch lines grow as the key ramp falls.
		const p = this.surface.patterns || {};
		const light = this.keyRamp;

		if ( p.halftone ) {

			const coverage = u.halftoneThreshold.sub( light ).div( max( u.halftoneThreshold, 1e-3 ) ).clamp( 0, 1 );
			const dots = dotMask( patternCoord( p.halftone, u.halftoneSize, u.halftoneAngle ), coverage );
			outgoing.assign( mix( outgoing, u.halftoneColor, dots.mul( u.halftoneAmount ) ) );

		}

		if ( p.hatching ) {

			let lines = float( 0 );
			for ( let k = 0; k < 3; k ++ ) {

				// Layer k appears below a lower light level and crosses the previous one.
				const level = u.hatchThreshold.mul( 1 - k * 0.4 );
				const on = step( float( k ).add( 0.5 ), u.hatchLayers );
				const depth = level.sub( light ).div( max( level, 1e-3 ) ).clamp( 0, 1 );
				const coord = patternCoord( p.hatching, u.hatchSpacing, u.hatchAngle.add( k * 70 ) );
				lines = max( lines, lineMask( coord, depth.mul( 0.22 ).add( 0.08 ).mul( step( light, level ) ) ).mul( on ) );

			}

			outgoing.assign( mix( outgoing, u.hatchColor, lines.mul( u.hatchAmount ) ) );

		}

	}

}

/**
 * Mesh material that uses StyleLightingModel. Inherits color, emissive, fog and
 * lights from MeshToonNodeMaterial.
 */
export class StyleSurfaceMaterial extends MeshToonNodeMaterial {

	constructor( surface, parameters ) {

		super( parameters );
		this.surface = surface;
		this.isStyleSurfaceMaterial = true;

	}

	setupLightingModel() {

		return new StyleLightingModel( this.surface );

	}

}

/**
 * "Stylized PBR": the standard material plus the style's rim light (lit side
 * from the key direction, since PBR has no ramp to read).
 */
export class StyleStandardMaterial extends MeshStandardNodeMaterial {

	constructor( surface, keyDirection, parameters ) {

		super( parameters );
		this.surface = surface;
		this.isStyleSurfaceMaterial = true;

		const u = surface.uniforms;
		const lit = smoothstep( 0, 0.35, normalWorld.dot( keyDirection ) );
		const rim = rimTerm( u.rimWidth, u.rimSoftness ).mul( u.rimIntensity ).mul( mix( 1, lit, u.rimLitSide ) );
		this.emissiveNode = materialEmissive.add( u.rimColor.mul( rim ) );

	}

}
