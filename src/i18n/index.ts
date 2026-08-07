/**
 * BILINGUE — français par défaut, anglais sous /en/.
 *
 * Deux principes :
 *   1. Tout le contenu propre au gîte est dans gite.json, sous la forme
 *      { "fr": "…", "en": "…" }. La fonction t() choisit la bonne branche.
 *   2. Le vocabulaire d'interface (les mots qui ne changent pas d'un gîte à
 *      l'autre : « Réserver », « Envoyer », les jours de la semaine…) vit ici.
 *
 * Un composant ne doit donc jamais contenir de texte en dur.
 */
import gite from '../data/gite.json';

export type Lang = 'fr' | 'en';
export const LANGS: Lang[] = ['fr', 'en'];
export const DEFAULT_LANG: Lang = 'fr';

/** Valeur bilingue telle qu'elle apparaît dans gite.json. */
export type Bi<T = string> = { fr: T; en: T };

/** Choisit la branche linguistique d'une valeur de gite.json. */
export function t<T>(value: Bi<T> | T, lang: Lang): T {
  if (value && typeof value === 'object' && 'fr' in (value as Bi<T>)) {
    return (value as Bi<T>)[lang] ?? (value as Bi<T>)[DEFAULT_LANG];
  }
  return value as T;
}

/** Lit une valeur de gite.json par chemin pointé : « rates.conditions.securityDeposit ». */
export function pick(pathExpr: string): unknown {
  return pathExpr
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], gite);
}

/**
 * Remplace les jetons {{chemin.dans.le.json}} des textes juridiques.
 * Cela évite qu'un tarif ou une adresse ne se retrouve écrit à deux endroits.
 */
export function fill(text: string, lang: Lang): string {
  return text.replace(/\{\{([\w.]+)\}\}/g, (whole, expr: string) => {
    const value = pick(expr);
    if (value === undefined || value === null) return whole;
    const resolved = t(value as Bi<unknown> | unknown, lang);
    return typeof resolved === 'string' || typeof resolved === 'number' ? String(resolved) : whole;
  });
}

/* ------------------------------------------------------------------ routes */

/**
 * Une page = une clé. Les deux colonnes donnent l'adresse dans chaque langue,
 * ce qui permet au sélecteur de langue de rester sur la même page.
 */
export const ROUTES = {
  home: { fr: '/', en: '/en/' },
  surroundings: { fr: '/les-environs/', en: '/en/the-area/' },
  practical: { fr: '/infos-pratiques/', en: '/en/practical-information/' },
  legal: { fr: '/mentions-legales/', en: '/en/legal-notice/' },
  terms: { fr: '/conditions-generales/', en: '/en/terms-and-conditions/' },
  thanks: { fr: '/merci/', en: '/en/thank-you/' },
} as const;

export type RouteKey = keyof typeof ROUTES;

export function route(key: RouteKey, lang: Lang): string {
  return ROUTES[key][lang];
}

/** Ancres de l'accueil, communes aux deux langues. */
export const ANCHORS = ['maison', 'pieces', 'equipement', 'tarifs', 'calendrier', 'reserver'] as const;

/* -------------------------------------------------------------- vocabulaire */

