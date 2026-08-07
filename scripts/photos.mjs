/**
 * Préparation des photos du gîte.
 *
 *   npm run photos            télécharge, recadre, étalonne, écrit CREDITS.md
 *   npm run photos -- --credits   régénère seulement CREDITS.md et l'image de partage
 *
 * TROIS PRINCIPES
 *
 * 1. UN INVENTAIRE, PAS UNE COLLECTION. Le gîte a deux chambres, une cuisine,
 *    une salle d'eau : le site montre donc exactement une photo par pièce
 *    réelle. Le manifeste ci-dessous EST l'inventaire, et gite.json s'y
 *    conforme.
 *
 * 2. DES SÉRIES, PAS DES IMAGES ISOLÉES. Chercher pièce par pièce donne sept
 *    maisons différentes. On part donc de reportages complets — un même
 *    photographe, une même maison, une même séance — et on ne retient que ce
 *    qui raccorde : teinte du bois, couleur des murs, sol, température de
 *    lumière, style du mobilier.
 *
 * 3. UN ÉTALONNAGE COMMUN. Même après un tri sérieux, deux séances gardent
 *    deux balances des blancs. Chaque photo est donc ramenée à une même
 *    référence colorimétrique, puis reçoit le même traitement — contraste et
 *    désaturation identiques. C'est ce qui fait tenir l'ensemble.
 *
 * Toutes les images sont réencodées SANS AUCUNE MÉTADONNÉE, et le script le
 * vérifie fichier par fichier.
 *
 * Licences — Unsplash (usage commercial, attribution facultative) et Pexels
 * (idem). Les photos Unsplash+ sont payantes : le script refuse cette origine.
 *
 * Pour livrer un vrai client : remplacer les fichiers de src/assets/gite/ par
 * les siens en gardant les mêmes noms, et vider les manifestes.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GITE_DIR = path.join(ROOT, 'src/assets/gite');
const LIEUX_DIR = path.join(ROOT, 'src/assets/lieux');
const PUBLIC_DIR = path.join(ROOT, 'public');

const MAX_EDGE = 2000;
const LARGE_EDGE = 2600;

/**
 * L'INVENTAIRE — une entrée par pièce réelle du gîte, dans l'ordre où on
 * traverse la maison.
 *
 * Provenance : deux reportages, choisis pour raccorder l'un à l'autre.
 *   · Alef Morais (Pexels) — maison de bois tropicale : le séjour, la terrasse
 *   · Luis Zambrano (Pexels) — maison d'enduit ocre : les deux chambres, la salle d'eau
 * Les deux partagent le bois chaud, les suspensions en fibre tressée, les
 * textiles crème et la végétation dense. La cuisine et le jardin ont été
 * retenus sur ces mêmes critères de raccord.
 *
 * @typedef {object} Photo
 * @property {string}  to        nom du fichier livré
 * @property {string}  role      libellé pour CREDITS.md
 * @property {'unsplash'|'pexels'} source
 * @property {string}  id        identifiant chez la source
 * @property {string}  author    auteur — vérifié sur la page source, jamais deviné
 * @property {string}  [unsplash] URL mémorisée, si la résolution échoue
 * @property {number}  [maxEdge]
 * @property {{ratio:number, top?:number, left?:number, gravity?:string}} [crop]
 * @property {{to:string, ratio:number, maxWidth:number}} [portrait]
 * @property {string}  [resolved]
 *
 * @type {Photo[]}
 */
const GITE = [
  {
    to: '01-veranda.jpg',
    role: 'Accueil — la véranda',
    source: 'unsplash',
    id: 'zTVGO4IUmJg',
    unsplash: 'photo-1741899366204-0d71d5ecff27',
    author: 'Brooke Balentine',
    maxEdge: LARGE_EDGE,
    /* Source verticale : on en tire le cadrage paysage ET le cadrage portrait,
       tous deux extraits de l'original, jamais l'un de l'autre. */
    crop: { ratio: 3 / 2, top: 900 },
    portrait: { to: '01-veranda-portrait.jpg', ratio: 9 / 16, maxWidth: 1300 },
  },
  {
    to: '02-sejour.jpg',
    role: 'Le séjour',
    source: 'pexels',
    id: '34277710',
    author: 'Alef Morais',
  },
  {
    to: '03-cuisine.jpg',
    role: 'La cuisine',
    source: 'pexels',
    id: '15948525',
    author: 'Mia Dalisay',
  },
  {
    to: '04-chambre-1.jpg',
    role: 'La première chambre',
    source: 'pexels',
    id: '16436912',
    author: 'Luis Zambrano',
  },
  {
    to: '05-chambre-2.jpg',
    role: 'La seconde chambre',
    source: 'pexels',
    id: '16436925',
    author: 'Luis Zambrano',
  },
  {
    to: '06-salle-eau.jpg',
    role: 'La salle d’eau',
    source: 'pexels',
    id: '16436961',
    author: 'Luis Zambrano',
  },
  {
    to: '07-terrasse.jpg',
    role: 'La terrasse couverte',
    source: 'pexels',
    id: '34277689',
    author: 'Alef Morais',
  },
  {
    to: '08-jardin.jpg',
    role: 'Le jardin',
    source: 'pexels',
    id: '15551721',
    author: 'Luis Becerra Fotógrafo',
  },
];

