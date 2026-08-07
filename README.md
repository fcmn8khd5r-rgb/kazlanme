# Kaz Lanmè — modèle de site pour hébergement touristique

Site de réservation directe pour un gîte aux Antilles. Statique, bilingue
français / anglais, sans base de données ni compte à administrer.

Le gîte présenté est **fictif** : c'est une démonstration. Ce document explique
comment le décliner sur un bien réel.

---

## Le principe

**Tout le contenu propre à l'hébergement vit dans un seul fichier :
[`src/data/gite.json`](src/data/gite.json).**

Aucun composant ne contient de texte en dur. Changer de client, c'est réécrire
ce fichier et remplacer les photos — pas toucher au code.

Chaque valeur de texte est bilingue :

```json
"title": { "fr": "Une petite maison créole", "en": "A small Creole house" }
```

La fonction `t(valeur, langue)` de [`src/i18n`](src/i18n/index.ts) choisit la
bonne branche. Le vocabulaire d'interface — « Réserver », « Arrivée », les mois,
les jours — vit dans ce même fichier `i18n`, parce qu'il ne change pas d'un gîte
à l'autre.

---

## Adapter le modèle en huit étapes

### 1. Les textes

Ouvrir `src/data/gite.json` et reprendre section par section :

| Clé | Ce qu'elle contient |
| --- | --- |
| `site` | Adresse du site, mention de démonstration (à retirer) |
| `identity` | Nom, accroche, classement, numéro d'enregistrement |
| `capacity` | Voyageurs, chambres, surface, horaires, séjour minimum |
| `location` | Commune, code postal, coordonnées, lien de carte |
| `hero` | Photo d'ouverture et son texte de remplacement |
| `story` | Les blocs texte + image de l'accueil (voir plus bas) |
| `rooms` | Les pièces, affichées en défilement latéral |
| `amenities` | L'équipement, par famille, et les règles de la maison |
| `rates` | Saisons, prix, ce qui est compris, conditions, taxe de séjour |
| `availability` | Flux iCal, périodes bloquées à la main |
| `booking` | Formulaire, message de confirmation |
| `surroundings` | Les lieux alentour |
| `practical` | Infos pratiques, en quatre colonnes |
| `contact` | Propriétaires, courriel, téléphone, langues parlées |
| `legal` | Éditeur du site, exploitant du gîte, mentions légales et CGV |
| `seo` | Titres et descriptions, page par page |

**Retirer la mention de démonstration** : passer `site.demo` à `false` et vider
`site.demoLabel`, `demoNotice` et `demoDetails`. Le bandeau du pied de page
disparaît alors.

**Deux identités à ne pas confondre**, sous la clé `legal` :

- `legal.publisher` — l'**éditeur du site**, celui qui le met en ligne. C'est la
  seule identité qui doive être vraie. Sur ce modèle de démonstration, c'est le
  studio ; à la livraison, cela devient le client, ou reste le studio si c'est
  lui qui héberge.
- `legal.operator` — l'**exploitant du gîte** : raison sociale, SIRET, adresse,
  numéro d'enregistrement. Fictif tant que le site sert de démonstration, à
  remplacer par les données réelles du loueur.

Les mentions légales nomment l'éditeur en premier et présentent l'exploitant
comme un exemple explicitement fictif. C'est ce qui permet de publier le modèle
en ligne sans prêter une activité de location imaginaire à une personne réelle.

### 2. Les photos

Déposer les images dans :

- `src/assets/gite/` — l'hébergement
- `src/assets/lieux/` — les environs

**En gardant les mêmes noms de fichiers**, il n'y a rien d'autre à modifier :
`gite.json` désigne les photos par leur nom, et
[`src/lib/images.ts`](src/lib/images.ts) fait la jonction. Un nom introuvable
fait échouer la compilation — jamais un trou dans la page en production.

Pour d'autres noms, éditer les clés `image` de `gite.json`.

