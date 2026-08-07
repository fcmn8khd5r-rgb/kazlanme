/**
 * DISPONIBILITÉS — la moitié « au build ».
 *
 * Deux couches, et c'est volontaire :
 *
 *   1. Ici, au build : les périodes bloquées à la main (gite.json →
 *      availability.manualBlocks) sont dépliées jour par jour et le calendrier
 *      est écrit en dur dans le HTML. Il s'affiche donc complet, tout de suite,
 *      même sans JavaScript, même si le réseau tombe.
 *
 *   2. Dans le navigateur : la fonction Netlify /api/disponibilites relaie les
 *      flux iCal d'Airbnb ou de Booking et le calendrier se complète. Si elle
 *      ne répond pas, il ne se passe rien — la version du build reste à
 *      l'écran. Le calendrier ne peut donc jamais casser la page.
 *
 * Pourquoi une fonction plutôt qu'une lecture au build : les plateformes ne
 * servent pas leurs flux avec les en-têtes CORS, le navigateur ne peut pas les
 * lire lui-même. Et un calendrier figé à la dernière publication du site
 * afficherait des dates fausses dès la réservation suivante.
 */
import gite from '../data/gite.json';

/** Une date au format « 2026-12-20 ». */
export type DayKey = string;

export function keyOf(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

/** Aujourd'hui, en UTC, sans l'heure — sert de borne « passé ». */
export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Déplie une période en nuits occupées.
 * La date de fin est EXCLUSIVE, comme dans iCal : un séjour du 20 au 27 occupe
 * les nuits du 20 au 26, et le 27 est de nouveau libre à la location.
 */
export function expand(start: string, end: string): DayKey[] {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];

  const days: DayKey[] = [];
  const cursor = new Date(from);
  /* Garde-fou : une période aberrante ne doit pas produire une boucle sans fin. */
  let guard = 0;
  while (cursor < to && guard++ < 800) {
    days.push(keyOf(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Les nuits bloquées à la main, telles qu'écrites dans gite.json. */
export function manualBooked(): Set<DayKey> {
  const blocks = (gite.availability.manualBlocks ?? []) as { start: string; end: string }[];
  return new Set(blocks.flatMap((block) => expand(block.start, block.end)));
}

export interface MonthCell {
  key: DayKey | null;
  day: number | null;
  past: boolean;
  booked: boolean;
}

export interface Month {
  year: number;
  month: number; // 0 → janvier
  cells: MonthCell[];
}

/**
 * Grille d'un mois, lundi en tête — c'est la convention française.
 * Les cases de tête sont vides plutôt qu'occupées par le mois précédent :
 * un chiffre grisé qui appartient à un autre mois se lit mal.
 */
export function monthGrid(year: number, month: number, booked: Set<DayKey>, floor: Date): Month {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: MonthCell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: null, day: null, past: false, booked: false });
  }
  for (let day = 1; day <= length; day++) {
    const date = new Date(Date.UTC(year, month, day));
    const key = keyOf(date);
    cells.push({ key, day, past: date < floor, booked: booked.has(key) });
  }
  return { year, month, cells };
}

/** Les `count` prochains mois, à partir du mois courant. */
export function upcomingMonths(count: number, booked: Set<DayKey>): Month[] {
  const floor = today();
  const months: Month[] = [];
  for (let i = 0; i < count; i++) {
    const cursor = new Date(Date.UTC(floor.getUTCFullYear(), floor.getUTCMonth() + i, 1));
    months.push(monthGrid(cursor.getUTCFullYear(), cursor.getUTCMonth(), booked, floor));
  }
  return months;
}