/** Les environs : le bourg, les anses, le lagon. */
const LIEUX = [
  {
    to: 'bourg.jpg',
    role: 'Le bourg et le front de mer',
    source: 'unsplash',
    id: 'g6pCwkYwvl4',
    unsplash: 'photo-1707323244370-6ad2b0b3d2a5',
    maxEdge: LARGE_EDGE,
  },
  {
    to: 'grande-anse.jpg',
    role: 'La baie vue du ciel',
    source: 'unsplash',
    id: 'VMKyE5oZqro',
    unsplash: 'photo-1719858598107-b0b0b8de6e5a',
    maxEdge: LARGE_EDGE,
  },
  {
    to: 'petite-anse.jpg',
    role: 'Le village au bord de l’eau',
    source: 'unsplash',
    id: 'KIfVGXf6Kzc',
    unsplash: 'photo-1699728751364-1e3b2b0e0e5a',
  },
  {
    to: 'tortue.jpg',
    role: 'Tortue verte, palmes et masque',
    source: 'unsplash',
    id: 'aGihPIbrtVE',
    unsplash: 'photo-1591025207163-942350e47db2',
  },
];

/** Image de partage, dérivée de la photo d'accueil. */
const OG = { from: '01-veranda.jpg', to: 'og-image.jpg', width: 1200, height: 630 };

/* ---------------------------------------------------------- étalonnage */

/**
 * RÉFÉRENCE COLORIMÉTRIQUE COMMUNE.
 * Rapports rouge/vert et bleu/vert visés par toutes les photos du gîte : une
 * lumière d'intérieur légèrement chaude. Chaque image est ramenée à ces
 * rapports, ce qui neutralise l'écart de balance des blancs entre deux séances.
 */
const CIBLE_RG = 1.045;
const CIBLE_BG = 0.905;

/** Bornes de sécurité : on corrige une dérive, on ne repeint pas une image. */
const borne = (k) => Math.min(1.22, Math.max(0.82, k));

/**
 * Ramène une image à la référence commune, puis applique le traitement
 * identique à toutes : léger gain de contraste et légère désaturation.
 * `normaliserBlancs` est faux pour les paysages : réchauffer une mer turquoise
 * la dénaturerait, alors que le contraste et la saturation gagnent à être
 * communs à tout le site.
 */
async function etalonner(entree, { normaliserBlancs }) {
  let facteurs = [1, 1, 1];

  if (normaliserBlancs) {
    const { channels } = await sharp(entree).stats();
    const [r, g, b] = channels.map((c) => c.mean);
    facteurs = [borne((CIBLE_RG * g) / r), 1, borne((CIBLE_BG * g) / b)];
  }

  return sharp(entree)
    .linear(facteurs, [0, 0, 0])
    .linear([1.05, 1.05, 1.05], [-7, -7, -7])
    .modulate({ saturation: 0.9 });
}

/* ------------------------------------------------------------ sources */

/**
 * Résout l'identifiant en URL directe.
 * Unsplash : on passe par /download, qui redirige vers images.unsplash.com pour
 * les photos libres — et refuse celles sous Unsplash+.
 * Pexels : l'adresse du fichier se construit directement.
 */
