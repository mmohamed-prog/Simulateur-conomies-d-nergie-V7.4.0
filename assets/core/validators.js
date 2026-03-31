/**
 * validators.js — EcoVerta v7
 *
 * Validation email à 3 niveaux :
 *  1. Format RFC-like (regex stricte)
 *  2. Domaine connu valide (pas test.com, exemple.com, etc.)
 *  3. Blacklist des services d'emails jetables
 */

// ─── 1. Regex format email stricte ────────────────────────────────────────────
// Vérifie : au moins 2 chars avant @, domaine avec extension ≥ 2 chars
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]{2,}@[a-zA-Z0-9.\-]{2,}\.[a-zA-Z]{2,}$/;

// ─── 2. Domaines génériques suspects (souvent utilisés pour les tests) ─────────
const FAKE_DOMAINS = new Set([
  'test.com', 'test.fr', 'test.net', 'example.com', 'example.fr',
  'exemple.com', 'exemple.fr', 'demo.com', 'demo.fr',
  'email.com', 'mail.com', 'fake.com', 'noreply.com',
  'placeholder.com', 'sample.com', 'invalid.com',
  'aaa.com', 'abc.com', 'xxx.com', 'zzz.com',
  'toto.com', 'toto.fr', 'tutu.com', 'tata.com',
  'blabla.com', 'blabla.fr', 'truc.com', 'truc.fr',
  'machin.com', 'machin.fr', 'bidule.com', 'chose.com',
]);

// ─── 3. Blacklist des services d'emails jetables / temporaires ─────────────────
const DISPOSABLE_DOMAINS = new Set([
  // Services populaires jetables
  'mailinator.com', 'mailinator.net', 'mailinator.org',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net',
  'throwam.com', 'throwaway.email', 'throw.cc',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'spam4.me', 'spamgourmet.com', 'spamgourmet.net',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'trashmail.fr',
  'trashmail.at', 'trashmail.io', 'trashmail.org',
  'dispostable.com', 'discard.email',
  'mailnull.com', 'maildrop.cc', 'mailnesia.com',
  'mailnull.com', 'mailnew.com',
  'fakeinbox.com', 'fakeinbox.net',
  'getairmail.com', 'getairmail.com',
  'filzmail.com', 'eyepaste.com',
  'spambox.us', 'spam.la', 'spaml.com',
  'tempr.email', 'tempinbox.com', 'tempinbox.net',
  'minutemail.com', 'minuteinbox.com',
  'emailondeck.com', 'tempemail.net',
  'crap.email', 'spamdecoy.com',
  'dropmail.me', 'mailtemp.info',
  'moakt.com', 'emkei.cz',
  'mailnull.com', 'disbox.net', 'disbox.org',
  'spamhereplease.com', 'spamoff.de',
  'byom.de', 'courriel.fr.nf',
  'jetable.fr.nf', 'jetable.net', 'jetable.org',
  'no-spam.ws', 'noref.in', 'objectmail.com',
  'ownmail.net', 'petml.com', 'postthis.org',
  'privacy.net', 'rcpt.at', 'rppkn.com',
  'spam.be', 'spaml.de', 'spamoff.de',
  'temporaryemail.net', 'temporaryinbox.com',
  'tilien.com', 'tradermail.info', 'uggsrock.com',
]);

// ─── Validation du préfixe (avant @) ──────────────────────────────────────────
// Rejette les séquences suspectes trop courtes ou trop répétitives
function isValidLocalPart(local) {
  if (local.length < 2) return false;
  // Rejeter les strings comme "aaa", "aaaa", "xxx", "zzz"
  if (/^(.)\1{2,}$/.test(local)) return false;
  // Rejeter les strings purement numériques très courtes
  if (/^\d{1,3}$/.test(local)) return false;
  return true;
}

// ─── Validation domaine ───────────────────────────────────────────────────────
function isValidDomain(domain) {
  // Extension trop courte
  const parts = domain.split('.');
  if (parts[parts.length - 1].length < 2) return false;
  // Domaine sans nom significatif
  if (parts[0].length < 2) return false;
  return true;
}

// ─── Export principal ─────────────────────────────────────────────────────────
export function isEmail(value) {
  const email = String(value || '').trim().toLowerCase();

  // 1. Format
  if (!EMAIL_REGEX.test(email)) return false;

  const [local, domain] = email.split('@');

  // 2. Validité du préfixe
  if (!isValidLocalPart(local)) return false;

  // 3. Validité du domaine
  if (!isValidDomain(domain)) return false;

  // 4. Domaines faux connus
  if (FAKE_DOMAINS.has(domain)) return false;

  // 5. Emails jetables
  if (DISPOSABLE_DOMAINS.has(domain)) return false;

  return true;
}

export function isRequired(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  return String(value ?? '').trim().length > 0;
}

// ─── Message d'erreur contextuel ──────────────────────────────────────────────
export function emailErrorMessage(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return 'Email requis.';
  if (!EMAIL_REGEX.test(email)) return 'Format invalide (ex. prenom.nom@societe.com).';

  const [local, domain] = email.split('@');
  if (!isValidLocalPart(local)) return 'Adresse non valide.';
  if (!isValidDomain(domain)) return 'Domaine invalide.';
  if (FAKE_DOMAINS.has(domain)) return 'Merci d\'utiliser votre email professionnel.';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'Les adresses email temporaires ne sont pas acceptées.';
  return 'Email invalide.';
}
