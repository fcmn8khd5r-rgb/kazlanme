/**
 * Fabrique de jeux de sources.
 *
 * Le composant <Picture> d'Astro ne sait pas faire de direction artistique :
 * il sert le même cadrage à tout le monde. Pour donner une image recadrée en
 * portrait aux écrans portrait, il faut écrire le <picture> à la main — donc
 * fabriquer soi-même les attributs srcset. C'est ce que fait ce module.
 *
 * Largeurs volontairement plafonnées à 1600 px : au-delà, le poids grimpe vite
 * pour un gain invisible, et un téléphone n'a aucune raison de télécharger une
 * image de 2400 px.
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export const WIDTHS = [400, 800, 1200, 1600] as const;
export type Format = 'avif' | 'webp' | 'jpeg';

/** Les formats servis, du plus efficace au plus universel. */
export const FORMATS: Format[] = ['avif', 'webp', 'jpeg'];

const MIME: Record<Format, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
};

export interface SourceSet {
  type: string;
  srcset: string;
}

/**
 * Un srcset par format, pour une image donnée.
 * Les largeurs supérieures à la taille réelle du fichier sont écartées :
 * agrandir une photo ne fait qu'alourdir la page sans rien améliorer.
 */
export async function sourceSets(
  src: ImageMetadata,
  options: { widths?: readonly number[]; quality?: number } = {},
): Promise<SourceSet[]> {
  const quality = options.quality ?? 74;
  const asked = options.widths ?? WIDTHS;

  const widths = asked.filter((w) => w <= src.width);
  if (widths.length === 0) widths.push(src.width);
  /* On garde la largeur native si elle tombe entre deux paliers, pour ne pas
     priver les grands écrans de la pleine définition disponible. */
  if (src.width < Math.max(...asked) && !widths.includes(src.width)) widths.push(src.width);

  return Promise.all(
    FORMATS.map(async (format) => {
      const built = await Promise.all(
        widths.map((width) => getImage({ src, width, format, quality })),
      );
      return {
        type: MIME[format],
        srcset: built.map((image, i) => `${image.src} ${widths[i]}w`).join(', '),
      };
    }),
  );
}

/** L'adresse de repli, servie aux navigateurs qui ignorent <source>. */
export async function fallback(
  src: ImageMetadata,
  width = 1200,
  quality = 74,
): Promise<{ src: string; width: number; height: number }> {
  const image = await getImage({
    src,
    width: Math.min(width, src.width),
    format: 'jpeg',
    quality,
  });
  return {
    src: image.src,
    width: image.attributes.width ?? Math.min(width, src.width),
    height: image.attributes.height ?? Math.round((Math.min(width, src.width) * src.height) / src.width),
  };
}
