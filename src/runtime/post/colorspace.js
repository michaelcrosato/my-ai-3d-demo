// Shader-side color helpers shared by post effects: display sRGB ↔ OKLab, so palette
// matching and hue selection happen in a perceptual space (design §6.4 F, H).

import { vec3, dot, cbrt, sRGBTransferEOTF } from 'three/tsl';

/** Linear sRGB → OKLab (Björn Ottosson's matrices). */
export function linearToOklab( c ) {

	const l = cbrt( dot( c, vec3( 0.4122214708, 0.5363325363, 0.0514459929 ) ) );
	const m = cbrt( dot( c, vec3( 0.2119034982, 0.6806995451, 0.1073969566 ) ) );
	const s = cbrt( dot( c, vec3( 0.0883024619, 0.2817188376, 0.6299787005 ) ) );
	const lms = vec3( l, m, s );
	return vec3(
		dot( lms, vec3( 0.2104542553, 0.7936177850, - 0.0040720468 ) ),
		dot( lms, vec3( 1.9779984951, - 2.4285922050, 0.4505937099 ) ),
		dot( lms, vec3( 0.0259040371, 0.7827717662, - 0.8086757660 ) ),
	);

}

/** Display-referred sRGB → OKLab. */
export const displayToOklab = ( c ) => linearToOklab( sRGBTransferEOTF( c.max( 0 ) ) );
