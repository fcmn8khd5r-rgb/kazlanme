/**
 * REGISTRE DES IMAGES.
 *
 * gite.json ne contient que des noms de fichiers (« 02-sejour.jpg »).
 * Astro, lui, a besoin d'un import statique pour optimiser une image au build.
 * import.meta.glob avec eager:true fait la jonction : le nom de fichier écrit
 * dans les données retrouve ici son import.
 *
 * Conséquence pratique : pour livrer un vrai client, il suffit de déposer ses
 * photos dans src/assets/gite/ en gardant les mêmes noms. Aucun code à toucher.
 */
import type { ImageMetadata } from 'astro';

const GITE = import.meta.glob<{ default: ImageMetadata }>('../assets/gite/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});
const LIEUX = import.meta.glob<{ default: ImageMetadata }>('../assets/lieux/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});

function index(modules: Record<string, { default: ImageMetadata }>) {
  const map = new Map<string, ImageMetadata>();
  for (const [file, mod] of Object.entries(modules)) {
    map.set(file.split('/').pop()!, mod.default);
  }
  return map;
}

const ALL = new Map([...index(GITE), ...index(LIEUX)]);

/**
 * Retrouve une image par son nom de fichier.
 * Échoue au build plutôt qu'à l'affichage : une image manquante doit casser la
 * compilation, pas laisser un trou dans la page en production.
 */
export function img(name: string): ImageMetadata {
  const found = ALL.get(name);
  if (!found) {
    throw new Error(
      `Image « ${name} » introuvable dans src/assets/gite/ ni src/assets/lieux/. ` +
        `Disponibles : ${[...ALL.keys()].join(', ')}`,
    );
  }
  return found;
}

/** Le rapport largeur/hauteur réel, pour réserver la place avant chargement. */
export function ratio(name: string): number {
  const { width, height } = img(name);
  return width / height;
}