async function resolveUrl(item) {
  if (item.source === 'pexels') {
    return `https://images.pexels.com/photos/${item.id}/pexels-photo-${item.id}.jpeg`;
  }
  try {
    const { stdout } = await run('curl', [
      '-sS', '-o', '/dev/null', '-w', '%{redirect_url}',
      '--max-time', '30', '-A', 'Mozilla/5.0',
      `https://unsplash.com/photos/${item.id}/download`,
    ]);
    const url = stdout.trim();
    if (url.startsWith('https://images.unsplash.com/')) return url.split('?')[0];
    if (url.startsWith('https://plus.unsplash.com/')) {
      throw new Error('photo sous licence Unsplash+ — non retenue');
    }
  } catch {
    /* on retombe sur l'URL mémorisée */
  }
  if (!item.unsplash) throw new Error(`impossible de résoudre ${item.id}`);
  return `https://images.unsplash.com/${item.unsplash}`;
}

async function download(url, target, source) {
  const query = source === 'pexels'
    ? '?auto=compress&cs=tinysrgb&w=3000'
    : '?fm=jpg&q=92&w=3000&fit=max';
  await run('curl', ['-sS', '--fail', '--max-time', '120', '-A', 'Mozilla/5.0',
    `${url}${query}`, '-o', target]);
  return target;
}

/** Un JPEG sans métadonnées ne contient ni EXIF, ni XMP, ni GPS. */
async function assertNoMetadata(file) {
  const meta = await sharp(file).metadata();
  const leftovers = ['exif', 'icc', 'iptc', 'xmp'].filter((key) => meta[key]);
  if (leftovers.length) {
    throw new Error(`${path.basename(file)} : métadonnées résiduelles (${leftovers.join(', ')})`);
  }
  const bytes = await readFile(file);
  for (const marker of ['Exif\0\0', 'GPS', 'http://ns.adobe.com/xap']) {
    if (bytes.includes(Buffer.from(marker, 'latin1'))) {
      throw new Error(`${path.basename(file)} : marqueur « ${marker.trim()} » présent`);
    }
  }
}

/** Cadrages verticaux produits en cours de route, pour le récapitulatif. */
const portraits = [];

