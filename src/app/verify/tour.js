// The guided tour (design §6.14, M9): every Verify check, in learning-path order. Each
// section teaches one idea, links the lesson that goes deeper, and lists its checks. Sign-off
// checks (the reports I need from you) are marked apart from optional tour steps, so a new
// user can take the whole tour and a tester can stop at the sign-offs.

export const TOUR = [
	{
		id: 'welcome', title: 'Welcome',
		intro: 'How the tool is laid out and where help lives. Two minutes.',
		checks: [ 'M9-01' ],
	},
	{
		id: 'basics', title: 'Does it run on your machine?',
		intro: 'The renderer, the error log and the spikes. Everything else builds on these.',
		checks: [ 'M0-01', 'M0-03', 'M0-06', 'M0-04', 'M0-05', 'M0-02' ],
	},
	{
		id: 'compare', title: 'Looks and the plain baseline',
		intro: 'The core loop: apply a look, then compare it with what an agent makes by default.',
		lesson: 'L1',
		checks: [ 'M1-01', 'M1-02', 'M1-03', 'M1-06', 'M1-07', 'M1-08' ],
	},
	{
		id: 'lines', title: 'Shapes, lines and light',
		intro: 'What makes a stylized image read: clean bands of light and steady outlines.',
		lesson: 'L2',
		checks: [ 'M1-05', 'M1-04', 'M3-11', 'M3-13' ],
	},
	{
		id: 'scenes', title: 'Scenes, shots and your own models',
		intro: 'Eleven genre scenes and a physics toybox to judge a style on, each with its genre\'s camera, plus your own .glb files.',
		checks: [ 'M2-01', 'M2-06', 'M2-02', 'M2-04', 'M2-05', 'M2-03', 'M10-02', 'M10-11' ],
	},
	{
		id: 'effects', title: 'Effects: light, lens, grade, retro and media',
		intro: 'The building blocks looks are made of, one at a time.',
		lesson: 'L4',
		checks: [ 'M3-01', 'M3-05', 'M3-07', 'M3-04', 'M3-06', 'M3-02', 'M3-03', 'M3-09', 'M3-10', 'M3-12', 'M3-08', 'M10-01', 'M10-03', 'M10-04', 'M10-05' ],
	},
	{
		id: 'mixing', title: 'Make it yours: mixing and parts',
		intro: 'Combine looks module by module, style parts of the scene differently, and keep the result coherent.',
		lesson: 'L8',
		checks: [ 'M4-05', 'M4-06', 'M4-01', 'M4-07', 'M4-02', 'M4-09', 'M4-03', 'M4-08', 'M4-04', 'M10-06', 'M10-07' ],
	},
	{
		id: 'play', title: 'Play it',
		intro: 'A style has to survive motion: walk the scenes, throw things, cross look zones.',
		lesson: 'L9',
		checks: [ 'M5-01', 'M5-02', 'M5-03', 'M5-04', 'M5-05', 'M5-06', 'M5-07', 'M10-09' ],
	},
	{
		id: 'eye', title: 'Train your eye',
		intro: 'Lessons, designer views and the critic: the reasons behind what looks good.',
		lesson: 'L6',
		checks: [ 'M8-01', 'M8-02', 'M8-03', 'M8-04', 'M8-05' ],
	},
	{
		id: 'budget', title: 'Budgets',
		intro: 'What a look costs, and how to make it fit a phone.',
		lesson: 'L10',
		checks: [ 'M7-01', 'M7-03', 'M7-02' ],
	},
	{
		id: 'handoff', title: 'Hand it to an agent',
		intro: 'The brief, the runtime and the files that carry your style into a game.',
		lesson: 'L11',
		checks: [ 'M6-04', 'M6-02', 'M6-05', 'M6-06', 'M6-01', 'M6-03', 'M10-08', 'M10-10' ],
	},
	{
		id: 'anywhere', title: 'On other screens',
		intro: 'Phones, tablets and small windows.',
		checks: [ 'M9-02', 'M9-03' ],
	},
];

/** The tour section a check belongs to. */
export const sectionOf = ( id ) => TOUR.find( ( s ) => s.checks.includes( id ) );
