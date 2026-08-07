/**
 * Préparation des photos du gîte.
 *
 *   npm run photos
 *
 * Chaque entrée du manifeste ci-dessous est téléchargée depuis Unsplash,
 * redimensionnée, puis réencodée SANS AUCUNE MÉTADONNÉE. Le script écrit aussi
 * CREDITS.md à partir du même manifeste : les crédits ne peuvent donc pas
 * diverger des fichiers réellement livrés.
 *
 * Licence — seule la licence Unsplash (gratuite, usage commercial autorisé,
 * attribution facultative) est acceptée. Les photos Unsplash+ sont servies
 * depuis plus.unsplash.com : le script refuse cette origine.
 *
 * Pour livrer un vrai client : remplacer les fichiers de src/assets/gite/ par
 * les siens en gardant les mêmes noms, et vider le manifeste VUES.
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
 * Le gîte : intérieurs et extérieurs, tous dans le même registre.
 *
 * @typedef {object} Photo
 * @property {string}  to        nom du fichier livré
 * @property {string}  role      libellé pour CREDITS.md
 * @property {string}  id        identifiant Unsplash
 * @property {string}  unsplash  URL mémorisée, si la résolution échoue
 * @property {string}  [author]  auteur, uniquement s'il a été vérifié
 * @property {number}  [maxEdge] plus grand côté après redimensionnement
 * @property {{ratio:number, top:number}} [crop]      recadrage paysage
 * @property {{to:string, ratio:number, maxWidth:number}} [portrait] cadrage vertical
 * @property {string}  [resolved]     rempli à l'exécution
 * @property {object}  [portraitInfo] rempli à l'exécution
 *
 * @type {Photo[]}
 */
const GITE = [
  {
    to: '01-veranda.jpg',
    role: 'Accueil — la véranda',
    id: 'zTVGO4IUmJg',
    unsplash: 'photo-1741899366204-0d71d5ecff27',
    author: 'Brooke Balentine', // vérifié sur la page source
    maxEdge: LARGE_EDGE,
    /* La source est verticale (2600×3921). On en tire DEUX cadrages :
       le paysage ci-dessous pour les grands écrans, et le portrait pour les
       téléphones — tous deux extraits de l'original, jamais l'un de l'autre. */
    crop: { ratio: 3 / 2, top: 900 },
    portrait: { to: '01-veranda-portrait.jpg', ratio: 9 / 16, maxWidth: 1300 },
  },
  {
    to: '02-sejour.jpg',
    role: 'Le séjour et la table',
    id: 'GgAU5OaTAlA',
    unsplash: 'photo-1721222201158-60ebe6d99ae2',
  },
  {
    to: '03-cuisine.jpg',
    role: 'La cuisine',
    id: 'AMHhBiWHQOM',
    unsplash: 'photo-1615218392948-abc57d7e91f4',
  },
  {
    to: '04-chambre-bleue.jpg',
    role: 'La chambre bleue',
    id: 'L9GsIbPCXKU',
    unsplash: 'photo-1750271334785-4f6008035021',
  },
  {
    to: '05-chambre-jardin.jpg',
    role: 'La chambre sur le jardin',
    id: 'RAXD1BlJmSs',
    unsplash: 'photo-1774280954999-9758f11f3d41',
    author: 'Marc Wieland', // vérifié sur la page source
  },
  {
    to: '06-chambre-rotin.jpg',
    role: 'Détail — lit en rotin',
    id: 'jEW4REcKBn0',
    unsplash: 'photo-1757262798630-a9cdd57af39b',
  },
  {
    to: '07-salle-eau.jpg',
    role: 'La salle d’eau',
    id: 'z5Qyv6um5Ow',
    unsplash: 'photo-1741282698805-e67d7a044eb2',
  },
];