async function traiter(item, dir, workDir, { normaliserBlancs }) {
  const url = await resolveUrl(item);
  const raw = await download(url, path.join(workDir, `${item.id}.jpg`), item.source);
  const source = await sharp(raw).metadata();

  if (item.portrait) {
    const width = Math.min(source.width, Math.round(source.height * item.portrait.ratio));
    const file = path.join(dir, item.portrait.to);
    const base = await (await etalonner(raw, { normaliserBlancs }))
      .extract({ left: Math.round((source.width - width) / 2), top: 0, width, height: source.height })
      .resize({ width: item.portrait.maxWidth, withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(file);
    await assertNoMetadata(file);
    portraits.push({ to: item.portrait.to, ...base });
  }

  let pipeline = await etalonner(raw, { normaliserBlancs });

  if (item.crop) {
    const largeur = Math.min(item.crop.width ?? source.width, source.width - (item.crop.left ?? 0));
    const hauteur = Math.min(
      Math.round(largeur / item.crop.ratio),
      source.height - (item.crop.top ?? 0),
    );
    pipeline = pipeline.extract({
      left: item.crop.left ?? 0,
      top: item.crop.top ?? 0,
      width: largeur,
      height: hauteur,
    });
  }

  const edge = item.maxEdge ?? MAX_EDGE;
  const target = path.join(dir, item.to);
  const info = await pipeline
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(target);
  await assertNoMetadata(target);
  item.resolved = url;
  return info;
}

/* ------------------------------------------------------------ crédits */

const LIEN = {
  unsplash: (id) => `[unsplash.com/photos/${id}](https://unsplash.com/photos/${id})`,
  pexels: (id) => `[pexels.com/photo/${id}](https://www.pexels.com/photo/${id}/)`,
};
const LICENCE = { unsplash: 'Licence Unsplash', pexels: 'Licence Pexels' };

async function writeCredits() {
  const row = (p) =>
    `| \`${p.to}\` | ${p.role} | ${p.author ?? '_voir la page source_'} | ${LIEN[p.source](p.id)} | ${LICENCE[p.source]} |`;

  await writeFile(
    path.join(ROOT, 'CREDITS.md'),
    `# Crédits photographiques

Fichier **généré par \`npm run photos\`** à partir du manifeste de
\`scripts/photos.mjs\`. Ne pas le modifier à la main : les crédits ne peuvent
donc pas diverger des fichiers réellement livrés.

Le gîte présenté sur ce site est fictif. Les photographies servent à figurer
une maison plausible.

## Comment cette sélection a été faite

Chercher une photo par pièce donnait sept maisons différentes. Les images
proviennent donc de **reportages complets** — un même photographe, une même
maison, une même séance :

- **Alef Morais** — maison de bois tropicale : le séjour, la terrasse, le jardin
- **Luis Zambrano** — maison d'enduit ocre : les deux chambres, la salle d'eau

Les deux séries partagent le bois chaud, les suspensions en fibre tressée, les
textiles crème et la végétation dense. La cuisine a été retenue sur ces mêmes
critères de raccord.

Toutes les photos du gîte sont ensuite **ramenées à une même référence
colorimétrique** puis traitées à l'identique — contraste et désaturation
communs. C'est ce qui fait tenir ensemble des images d'origines différentes.

## Licences

- **Unsplash** : usage commercial autorisé, modification et redistribution
  permises, attribution facultative — <https://unsplash.com/license>
- **Pexels** : usage commercial autorisé, modification permise, attribution
  facultative — <https://www.pexels.com/license/>

Aucune photo ne provient d'Unsplash+, dont la licence est payante ; le script
refuse cette origine.

> **Auteurs.** L'attribution est facultative sous les deux licences. Les noms
> ci-dessous ont tous été relevés sur la page source, jamais devinés.

## Le gîte

| Fichier | Pièce | Auteur | Source | Licence |
| --- | --- | --- | --- | --- |
${GITE.map(row).join('\n')}

## Les environs

| Fichier | Rôle | Auteur | Source | Licence |
| --- | --- | --- | --- | --- |
${LIEUX.map(row).join('\n')}

---

**En livrant à un vrai client**, remplacer ces fichiers par les photographies du
bien réel — mêmes noms de fichiers, rien d'autre à modifier — puis vider ces
tableaux. Les vraies photos d'une vraie maison rendent l'étalonnage commun
inutile : elles raccordent d'elles-mêmes.

## Métadonnées

Toutes les images sont réencodées sans EXIF, sans XMP et sans position GPS. Le
script le vérifie fichier par fichier et échoue si un marqueur subsiste.

## Polices

Aucune police n'est téléchargée : le site s'appuie sur les piles système.
`,
    'utf-8',
  );
}

/* --------------------------------------------------------------- main */

async function main() {
  if (process.argv.includes('--credits')) {
    const og = path.join(PUBLIC_DIR, OG.to);
    await sharp(path.join(GITE_DIR, OG.from))
      .resize({ width: OG.width, height: OG.height, fit: 'cover', position: 'centre' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(og);
    await assertNoMetadata(og);
    await writeCredits();
    console.log('\nCREDITS.md et l’image de partage régénérés depuis le manifeste.\n');
    return;
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'gite-photos-'));
  await mkdir(GITE_DIR, { recursive: true });
  await mkdir(LIEUX_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });

  const ligne = (item, info) =>
    `  ${item.to.padEnd(24)} ${String(info.width).padStart(4)}×${String(info.height).padEnd(4)} ` +
    `${String(Math.round(info.size / 1024)).padStart(4)} ko  © ${item.author ?? 'auteur non relevé'}`;

  try {
    console.log('\nLE GÎTE — inventaire, une photo par pièce');
    for (const item of GITE) {
      console.log(ligne(item, await traiter(item, GITE_DIR, workDir, { normaliserBlancs: true })));
    }

    if (portraits.length) {
      console.log('\nCADRAGES PORTRAIT');
      for (const c of portraits) {
        console.log(`  ${c.to.padEnd(24)} ${c.width}×${c.height}  ${Math.round(c.size / 1024)} ko`);
      }
    }

    console.log('\nLES ENVIRONS');
    for (const item of LIEUX) {
      console.log(ligne(item, await traiter(item, LIEUX_DIR, workDir, { normaliserBlancs: false })));
    }

    const og = path.join(PUBLIC_DIR, OG.to);
    await sharp(path.join(GITE_DIR, OG.from))
      .resize({ width: OG.width, height: OG.height, fit: 'cover', position: 'centre' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(og);
    await assertNoMetadata(og);

    await writeCredits();
    console.log(
      `\n${GITE.length} pièces + ${LIEUX.length} vues des environs, le cadrage portrait` +
        ` et l’image de partage.\nÉtalonnage commun appliqué. Aucune métadonnée.` +
        ` CREDITS.md mis à jour.\n`,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}\n`);
  process.exitCode = 1;
});
