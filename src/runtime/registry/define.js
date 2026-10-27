// Helpers for registry entries (design §7.5). Every parameter and effect toggle is
// one plain-data entry; the Tune panel, looks, briefs and Learn cards read them.

/** Cost classes of the static rubric (§6.11). fpe = fullscreen-pass equivalents. */
export const CHEAP = { class: 'cheap', fpe: 0.1 };
export const MEDIUM = { class: 'medium', fpe: 1 };
export const HEAVY = { class: 'heavy', fpe: 3 };

const MIX_BY_TYPE = { float: 'lerp', int: 'lerp', angle: 'angle', color: 'oklab', bool: 'step', enum: 'step', palette: 'step' };

/**
 * Fills in the fields every entry shares, so module files stay short.
 * `neutral` defaults to `default` (the parameter has no "invisible" value of its own).
 */
export function param( module, e ) {

	return {
		module,
		scope: 'global',
		structural: false,
		requires: [],
		tags: [],
		cost: CHEAP,
		mix: MIX_BY_TYPE[ e.type ],
		neutral: e.default,
		...e,
	};

}
