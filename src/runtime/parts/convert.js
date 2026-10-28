// Converting existing meshes for the style runtime (design §6.12 retrofit, §6.1 import):
// guess each mesh's part and record its material as `userData.style`, keeping colors,
// textures and vertex colors. Shared by the .glb importer and `convertScene()`.

import * as THREE from 'three/webgpu';
import { guessParts } from './guess.js';

const firstMaterial = ( m ) => ( Array.isArray( m.material ) ? m.material[ 0 ] : m.material ) || {};
const emissiveStrength = ( mat ) => mat.emissive ? Math.max( mat.emissive.r, mat.emissive.g, mat.emissive.b ) * ( mat.emissiveIntensity ?? 1 ) : 0;

/** A plain descriptor of a mesh for guessParts(). `stop` is the ancestor where names stop counting. */
export function describeMesh( m, stop = null ) {

	const mat = firstMaterial( m );
	const box = new THREE.Box3().setFromObject( m );
	const ancestors = [];
	for ( let p = m.parent; p && p !== stop; p = p.parent ) if ( p.name ) ancestors.push( p.name );
	return {
		name: m.name, materialName: mat.name, ancestors, userData: { ...mat.userData?.stylelab, ...m.userData },
		emissive: emissiveStrength( mat ), color: mat.color ? [ mat.color.r, mat.color.g, mat.color.b ] : null,
		box: { min: box.min.toArray(), max: box.max.toArray() },
	};

}

/** `userData.style` for a mesh from its material: what the style factory needs. */
export function styleFromMaterial( m, part ) {

	const mat = firstMaterial( m );
	const em = emissiveStrength( mat );
	const tagged = mat.userData?.stylelab || {};
	return {
		part,
		color: tagged.color || ( mat.color ? `#${mat.color.getHexString()}` : '#cccccc' ),
		roughness: tagged.roughness ?? mat.roughness ?? 0.8,
		metalness: tagged.metalness ?? mat.metalness ?? 0,
		emissive: tagged.emissive ?? ( em > 0.01 ? `#${mat.emissive.getHexString()}` : null ),
		emissiveIntensity: tagged.emissiveIntensity ?? mat.emissiveIntensity ?? 1,
		opacity: mat.transparent ? mat.opacity ?? 1 : 1,
		doubleSided: mat.side === THREE.DoubleSide,
		map: mat.map || null,
		vertexColors: !! ( mat.vertexColors && m.geometry.getAttribute( 'color' ) ),
		role: tagged.role,
	};

}

/**
 * Tags every untagged mesh under `root` with `userData.style` (guessing parts unless
 * `guess` is false, when untagged meshes become props). Returns the meshes it tagged and
 * the guesses, with reasons.
 */
export function tagMeshes( root, { guess = true, stop = root.parent } = {} ) {

	root.updateMatrixWorld( true );
	const meshes = [];
	root.traverse( ( o ) => { if ( o.isMesh && ! o.userData.style && ! o.userData.stylelabTwin ) meshes.push( o ); } );
	const guesses = guess ? guessParts( meshes.map( ( m ) => describeMesh( m, stop ) ) ) : meshes.map( ( m ) => ( { part: m.userData.part || firstMaterial( m ).userData?.stylelab?.part || 'props', reason: 'tag or default' } ) );
	meshes.forEach( ( m, i ) => {

		if ( ! m.geometry.getAttribute( 'normal' ) ) m.geometry.computeVertexNormals();
		m.userData.style = styleFromMaterial( m, guesses[ i ].part );
		m.userData.guess = guesses[ i ];

	} );
	return { meshes, guesses };

}