⚠️ **Retirer les métadonnées.** Une photo de téléphone contient la position GPS
du bien. Le script [`scripts/photos.mjs`](scripts/photos.mjs) redimensionne et
réencode sans aucune métadonnée, puis le vérifie octet par octet :

```bash
npm run photos
```

Il régénère aussi `CREDITS.md`. Pour un vrai client, remplacer le manifeste en
tête du script par ses propres fichiers, ou traiter les images à la main en
s'assurant qu'aucun EXIF ne subsiste.

### 3. La composition de l'accueil

Le tableau `story` de `gite.json` décrit les blocs de la page d'accueil. Chacun
déclare sa disposition :

| `layout` | Rendu |
| --- | --- |
| `image-left` | Image à gauche, texte à droite |
| `image-right` | L'inverse |
| `band` | Bandeau pleine largeur, une phrase, parallaxe léger |

**La règle tenue par le modèle : jamais un long texte sans visuel, jamais une
suite d'images sans propos, et jamais deux dispositions identiques à la suite.**
En ajoutant un bloc, alterner. Les textes sont des tableaux de paragraphes :
en garder deux ou trois, courts.

L'ordre des sections est dans
[`src/components/pages/HomePage.astro`](src/components/pages/HomePage.astro), qui
retrouve les blocs par leur identifiant — les réordonner dans le JSON ne casse
rien.

### 4. Le calendrier

Coller les adresses d'export iCal dans `availability.icalUrls` :

```json
"icalUrls": [
  "https://www.airbnb.fr/calendar/ical/12345678.ics?s=…",
  "https://ical.booking.com/v1/export?t=…"
]
```

Elles ne sont **jamais** lues par le navigateur : les plateformes ne servent pas
ces flux avec les en-têtes CORS. C'est la fonction
[`netlify/functions/disponibilites.mjs`](netlify/functions/disponibilites.mjs)
qui les relaie, côté serveur.

Le calendrier fonctionne en deux couches :

1. **Au build**, les périodes de `availability.manualBlocks` sont écrites en dur
   dans le HTML. Le calendrier s'affiche complet, tout de suite, même sans
   JavaScript.
2. **Dans le navigateur**, l'appel à `/api/disponibilites` complète les nuits
   prises sur les plateformes. S'il échoue, il ne se passe rien : la version du
   build reste à l'écran.

Le calendrier ne peut donc pas casser la page.

Pour la démonstration, `manualBlocks` contient des périodes fictives. Les vider
pour un vrai client, ou y mettre les indisponibilités qui ne viennent d'aucune
plateforme (séjour de la famille, travaux).

### 5. Le formulaire

Il s'appuie sur **Netlify Forms** : rien à installer, les demandes arrivent dans
l'onglet *Forms* du tableau de bord, et par courriel si une notification est
configurée.

Deux garde-fous sont en place :

- un **champ piège** invisible (`ne-pas-remplir`) que seuls les robots
  remplissent ; Netlify écarte ces envois ;
- une **case de consentement** obligatoire, avec lien vers les mentions légales.

`booking.formName` donne le nom du formulaire dans le tableau de bord. En le
changeant, redéployer pour que Netlify l'enregistre.

**Le message de confirmation ne doit jamais laisser croire à une réservation
ferme.** Les textes `booking.notFirm` et `booking.thanks` sont écrits dans cet
esprit ; les reprendre avec la même prudence.

### 6. Le style

Tout est dans [`src/styles/global.css`](src/styles/global.css), en tête du
fichier, sous forme de variables :

```css
--paper: #fcfcf9;    /* fond principal */
--paper-2: #eff3f3;  /* alternance */
--deep: #12303d;     /* encre et fonds sombres */
--sea: #2b6a80;      /* accent */
--wood: #9b8467;     /* bois naturel */
--leaf: #56755b;     /* végétal */
--font-display: …    /* titres : sans-serif géométrique */
--font-text: …       /* lecture : serif */
```

