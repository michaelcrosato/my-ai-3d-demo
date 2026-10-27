// Part guessing for imported scenes (design §6.1 "Import your own scene"). Pure: it
// works on plain descriptors, so it runs anywhere (the tool, convertScene(), tests).
//
// Order: (1) an explicit tag (userData.part, glTF extras.part), (2) name keywords of the
// mesh, its material, then its ancestors, nearest first, (3) shape: emissive → vfx, the
// largest low flat mesh → terrain (blue → water). Everything else is a prop.

import { PARTS } from '../registry/index.js';

/** Keywords per part, in priority order: the first part with a match wins for a name. */
export const PART_KEYWORDS = [
	[ 'hero', [ 'player', 'hero', 'protagonist', 'avatar' ] ],
	[ 'water', [ 'water', 'sea', 'ocean', 'lake', 'river', 'pond', 'wave', 'waves' ] ],
	[ 'sky', [ 'sky', 'skybox', 'skydome', 'cloud', 'sun', 'moon' ] ],
	[ 'foliage', [ 'tree', 'leaf', 'leaves', 'bush', 'plant', 'grass', 'flower', 'foliage', 'hedge', 'pine', 'palm', 'fern', 'vine', 'branch', 'canopy', 'shrub', 'trunk' ] ],
	[ 'characters', [ 'char', 'character', 'npc', 'enemy', 'body', 'head', 'human', 'person', 'people', 'animal', 'goose', 'mannequin', 'robot', 'knight', 'monster', 'creature', 'face', 'hair', 'arm', 'leg', 'hand', 'torso', 'eye', 'skin' ] ],
	[ 'architecture', [ 'wall', 'roof', 'house', 'building', 'door', 'window', 'tower', 'bridge', 'column', 'pillar', 'stair', 'stairs', 'arch', 'castle', 'temple', 'shrine', 'brick', 'chimney', 'balcony', 'facade', 'floor', 'ceiling' ] ],
	[ 'terrain', [ 'ground', 'terrain', 'road', 'street', 'land', 'landscape', 'cliff', 'path', 'sand', 'dirt', 'soil', 'pavement', 'island', 'mountain', 'hill', 'rock', 'rocks' ] ],
	[ 'vfx', [ 'fire', 'flame', 'glow', 'magic', 'particle', 'particles', 'fx', 'vfx', 'emissive', 'neon', 'spark', 'laser', 'hologram' ] ],
];

/** Splits "Tree_Leaves.001" or "houseRoofLeft" into lowercase words. */
export function tokenize( name = '' ) {

	return String( name )
		.replace( /([a-z])([A-Z])/g, '$1 $2' )
		.toLowerCase()
		.split( /[^a-z]+/ )
		.filter( Boolean );

}

function keywordPart( name ) {

	const tokens = tokenize( name );
	if ( ! tokens.length ) return null;

	for ( const [ part, words ] of PART_KEYWORDS ) {

		for ( const w of words ) {

			if ( tokens.some( ( t ) => t === w || t === `${w}s` || t === `${w}es` ) ) return { part, reason: `name "${w}"` };

		}

	}

	return null;

}

const explicitPart = ( userData = {} ) => {

	const p = userData.part ?? userData.stylePart ?? userData.style?.part;
	return PARTS.includes( p ) ? p : null;

};

/**
 * @param {Array<object>} items - one per mesh: { name, materialName, ancestors: string[],
 *   userData, emissive: number (strength), color: [r, g, b] (0–1), box: { min: [x,y,z], max: [x,y,z] } }
 * @returns {Array<{part: string, reason: string}>}
 */
export function guessParts( items ) {

	const out = items.map( ( it ) => {

		const tagged = explicitPart( it.userData );
		if ( tagged ) return { part: tagged, reason: 'tag' };
		for ( const name of [ it.name, it.materialName, ...( it.ancestors || [] ) ] ) {

			const k = keywordPart( name );
			if ( k ) return k;

		}

		if ( ( it.emissive || 0 ) > 0.15 ) return { part: 'vfx', reason: 'emissive material' };
		return null;

	} );

	// Shape heuristic: the largest roughly horizontal mesh near the bottom is the ground.
	if ( ! out.some( ( g ) => g && g.part === 'terrain' ) ) {

		const boxes = items.map( ( it ) => it.box ).filter( Boolean );
		if ( boxes.length ) {

			const minY = Math.min( ...boxes.map( ( b ) => b.min[ 1 ] ) ), maxY = Math.max( ...boxes.map( ( b ) => b.max[ 1 ] ) );
			const height = Math.max( 1e-6, maxY - minY );
			let best = - 1, bestArea = 0;

			items.forEach( ( it, i ) => {

				if ( out[ i ] || ! it.box ) return;
				const [ sx, sy, sz ] = it.box.max.map( ( v, k ) => v - it.box.min[ k ] );
				const flat = sy < 0.2 * Math.max( sx, sz );
				const low = it.box.min[ 1 ] <= minY + height * 0.15;
				const area = sx * sz;
				if ( flat && low && area > bestArea ) { best = i; bestArea = area; }

			} );

			if ( best >= 0 ) {

				const [ r, g, b ] = items[ best ].color || [ 0.5, 0.5, 0.5 ];
				out[ best ] = b > r * 1.25 && b > g * 1.05 ? { part: 'water', reason: 'largest flat surface, blue' } : { part: 'terrain', reason: 'largest flat surface at the bottom' };

			}

		}

	}

	return out.map( ( g ) => g || { part: 'props', reason: 'default' } );

}
