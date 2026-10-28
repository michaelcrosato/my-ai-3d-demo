// stylelab-kit.js (design §6.12): the procedural asset kit as an ES module that imports
// only `three`. Shapes, buildings, nature, characters, creatures and props, with part tags
// (`userData.style`), seeded randomness and complexity tiers, plus the Style Lab scenes
// as worked examples of building a level in code.

export * from '../scenes/kit/index.js';
export { SCENES as scenes, sceneById, buildScene, DENSITY } from '../scenes/index.js';