/** Les environs : le bourg, les anses, le lagon. */
const LIEUX = [
  {
    to: 'bourg.jpg',
    role: 'Le bourg et le front de mer',
    id: 'g6pCwkYwvl4',
    unsplash: 'photo-1707323244370-6ad2b0b3d2a5',
    maxEdge: LARGE_EDGE,
  },
  {
    to: 'grande-anse.jpg',
    role: 'La baie vue du ciel',
    id: 'VMKyE5oZqro',
    unsplash: 'photo-1719858598107-b0b0b8de6e5a',
    maxEdge: LARGE_EDGE,
  },
  {
    to: 'petite-anse.jpg',
    role: 'Le village au bord de l’eau',
    id: 'KIfVGXf6Kzc',
    unsplash: 'photo-1699728751364-1e3b2b0e0e5a',
  },
  {
    to: 'tortue.jpg',
    role: 'Tortue verte, palmes et masque',
    id: 'aGihPIbrtVE',
    unsplash: 'photo-1591025207163-942350e47db2',
  },
];

/** Image de partage, dérivée de la photo d'accueil. */
const OG = { from: '01-veranda.jpg', to: 'og-image.jpg', width: 1200, height: 630 };

/* Le cadrage portrait de la photo d'accueil est décrit dans le manifeste GITE
   ci-dessus (clé « portrait ») : il est extrait de la source originale, en même
   temps que le cadrage paysage. */

/**
 * Résout l'identifiant Unsplash en URL directe. On passe par le point
 * /download, qui redirige vers images.unsplash.com pour les photos sous
 * licence libre — et refuse celles sous Unsplash+.
 */
async function resolveUrl(id, fallback) {
  try {
    const { stdout } = await run('curl', [
      '-sS', '-o', '/dev/null', '-w', '%{redirect_url}',
      '--max-time', '30', '-A', 'Mozilla/5.0',
      `https://unsplash.com/photos/${id}/download`,
    ]);
    const url = stdout.trim();
    if (url.startsWith('https://images.unsplash.com/')) return url.split('?')[0];
    if (url.startsWith('https://plus.unsplash.com/')) {
      throw new Error('photo sous licence Unsplash+ — non retenue');
    }
  } catch {
    /* on retombe sur l'URL mémorisée */
  }
  if (!fallback) throw new Error(`impossible de résoudre ${id}`);
  return `https://images.unsplash.com/${fallback}`;
}

