// M0 API spikes (design §9, M0). Each spike runs offscreen with the renderer
// sized to SIZE × SIZE, so it never disturbs what is on screen.

import { withRendererSize } from '../gpu/readback.js';
import { SpikeReport, SIZE } from './kit.js';
import s1 from './s1-cel.js';
import s2 from './s2-mrt.js';
import s3 from './s3-render-sets.js';
import s4 from './s4-output-transform.js';
import s5 from './s5-rebuild.js';
import s6 from './s6-hull.js';
import s7 from './s7-timestamps.js';
import s8 from './s8-rapier.js';

export const SPIKES = [ s1, s2, s3, s4, s5, s6, s7, s8 ];

/**
 * @param {object} o
 * @param {number[]} [o.ids] - spike ids to run (default: all)
 * @param {(r: object) => void} [o.onResult]
 * @returns {Promise<object[]>} spike results
 */
export async function runSpikes( { renderer, ids = null, onResult = () => {}, options = {} } ) {

	const results = [];

	for ( const spike of SPIKES ) {

		if ( ids && ! ids.includes( spike.id ) ) continue;

		const report = new SpikeReport( spike );
		const t0 = performance.now();

		try {

			await withRendererSize( renderer, SIZE, SIZE, () => spike.run( { renderer, R: report, options } ) );

		} catch ( e ) {

			report.error( e );

		}

		report.ms = performance.now() - t0;
		const json = report.toJSON();
		results.push( json );
		onResult( json );

	}

	return results;

}
