// Human checks for each milestone (design §6.14). Later milestones append here.
// `actions` name panel handlers; each button is labeled with what it does (panel.js ACTION_LABELS).

export const CHECKS = [
	{
		id: 'M0-01',
		title: 'Backend badge shows WebGPU',
		steps: [ 'Open the page normally (no ?backend= in the URL).', 'Look at the badge next to the title.' ],
		expected: 'It reads "WebGPU". If it reads "WebGL2", note your browser and version.',
	},
	{
		id: 'M0-02',
		title: 'Works when opened from disk',
		steps: [ 'Download dist/style-lab.html from the repo.', 'Double-click it (opens as file://).' ],
		expected: 'The same scene renders and the Environment tab shows protocol "file:".',
	},
	{
		id: 'M0-03',
		title: 'No errors while orbiting',
		steps: [ 'Drag to orbit and scroll to zoom for about 10 seconds.', 'Open the Environment tab.' ],
		expected: 'Errors (0). Warnings are fine; paste them anyway.',
	},
	{
		id: 'M0-04',
		title: 'Spikes pass on your GPU',
		steps: [ 'Press "Run all spikes" below (takes a few seconds). The Spikes tab shows the details.' ],
		expected: 'Every spike is "go" or "go-fallback". Any "no-go" or "error" is exactly what I need to see.',
		actions: [ 'runSpikes' ],
	},
	{
		id: 'M0-05',
		title: 'Forced WebGL2 also works',
		steps: [ 'Press "Reload with WebGL2" below (adds ?backend=webgl to the URL).', 'Press "Run all spikes" again. The report keeps the results from both backends.' ],
		expected: 'Badge reads "WebGL2", the scene renders, spikes are go or go-fallback.',
		actions: [ 'reloadWebGL', 'runSpikes' ],
	},
	{
		id: 'M0-06',
		title: 'Resize and zoom stay sharp',
		steps: [ 'Resize the window, and try browser zoom (Ctrl/⌘ + and -).' ],
		expected: 'No stretching or blur; shapes stay crisp and correctly proportioned.',
	},
];