async function download(url, target) {
  await run('curl', ['-sS', '--fail', '--max-time', '120', '-A', 'Mozilla/5.0',
    `${url}?fm=jpg&q=92&w=3000&fit=max`, '-o', target]);
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

/** Cadrages verticaux produits en cours de route, pour le récapitulatif final. */
const portraits = [];

async function traiter(item, dir, workDir) {
  const url = await resolveUrl(item.id, item.unsplash);
  const raw = await download(url, path.join(workDir, `${item.id}.jpg`));
  const source = await sharp(raw).metadata();

  /* Variante portrait, tirée de l'original avant tout recadrage paysage :
     recadrer un recadrage perdrait de la hauteur pour rien. */
  if (item.portrait) {
    const width = Math.min(source.width, Math.round(source.height * item.portrait.ratio));
    const file = path.join(dir, item.portrait.to);
    const cut = await sharp(raw)
      .rotate()
      .extract({
        left: Math.round((source.width - width) / 2),
        top: 0,
        width,
        height: source.height,
      })
      .resize({ width: item.portrait.maxWidth, withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(file);
    await assertNoMetadata(file);
    portraits.push({ to: item.portrait.to, ...cut });
  }

  const edge = item.maxEdge ?? MAX_EDGE;
  const target = path.join(dir, item.to);
  let pipeline = sharp(raw).rotate();

  if (item.crop) {
    const height = Math.min(
      Math.round(source.width / item.crop.ratio),
      source.height - item.crop.top,
    );
    pipeline = pipeline.extract({ left: 0, top: item.crop.top, width: source.width, height });
  }

  const info = await pipeline
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(target);
  await assertNoMetadata(target);
  item.resolved = url;
  return info;
}

async function writeCredits() {
  const row = (p) =>
    `| \`${p.to}\` | ${p.role} | ${p.author ?? '_voir la page source_'} | [unsplash.com/photos/${p.id}](https://unsplash.com/photos/${p.id}) | Licence Unsplash |`;

  await writeFile(
    path.join(ROOT, 'CREDITS.md'),
    `# Crédits photographiques

Fichier **généré par \`npm run photos\`** à partir du manifeste de
\`scripts/photos.mjs\`. Ne pas le modifier à la main.

Le gîte présenté sur ce site est fictif. Les photographies proviennent
d'Unsplash et servent à figurer une maison plausible.

Toutes sont publiées sous la **licence Unsplash** : usage commercial autorisé,
modification et redistribution permises, attribution facultative. Aucune photo ne provient d'Unsplash+, dont
la licence est payante et les conditions différentes ; le script refuse cette
origine.

Texte de la licence : <https://unsplash.com/license>

> **Auteurs.** L'attribution est facultative sous licence Unsplash. Le nom de
> l'auteur figure sur chaque page source liée ci-dessous ; il n'est reproduit
> ici que lorsqu'il a été vérifié directement sur cette page.

## Le gîte

| Fichier | Rôle | Auteur | Source | Licence |
| --- | --- | --- | --- | --- |
${GITE.map(row).join('\n')}

## Les environs

| Fichier | Rôle | Auteur | Source | Licence |
| --- | --- | --- | --- | --- |
${LIEUX.map(row).join('\n')}

---

**En livrant à un vrai client**, remplacer ces fichiers par les photographies du
bien réel — mêmes noms de fichiers, rien d'autre à modifier — puis vider ces
tableaux.

## Métadonnées

Toutes les images sont réencodées sans EXIF, sans XMP et sans position GPS. Le
script le vérifie fichier par fichier et échoue si un marqueur subsiste.

## Polices

Aucune police n'est téléchargée : le site s'appuie sur les piles système. Aucune
requête réseau, aucune question de licence.
`,
    'utf-8',
  );
}

async function main() {
  /* --credits : réécrit CREDITS.md et l'image de partage à partir du manifeste,
     sans retélécharger. Utile quand seule une entrée du manifeste a changé. */
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

  try {
    console.log('\nLE GÎTE');
    for (const item of GITE) {
      const info = await traiter(item, GITE_DIR, workDir);
      console.log(
        `  ${item.to.padEnd(24)} ${String(info.width).padStart(4)}×${String(info.height).padEnd(4)} ` +
          `${String(Math.round(info.size / 1024)).padStart(4)} ko` + (item.author ? `  © ${item.author}` : ''),
      );
    }

    console.log('\nLES ENVIRONS');
    for (const item of LIEUX) {
      const info = await traiter(item, LIEUX_DIR, workDir);
      console.log(
        `  ${item.to.padEnd(24)} ${String(info.width).padStart(4)}×${String(info.height).padEnd(4)} ` +
          `${String(Math.round(info.size / 1024)).padStart(4)} ko` + (item.author ? `  © ${item.author}` : ''),
      );
    }

    if (portraits.length) {
      console.log('\nCADRAGES PORTRAIT');
      for (const c of portraits) {
        console.log(
          `  ${c.to.padEnd(24)} ${c.width}×${c.height}` +
            `  ${String(Math.round(c.size / 1024)).padStart(4)} ko`,
        );
      }
    }

    const og = path.join(PUBLIC_DIR, OG.to);
    await sharp(path.join(GITE_DIR, OG.from))
      .resize({ width: OG.width, height: OG.height, fit: 'cover', position: 'centre' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(og);
    await assertNoMetadata(og);

    await writeCredits();
    console.log(
      `\n${GITE.length} photos du gîte + ${LIEUX.length} des environs, ` +
        `le cadrage portrait et l’image de partage.` +
        `\nAucune métadonnée, aucune position GPS. CREDITS.md mis à jour.\n`,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}\n`);
  process.exitCode = 1;
});
