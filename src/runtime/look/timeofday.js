// Time of day (design §6.4 A): one clock drives the key light, the sky, the ambient
// light and the fog color, so every light color stays consistent with every other.
// Keyframes are art-directed values, interpolated per hour (colors in OKLab).

import { mixHex } from '../color/color.js';

// hour, sun elevation (°), key color, key intensity, zenith, horizon, ambient sky, ambient ground, ambient intensity, sun disc brightness
const KEYS = [
	[ 4, 25, '#8fa4ff', 0.45, '#0b1030', '#28305a', '#3a4a8a', '#1a1a26', 0.45, 1.5 ],
	[ 6, 4, '#ff9a7a', 1.6, '#3b4f9a', '#ffb08a', '#8a8ad0', '#4a3a3a', 0.55, 5 ],
	[ 7.5, 15, '#ffc890', 2.6, '#4a78c8', '#ffd6b0', '#9ab4e8', '#6a5a4a', 0.6, 6 ],
	[ 10, 45, '#fff0dc', 3, '#3b82d8', '#c8e2ff', '#a8ccff', '#6b6b5a', 0.65, 6 ],
	[ 13, 65, '#fffaf2', 3.2, '#2f7ae0', '#bfe0ff', '#b0d0ff', '#707060', 0.7, 6 ],
	[ 16, 38, '#fff0d6', 3, '#3a7ad0', '#d6e6ff', '#a0c0f0', '#706050', 0.62, 6 ],
	[ 17.5, 12, '#ffb066', 3.6, '#3b4c99', '#ff9d5c', '#6e7fd6', '#8b5b3c', 0.5, 8 ],
	[ 18.5, 3, '#ff7a48', 2.4, '#2b2a5e', '#ff7a5c', '#6a5a9a', '#3a2a30', 0.45, 8 ],
	[ 19.5, 6, '#6d7fd8', 0.6, '#1a2050', '#4a5aa0', '#5060b0', '#202030', 0.55, 1.5 ],
	[ 21, 30, '#9fb4ff', 0.55, '#070b20', '#1c2448', '#3a4a8a', '#141420', 0.45, 1.5 ],
	[ 22, 30, '#9fb4ff', 0.5, '#070b20', '#1c2448', '#3a4a8a', '#141420', 0.42, 1.5 ],
];

/**
 * Lighting, sky and fog values for an hour (4–22). `azimuth` is the look's key
 * direction; the sun swings 10° per hour around it during the day.
 * @returns {object} a sparse parameter map
 */
export function timeOfDay( hour, azimuth = 45 ) {

	const h = Math.min( KEYS[ KEYS.length - 1 ][ 0 ], Math.max( KEYS[ 0 ][ 0 ], hour ) );
	let i = 0;
	while ( i < KEYS.length - 2 && KEYS[ i + 1 ][ 0 ] < h ) i ++;
	const a = KEYS[ i ], b = KEYS[ i + 1 ];
	const t = ( h - a[ 0 ] ) / ( b[ 0 ] - a[ 0 ] );
	const num = ( k ) => a[ k ] + ( b[ k ] - a[ k ] ) * t;
	const col = ( k ) => mixHex( a[ k ], b[ k ], t );
	const day = h >= 6 && h <= 19;
	const swing = day ? ( h - 12 ) * 10 : 0;

	return {
		'lighting.key.elevation': Math.round( num( 1 ) * 10 ) / 10,
		'lighting.key.azimuth': ( ( azimuth + swing + 540 ) % 360 ) - 180,
		'lighting.key.color': col( 2 ),
		'lighting.key.intensity': Math.round( num( 3 ) * 100 ) / 100,
		'atmosphere.sky.zenith': col( 4 ),
		'atmosphere.sky.horizon': col( 5 ),
		'atmosphere.sky.ground': col( 5 ),
		'atmosphere.fog.color': col( 5 ),
		'lighting.ambient.sky': col( 6 ),
		'lighting.ambient.ground': col( 7 ),
		'lighting.ambient.intensity': Math.round( num( 8 ) * 100 ) / 100,
		'atmosphere.sky.sunIntensity': Math.round( num( 9 ) * 10 ) / 10,
	};

}
