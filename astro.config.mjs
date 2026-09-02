// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

// L'URL du site vit dans gite.json, comme le reste du contenu — mais l'hébergeur
// a le dernier mot. Netlify expose l'adresse réelle du site dans $URL au
// moment de construire : on la préfère, ce qui rend le dépôt indifférent au
// nom qu'on donne au site. Sans cela, renommer le site ou en créer un second
// laisserait chaque page déclarer une adresse canonique qui ne répond pas —
// c'est le défaut que ces deux sites ont porté longtemps.
const gite = JSON.parse(readFileSync(new URL('./src/data/gite.json', import.meta.url), 'utf-8'));

export default defineConfig({
  site: process.env.URL || gite.site.url,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    // Le CSS du modèle est petit : on l'inline pour supprimer la requête
    // bloquante avant le premier rendu. Décisif sur mobile.
    inlineStylesheets: 'always',
    format: 'directory',
  },
  compressHTML: true,
  prefetch: {
    // Les transitions de page natives sont d'autant plus fluides que le
    // document suivant est déjà en cache.
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  devToolbar: { enabled: false },
});
