// Undo / redo (design §6.8): a 100-step ring of state snapshots. Consecutive edits of
// the same control within a short time merge into one step (one per slider drag).

export function createHistory( { limit = 100, mergeMs = 600 } = {} ) {

	const past = [];
	const future = [];
	let lastKey = null, lastTime = 0;

	return {
		/** Records the state before an edit. `key` groups repeated edits (e.g. a slider id). */
		push( snapshot, key = null ) {

			const now = performance.now();
			if ( key && key === lastKey && now - lastTime < mergeMs && past.length ) { lastTime = now; return; }
			past.push( snapshot );
			if ( past.length > limit ) past.shift();
			future.length = 0;
			lastKey = key; lastTime = now;

		},
		undo( current ) {

			if ( ! past.length ) return null;
			future.push( current );
			lastKey = null;
			return past.pop();

		},
		redo( current ) {

			if ( ! future.length ) return null;
			past.push( current );
			lastKey = null;
			return future.pop();

		},
		get canUndo() { return past.length > 0; },
		get canRedo() { return future.length > 0; },
		clear() { past.length = 0; future.length = 0; },
	};

}
