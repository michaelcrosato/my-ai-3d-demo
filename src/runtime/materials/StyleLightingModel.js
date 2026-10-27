// Cel-shading lighting model for the style runtime.
//
// Each light contributes a banded ("ramped") amount of light instead of a smooth
// Lambert term. Shadows and attenuation are folded into that amount before banding,
// so a cast shadow lands on the same band as a form shadow instead of being
// multiplied toward black. A tinted fill is added where the key ramp is low, which
// gives hue-shifted shadows.

import { Color, LightingModel, MeshToonNodeMaterial } from 'three/webgpu';
import { float, vec3, uniform, normalView, diffuseColor, luminance, smoothstep, max, fwidth, select } from 'three/tsl';

const RECIPROCAL_PI = 1 / Math.PI;

/**
 * Creates the uniforms a style material reads. Materials of the same part share
 * one set, so moving a slider updates them all without a rebuild.
 */
export function createSurfaceUniforms( {
	softness = 0.02,
	shadowTint = '#5866d0',
	tintStrength = 0.5,
} = {} ) {

	return {
		softness: uniform( softness ),
		shadowTint: uniform( new Color( shadowTint ) ),
		tintStrength: uniform( tintStrength ),
	};

}

export class StyleLightingModel extends LightingModel {

	/**
	 * @param {object} surface
	 * @param {number} surface.bands - Number of light bands (structural). 1 = continuous.
	 * @param {boolean} surface.wrap - Half-Lambert wrap lighting (structural).
	 * @param {object} surface.uniforms - From createSurfaceUniforms().
	 */
	constructor( surface ) {

		super();
		this.surface = surface;
		this.keyRamp = null;

	}

	start( builder ) {

		// Strongest ramp value over all lights; drives the shadow fill in finish().
		this.keyRamp = float( 0 ).toVar( 'styleKeyRamp' );
		super.start( builder );

	}

	ramp( amount ) {

		const bands = this.surface.bands;
		if ( bands <= 1 ) return amount;

		// Never sharper than one pixel, so hard bands stay anti-aliased.
		const s = max( this.surface.uniforms.softness, fwidth( amount ).mul( 0.5 ) );
		let r = float( 0 );

		for ( let k = 1; k < bands; k ++ ) {

			const t = k / bands;
			r = r.add( smoothstep( s.negate().add( t ), s.add( t ), amount ) );

		}

		return r.div( bands - 1 );

	}

	direct( { lightDirection, lightColor, lightNode, reflectedLight } ) {

		const NdotL = normalView.dot( lightDirection );
		const facing = this.surface.wrap ? NdotL.mul( 0.5 ).add( 0.5 ).pow( 2 ) : NdotL.max( 0 );

		// lightColor already carries shadow and attenuation; the light's base color
		// doesn't. Their luminance ratio is that scalar visibility. A light at zero
		// intensity gets visibility 0 explicitly: its shadow term can be NaN, which
		// would otherwise ramp to fully lit.
		const base = lightNode.baseColorNode || lightNode.colorNode;
		const baseLuminance = luminance( base );
		const visibility = select( baseLuminance.greaterThan( 1e-5 ), luminance( lightColor ).div( baseLuminance ), 0 );

		const r = this.ramp( facing.mul( visibility ).clamp() );
		this.keyRamp.assign( max( this.keyRamp, r ) );

		reflectedLight.directDiffuse.addAssign( diffuseColor.rgb.mul( base ).mul( r ).mul( RECIPROCAL_PI ) );

	}

	indirect( builder ) {

		const { irradiance, reflectedLight, ambientOcclusion } = builder.context;

		reflectedLight.indirectDiffuse.addAssign( irradiance.mul( diffuseColor.rgb ).mul( RECIPROCAL_PI ) );
		reflectedLight.indirectDiffuse.mulAssign( ambientOcclusion );

	}

	finish( builder ) {

		const { shadowTint, tintStrength } = this.surface.uniforms;
		const fill = diffuseColor.rgb.mul( shadowTint ).mul( tintStrength ).mul( this.keyRamp.oneMinus() );

		builder.context.outgoingLight.addAssign( vec3( fill ) );

	}

}

/**
 * Mesh material that uses StyleLightingModel. Inherits color, emissive and
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
