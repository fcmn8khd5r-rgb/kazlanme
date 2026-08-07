/**
 * RELAIS DES FLUX iCal.
 *
 * Airbnb, Booking et les agendas Google publient les séjours au format iCal,
 * mais sans en-tête CORS : le navigateur n'a pas le droit de les lire. Cette
 * fonction les lit à sa place, côté serveur, et renvoie la seule chose dont le
 * calendrier a besoin — la liste des nuits occupées.
 *
 * Elle ne renvoie jamais d'erreur au navigateur : un flux en panne devient une
 * ligne dans « failures », et le calendrier garde les dates connues au build.
 *
 * Adresse publique : /api/disponibilites (voir la redirection de netlify.toml).
 */
import gite from '../../src/data/gite.json' with { type: 'json' };

const TIMEOUT_MS = 8000;
const MAX_BYTES = 4_000_000;

/**
 * Les lignes iCal de plus de 75 octets sont coupées et reprises à la ligne
 * suivante, précédées d'une espace. On les recolle avant toute lecture.
 */
function unfold(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/** « 20261220 » ou « 20261220T140000Z » → Date UTC à minuit. */
function parseStamp(value) {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function key(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Extrait les nuits occupées d'un flux iCal.
 * DTEND est EXCLUSIF : un séjour du 20 au 27 occupe les nuits du 20 au 26.
 * Les événements annulés sont ignorés.
 */
export function parseIcal(text) {
  const nights = new Set();
  const blocks = unfold(text).split(/BEGIN:VEVENT/i).slice(1);

  for (const block of blocks) {
    if (/^STATUS:CANCELLED/im.test(block)) continue;

    const startLine = /^DTSTART[^:\r\n]*:(.+)$/im.exec(block);
    const endLine = /^DTEND[^:\r\n]*:(.+)$/im.exec(block);
    if (!startLine) continue;

    const start = parseStamp(startLine[1]);
    if (!start) continue;

    /* Sans DTEND, l'événement ne dure qu'un jour. */
    const end = endLine ? parseStamp(endLine[1]) : null;
    const stop = end && end > start ? end : new Date(start.getTime() + 86_400_000);

    const cursor = new Date(start);
    let guard = 0;
    while (cursor < stop && guard++ < 800) {
      nights.add(key(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return nights;
}

async function readFeed(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'text/calendar, text/plain;q=0.9, */*;q=0.5' },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  if (text.length > MAX_BYTES) throw new Error('flux anormalement volumineux');
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('ce n’est pas un flux iCal');

  return parseIcal(text);
}

/** Masque l'URL dans les messages d'erreur : elle contient souvent un jeton. */
function label(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'flux';
  }
}

export default async function handler() {
  const urls = (gite.availability.icalUrls ?? []).filter(
    (url) => typeof url === 'string' && url.trim().startsWith('http'),
  );

  const booked = new Set();
  const failures = [];

  const results = await Promise.allSettled(urls.map(readFeed));
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      for (const night of result.value) booked.add(night);
    } else {
      failures.push({ source: label(urls[index]), reason: String(result.reason?.message ?? result.reason) });
    }
  });

  return new Response(
    JSON.stringify({
      booked: [...booked].sort(),
      sources: urls.length,
      failures,
      updatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        /* Une réservation de plus ou de moins ne se joue pas à la minute :
           dix minutes de cache épargnent aux plateformes une requête par
           visiteur, tout en gardant le calendrier juste. */
        'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
      },
    },
  );
}

export const config = { path: '/api/disponibilites' };