Aucune police n'est téléchargée : le site s'appuie sur les piles système. Aucune
requête réseau, aucune question de licence, aucun texte invisible au chargement.

**En changeant une couleur de texte, vérifier le contraste** (4,5:1 en petit
corps, 3:1 au-dessus de 24 px). `--ink-mute` est déjà calibré au plus juste.

### 7. Vérifier

```bash
npm run check   # types et gabarits
npm run build   # compilation
npm run preview # rendu du site compilé
```

Avant toute mise en ligne, contrôler le rendu à **375, 768 et 1440 px**, aux
zooms **100, 110 et 125 %**, et cliquer **chaque lien du menu un par un** : après
un clic, le titre et le premier paragraphe doivent être entièrement visibles.

### 8. Mettre en ligne

1. Pousser le dépôt sur GitHub.
2. Sur Netlify : *Add new site* → *Import an existing project* → choisir le dépôt.
3. Les réglages sont déjà dans [`netlify.toml`](netlify.toml) — commande
   `npm run build`, dossier `dist`, fonctions dans `netlify/functions`.
4. Déployer, puis brancher le nom de domaine (*Domain management*).
5. Reporter l'adresse définitive dans `site.url` de `gite.json` et redéployer :
   elle sert aux adresses canoniques, au plan du site et aux aperçus de partage.

---

## Ce qui est déjà réglé

Ces points ont demandé du soin ; ils sont résolus et ne devraient pas se
redéfaire.

- **Ancres.** Une seule variable CSS (`--anchor-offset`) pilote la hauteur de
  l'en-tête et le décalage au défilement : ils ne peuvent pas se
  désynchroniser. Les sections déduisent leur propre rembourrage, pour que
  l'ancre s'arrête sur le contenu et non sur un espace vide.
- **Chargement paresseux.** Toute image est enfermée dans un cadre au format
  fixé (`aspect-ratio`). La place est réservée avant le chargement : la page ne
  saute jamais, et une ancre ne se déplace pas sous le pouce.
- **iPhone.** `viewport-fit=cover`, `theme-color`, et `env(safe-area-inset-*)`
  sur l'en-tête, le héros et le pied de page. Hauteurs en `dvh`, jamais en `vh`.
- **Filets d'un pixel.** Les images sont en `display: block`, les conteneurs
  pleine largeur en `line-height: 0`, et l'en-tête porte un `box-shadow` plutôt
  qu'une bordure — une bordure ajoutait un pixel et décalait le héros.
- **Débordement horizontal.** Aucun, aux trois largeurs. La galerie latérale
  défile dans sa propre boîte sans élargir le document.
- **Mouvement.** Révélation par masque, cascade de 80 ms, parallaxe léger,
  zoom lent au survol, Ken Burns sur le héros, transitions de page natives.
  Tout est neutralisé sous `prefers-reduced-motion`.
- **Images.** AVIF avec repli WebP puis JPEG, plusieurs largeurs, chargement
  paresseux sauf l'image d'ouverture.

## Arborescence

```
src/
  data/gite.json          ← tout le contenu
  i18n/index.ts           ← langues, routes, vocabulaire, dates
  lib/
    images.ts             ← nom de fichier → image optimisée
    availability.ts       ← périodes bloquées, grilles de mois
  layouts/Base.astro      ← en-tête de document, comportements de page
  components/             ← briques réutilisables
    pages/                ← une page = un composant, deux routes
  pages/                  ← routes françaises, et /en/ pour l'anglais
  styles/global.css       ← le système visuel entier
netlify/functions/        ← relais des flux iCal
scripts/photos.mjs        ← préparation des photos, sans métadonnées
```

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Compilation dans `dist/` |
| `npm run preview` | Sert le site compilé |
| `npm run check` | Vérifie types et gabarits |
| `npm run photos` | Prépare les photos et régénère `CREDITS.md` |
| `npm run format:data` | Remet `gite.json` en forme |
