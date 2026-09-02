/**
 * Plan du site, engendré à partir de la table des routes de src/i18n.
 * Aucune dépendance, et surtout aucun risque d'oublier une page : ajouter une
 * entrée dans ROUTES suffit à la faire apparaître ici.
 */
import type { APIRoute } from 'astro';
import gite from '../data/gite.json';
import { ROUTES, LANGS, type Lang, type RouteKey } from '../i18n';

// L'adresse vient d'abord de l'hébergeur : import.meta.env.SITE reprend
// « site » d'astro.config.mjs, qui suit $URL. Lue dans le JSON, elle
// aurait laissé le plan du site désigner l'ancien domaine.
const base = (import.meta.env.SITE ?? gite.site.url).replace(/\/$/, '');

/* La page de remerciement n'a d'intérêt qu'après un envoi : on ne l'indexe pas. */
const SKIP: RouteKey[] = ['thanks'];

const PRIORITY: Partial<Record<RouteKey, string>> = {
  home: '1.0',
  surroundings: '0.8',
  practical: '0.7',
  legal: '0.3',
  terms: '0.3',
};

export const GET: APIRoute = () => {
  const today = new Date().toISOString().slice(0, 10);

  const entries = (Object.keys(ROUTES) as RouteKey[])
    .filter((key) => !SKIP.includes(key))
    .flatMap((key) =>
      LANGS.map((lang: Lang) => {
        const alternates = LANGS.map(
          (other) =>
            `    <xhtml:link rel="alternate" hreflang="${other === 'fr' ? 'fr-FR' : 'en-GB'}" href="${base}${ROUTES[key][other]}"/>`,
        ).join('\n');

        return `  <url>
    <loc>${base}${ROUTES[key][lang]}</loc>
${alternates}
    <lastmod>${today}</lastmod>
    <priority>${PRIORITY[key] ?? '0.5'}</priority>
  </url>`;
      }),
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`,
    { headers: { 'content-type': 'application/xml; charset=utf-8' } },
  );
};