const UI = {
  skipToContent: { fr: 'Aller au contenu', en: 'Skip to content' },
  menu: { fr: 'Menu', en: 'Menu' },
  closeMenu: { fr: 'Fermer le menu', en: 'Close menu' },
  openMenu: { fr: 'Ouvrir le menu', en: 'Open menu' },
  mainNav: { fr: 'Navigation principale', en: 'Main navigation' },
  language: { fr: 'Langue', en: 'Language' },
  switchToEnglish: { fr: 'Lire en anglais', en: 'Read in English' },
  switchToFrench: { fr: 'Lire en français', en: 'Read in French' },

  navHouse: { fr: 'La maison', en: 'The house' },
  navRooms: { fr: 'Les pièces', en: 'The rooms' },
  navAmenities: { fr: 'Équipement', en: 'Amenities' },
  navRates: { fr: 'Tarifs', en: 'Rates' },
  navCalendar: { fr: 'Disponibilités', en: 'Availability' },
  navSurroundings: { fr: 'Les environs', en: 'The area' },
  navPractical: { fr: 'Infos pratiques', en: 'Practical' },
  navBook: { fr: 'Réserver', en: 'Book' },

  book: { fr: 'Réserver', en: 'Book' },
  bookThisDate: { fr: 'Réserver ces dates', en: 'Book these dates' },
  discover: { fr: 'Découvrir', en: 'Discover' },
  seeArea: { fr: 'Voir les environs', en: 'See the area' },
  seePractical: { fr: 'Infos pratiques', en: 'Practical information' },
  backHome: { fr: 'Retour à l’accueil', en: 'Back to the home page' },
  scroll: { fr: 'Faire défiler', en: 'Scroll' },
  scrollHint: { fr: 'Faites défiler sur le côté', en: 'Scroll sideways' },

  perWeek: { fr: 'la semaine', en: 'per week' },
  perNight: { fr: 'la nuit', en: 'per night' },
  fromPrice: { fr: 'à partir de', en: 'from' },
  included: { fr: 'Compris dans le tarif', en: 'Included in the rate' },
  conditions: { fr: 'Conditions', en: 'Conditions' },
  deposit: { fr: 'Acompte à la réservation', en: 'Deposit on booking' },
  balance: { fr: 'Solde', en: 'Balance' },
  balanceValue: { fr: '{n} jours avant l’arrivée', en: '{n} days before arrival' },
  securityDeposit: { fr: 'Dépôt de garantie', en: 'Security deposit' },
  freeCancellation: { fr: 'Annulation sans frais', en: 'Free cancellation' },
  freeCancellationValue: {
    fr: 'jusqu’à {n} jours avant l’arrivée',
    en: 'up to {n} days before arrival',
  },
  payment: { fr: 'Paiement', en: 'Payment' },
  minStay: { fr: 'Séjour minimum', en: 'Minimum stay' },
  nights: { fr: '{n} nuits', en: '{n} nights' },
  houseRules: { fr: 'Bon à savoir', en: 'Good to know' },

  calendarBooked: { fr: 'Pris', en: 'Booked' },
  calendarFree: { fr: 'Libre', en: 'Free' },
  calendarLoading: { fr: 'Chargement du calendrier…', en: 'Loading the calendar…' },
  calendarPrev: { fr: 'Mois précédents', en: 'Previous months' },
  calendarNext: { fr: 'Mois suivants', en: 'Next months' },
  calendarUpdated: { fr: 'Mis à jour le', en: 'Updated on' },
  calendarPick: {
    fr: 'Choisissez une date libre pour la reporter dans le formulaire.',
    en: 'Pick a free date to carry it into the form.',
  },

  formName: { fr: 'Nom et prénom', en: 'Full name' },
  formEmail: { fr: 'Adresse électronique', en: 'E-mail address' },
  formPhone: { fr: 'Téléphone', en: 'Telephone' },
  formPhoneOptional: { fr: 'facultatif', en: 'optional' },
  formArrival: { fr: 'Arrivée', en: 'Arrival' },
  formDeparture: { fr: 'Départ', en: 'Departure' },
  formGuests: { fr: 'Voyageurs', en: 'Guests' },
  formAdults: { fr: 'adultes', en: 'adults' },
  formChildren: { fr: 'enfants', en: 'children' },
  formMessage: { fr: 'Votre message', en: 'Your message' },
  formMessagePlaceholder: {
    fr: 'Une question, une envie particulière, l’heure d’arrivée prévue…',
    en: 'A question, a special request, your expected arrival time…',
  },
  formSubmit: { fr: 'Réserver', en: 'Book' },
  formRequired: { fr: 'obligatoire', en: 'required' },

  legalUpdated: { fr: 'Dernière mise à jour', en: 'Last updated' },
  legalNotice: { fr: 'Mentions légales', en: 'Legal notice' },
  terms: { fr: 'Conditions générales', en: 'Terms and conditions' },
  contact: { fr: 'Contact', en: 'Contact' },
  writeToUs: { fr: 'Nous écrire', en: 'Write to us' },
  callUs: { fr: 'Nous appeler', en: 'Call us' },
  weSpeak: { fr: 'Nous parlons', en: 'We speak' },
  registeredAs: { fr: 'Classement', en: 'Classification' },
  allRights: { fr: 'Tous droits réservés', en: 'All rights reserved' },
  aroundTitle: { fr: 'Autour du gîte', en: 'Around the cottage' },
} as const;

export type UiKey = keyof typeof UI;

/** Vocabulaire d'interface. `{n}` est remplacé par `count`. */
export function ui(key: UiKey, lang: Lang, count?: number | string): string {
  const value = UI[key][lang];
  return count === undefined ? value : value.replace('{n}', String(count));
}

/* ------------------------------------------------------------------ dates */

const MONTHS: Bi<string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Initiales des jours, lundi en tête — le calendrier français commence au lundi. */
const WEEKDAYS: Bi<string[]> = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

const WEEKDAYS_LONG: Bi<string[]> = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

export function monthName(index: number, lang: Lang): string {
  return MONTHS[lang][index] ?? '';
}
export function weekdayInitials(lang: Lang): string[] {
  return WEEKDAYS[lang];
}
export function weekdayNames(lang: Lang): string[] {
  return WEEKDAYS_LONG[lang];
}

/** « 1er août 2026 » / « 1 August 2026 » — sans dépendre de l'Intl du navigateur. */
export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const month = monthName(m - 1, lang);
  return lang === 'fr' ? `${d === 1 ? '1er' : d} ${month} ${y}` : `${d} ${month} ${y}`;
}

/** « 700 € » en français, « €700 » en anglais. */
export function money(amount: number, lang: Lang): string {
  const n = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(amount);
  return lang === 'fr' ? `${n} €` : `€${n}`;
}

/** Balise <html lang> et attribut hreflang. */
export const HTML_LANG: Bi<string> = { fr: 'fr-FR', en: 'en-GB' };
