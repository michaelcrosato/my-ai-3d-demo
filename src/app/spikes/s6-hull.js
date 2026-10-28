// Spike 6: inverted-hull outlines on faceted geometry. Extruding along smoothed
// outline normals should give a closed outline; flat normals should crack.

import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { computeOutlineNormals, createHullMaterial } from '../../runtime/index.js';
import { renderToPixels, luma } from '../gpu/readback.js';
import { SIZE, disposeScene } from './kit.js';

const PIXELS = 3; // intended outline width in this 256 px image

/** Casts 360 rays from the red object's centroid; returns gap share and mean outline width. */
function traceOutline( px ) {

	let cx = 0, cy = 0, n = 0;
	const isRed = ( p ) => p[ 0 ] > 180 && p[ 1 ] < 80 && p[ 2 ] < 80;

	for ( let y = 0; y < px.height; y ++ ) for ( let x = 0; x < px.width; x ++ ) if ( isRed( px.at( x, y ) ) ) { cx += x; cy += y; n ++; }
	cx /= n; cy /= n;

	let gaps = 0, widthSum = 0, covered = 0;

	for ( let a = 0; a < 360; a ++ ) {

		const dx = Math.cos( a * Math.PI / 180 ), dy = Math.sin( a * Math.PI / 180 );
		let t = 0;
		while ( t < px.width && isRed( px.at( cx + dx * t, cy + dy * t ) ) ) t += 0.5;
		const first = px.at( cx + dx * ( t + 0.5 ), cy + dy * ( t + 0.5 ) );

		if ( luma( first ) > 0.6 ) { gaps ++; continue; }

		let w = 0;
		while ( w < 20 && luma( px.at( cx + dx * ( t + w ), cy + dy * ( t + w ) ) ) < 0.4 ) w += 0.5;
		widthSum += w; covered ++;

	}

	return { gapShare: gaps / 360, width: covered ? widthSum / covered : 0, objectPixels: n };

}

export default {
	id: 6,
	key: 'hull-outline',
	title: 'Hull outlines with smoothed outline normals on faceted geometry',

	async run( { renderer, R } ) {

		const thickness = TSL.uniform( PIXELS * 1080 / SIZE ); // px at the 1080p reference
		const black = TSL.uniform( new THREE.Color( 0, 0, 0 ) );

		const shapes = {
			cube: () => new THREE.BoxGeometry( 1, 1, 1 ),
			icosahedron: () => new THREE.IcosahedronGeometry( 0.7, 0 ),
		};

		for ( const [ name, make ] of Object.entries( shapes ) ) {

			const results = {};

			for ( const normalName of [ 'outlineNormal', 'normal' ] ) {

				const scene = new THREE.Scene();
				scene.background = new THREE.Color( 1, 1, 1 );
				const geometry = computeOutlineNormals( make() );
				const object = new THREE.Mesh( geometry, new THREE.MeshBasicNodeMaterial( { color: 0xff0000 } ) );
				object.rotation.set( 0.5, 0.7, 0.1 );
				object.add( new THREE.Mesh( geometry, createHullMaterial( { THREE, TSL, color: black, thickness, normalName } ) ) );
				scene.add( object );

				const camera = new THREE.PerspectiveCamera( 35, 1, 0.1, 20 );
				camera.position.set( 0, 0, 4 );

				const px = await renderToPixels( renderer, SIZE, SIZE, () => renderer.render( scene, camera ) );
				results[ normalName ] = traceOutline( px );
				scene.background = null;
				disposeScene( scene );

			}

			const smooth = results.outlineNormal, flat = results.normal;
			R.check( `${name}: smoothed hull closes the silhouette`, smooth.gapShare <= 0.01, smooth.gapShare, 'gaps ≤ 1% of 360 rays' );
			R.check( `${name}: outline width ≈ ${PIXELS} px`, smooth.width >= PIXELS - 1.5 && smooth.width <= PIXELS + 1.5, smooth.width, `${PIXELS} ± 1.5` );
			R.info( `${name}: flat-normal hull gap share`, flat.gapShare, 'cracks expected; shows why outline normals are needed' );

		}

		R.note( 'Hull width is constant in screen space (clip-space extrusion, specified at 1080p and scaled by output height).' );

	},
};
