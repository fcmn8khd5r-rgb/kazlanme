// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

// L'URL du site vit dans gite.json, comme le reste du contenu.
const gite = JSON.parse(readFileSync(new URL('./src/data/gite.json', import.meta.url), 'utf-8'));

export default defineConfig({
  site: gite.site.url,
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
