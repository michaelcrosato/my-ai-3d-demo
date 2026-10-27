// Spike 1: StyleLightingModel cel ramp with a shadowed sun and a point light.
// Questions: does a custom LightingModel work in r182? Do N bands give N flat
// levels? Does a cast shadow land on the form-shadow band instead of going black?

import * as THREE from 'three/webgpu';
import { StyleSurfaceMaterial, createSurfaceUniforms } from '../../runtime/index.js';
import { renderToPixels, luma } from '../gpu/readback.js';
import { SIZE, topDownCamera, frontCamera, groundPlane, disposeScene, countClusters, transitionWidth, regionLuma } from './kit.js';

function toon( bands, color = 0xcccccc ) {

	return new StyleSurfaceMaterial( { bands, wrap: false, uniforms: createSurfaceUniforms( { softness: 0.01, tintStrength: 0.35 } ) }, { color } );

}

export default {
	id: 1,
	key: 'cel-ramp',
	title: 'Cel ramp lighting model (shadowed sun + point light)',

	async run( { renderer, R } ) {

		// A. Banding on a sphere: N bands should give N flat color levels.
		for ( const bands of [ 2, 3 ] ) {

			const scene = new THREE.Scene();
			scene.add( new THREE.AmbientLight( 0xffffff, 0.6 ) );
			const sun = new THREE.DirectionalLight( 0xffffff, 3 );
			sun.position.set( 5, 0, 2 );
			scene.add( sun );
			scene.add( new THREE.Mesh( new THREE.SphereGeometry( 1, 96, 64 ), toon( bands ) ) );

			const camera = frontCamera( 1.1 );
			const px = await renderToPixels( renderer, SIZE, SIZE, () => renderer.render( scene, camera ) );
			const c = SIZE / 2, r = ( SIZE / 2 ) * ( 0.95 / 1.1 );
			const clusters = countClusters( px, ( x, y ) => ( x - c ) ** 2 + ( y - c ) ** 2 < r * r );
			R.check( `${bands} bands → ${bands} flat levels on a sphere`, clusters === bands, clusters, `${bands}` );
			disposeScene( scene );

		}

		// B. Cast shadow from a wall just outside the view: right half shadowed.
		const shadowScene = ( groundMaterial, sunIntensity ) => {

			const scene = new THREE.Scene();
			scene.add( new THREE.AmbientLight( 0xffffff, 0.6 ) );
			const sun = new THREE.DirectionalLight( 0xffffff, sunIntensity );
			sun.position.set( 5, 5, 0 );
			sun.castShadow = true;
			sun.shadow.mapSize.set( 1024, 1024 );
			Object.assign( sun.shadow.camera, { left: - 3, right: 3, top: 3, bottom: - 3, near: 0.1, far: 20 } );
			sun.shadow.bias = - 0.001;
			scene.add( sun );
			scene.add( groundPlane( groundMaterial ) );
			const wall = new THREE.Mesh( new THREE.BoxGeometry( 0.2, 1.1, 4 ), new THREE.MeshStandardNodeMaterial() );
			wall.position.set( 1.2, 0.55, 0 );
			wall.castShadow = true;
			scene.add( wall );
			return scene;

		};

		const camera = topDownCamera();
		const render = async ( scene ) => {

			const px = await renderToPixels( renderer, SIZE, SIZE, () => renderer.render( scene, camera ) );
			disposeScene( scene );
			return px;

		};

		const lit = await render( shadowScene( toon( 2 ), 3 ) );
		const ambientOnly = await render( shadowScene( toon( 2 ), 0 ) );
		const standard = await render( shadowScene( new THREE.MeshStandardNodeMaterial( { color: 0xcccccc } ), 3 ) );

		const litHalf = regionLuma( lit, 0.05, 0.1, 0.4, 0.9 );
		const shadowHalf = regionLuma( lit, 0.6, 0.1, 0.95, 0.9 );
		const formShadow = regionLuma( ambientOnly, 0.6, 0.1, 0.95, 0.9 );

		R.check( 'cast shadow darker than lit ground', litHalf.mean - shadowHalf.mean > 0.1, [ litHalf.mean, shadowHalf.mean ], 'Δ > 0.1' );
		R.check( 'cast shadow equals form-shadow band (not darker)', Math.abs( shadowHalf.mean - formShadow.mean ) < 0.02, [ shadowHalf.mean, formShadow.mean ], '|Δ| < 0.02' );
		R.check( 'shadow region is flat (one band)', shadowHalf.std < 0.01, shadowHalf.std, 'std < 0.01' );

		const mid = SIZE / 2;
		const toonEdge = transitionWidth( lit, mid, shadowHalf.mean + 0.02, litHalf.mean - 0.02 );
		const stdLit = regionLuma( standard, 0.05, 0.1, 0.4, 0.9 ).mean;
		const stdShadow = regionLuma( standard, 0.6, 0.1, 0.95, 0.9 ).mean;
		const standardEdge = transitionWidth( standard, mid, stdShadow + 0.02, stdLit - 0.02 );
		R.check( 'toon shadow edge no softer than standard PCF edge', toonEdge <= Math.max( 3, standardEdge ), [ toonEdge, standardEdge ], 'toon ≤ max(3, standard) px' );

		// C. Point light pool on the ground: banded rings, bright center.
		const pointScene = ( material ) => {

			const scene = new THREE.Scene();
			scene.add( new THREE.AmbientLight( 0xffffff, 0.3 ) );
			const point = new THREE.PointLight( 0xffffff, 3, 0, 2 );
			point.position.set( 0, 0.5, 0 );
			scene.add( point );
			scene.add( groundPlane( material ) );
			return scene;

		};

		const pool = await render( pointScene( toon( 3 ) ) );
		const poolStandard = await render( pointScene( new THREE.MeshStandardNodeMaterial( { color: 0xcccccc } ) ) );
		const centre = luma( pool.atUV( 0.5, 0.5 ) ), corner = luma( pool.atUV( 0.02, 0.02 ) );
		R.check( 'point light lights the ground (center brighter than corner)', centre - corner > 0.1, [ centre, corner ], 'Δ > 0.1' );
		const rings = countClusters( pool, () => true, 0.01 );
		R.check( 'point light falloff is banded (2–4 levels)', rings >= 2 && rings <= 4, rings, '2–4' );
		R.info( 'standard material levels for the same light', countClusters( poolStandard, () => true, 0.01 ), 'continuous falloff, for comparison' );

		R.note( 'Shadow and attenuation are read as luminance(lightColor) / luminance(lightNode.baseColorNode) inside direct(), so they are banded with N·L instead of multiplied afterwards.' );

	},
};
