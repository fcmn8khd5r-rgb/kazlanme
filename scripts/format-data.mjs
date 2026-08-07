/**
 * Remise en forme de src/data/gite.json.
 *
 *   npm run format:data
 *
 * JSON.stringify éclate chaque paire { "fr": …, "en": … } sur trois lignes, ce
 * qui triple la longueur du fichier et éloigne les deux versions d'un même
 * texte — on ne peut plus les comparer d'un coup d'œil. Ce formateur les garde
 * sur une seule ligne, et indente le reste normalement.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/gite.json',
);

/** Une paire bilingue de textes courts : on la garde sur une ligne. */
function isInlineable(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 2 || keys[0] !== 'fr' || keys[1] !== 'en') return false;
  return [value.fr, value.en].every(
    (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}

function render(value, depth) {
  const pad = '  '.repeat(depth);
  const padIn = '  '.repeat(depth + 1);

  if (value === null || typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    /* Un tableau de nombres ou de chaînes courtes tient sur une ligne. */
    const flat = value.every((v) => typeof v === 'number') ||
      (value.every((v) => typeof v === 'string') &&
        value.reduce((n, v) => n + v.length, 0) < 70);
    if (flat) return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
    return `[\n${value.map((v) => padIn + render(v, depth + 1)).join(',\n')}\n${pad}]`;
  }

  if (isInlineable(value)) {
    return `{ "fr": ${JSON.stringify(value.fr)}, "en": ${JSON.stringify(value.en)} }`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return `{\n${entries
    .map(([k, v]) => `${padIn}${JSON.stringify(k)}: ${render(v, depth + 1)}`)
    .join(',\n')}\n${pad}}`;
}

const before = await readFile(FILE, 'utf-8');
const data = JSON.parse(before);
const after = render(data, 0) + '\n';

/* Garde-fou : on ne réécrit rien si le contenu n'est pas identique. */
if (JSON.stringify(JSON.parse(after)) !== JSON.stringify(data)) {
  console.error('Échec : la remise en forme a altéré les données. Rien n’a été écrit.');
  process.exitCode = 1;
} else {
  await writeFile(FILE, after, 'utf-8');
  console.log(
    `gite.json remis en forme — ${before.split('\n').length} → ${after.split('\n').length} lignes.`,
  );
}
