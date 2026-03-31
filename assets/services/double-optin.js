/**
 * double-optin.js — EcoVerta v7
 *
 * Flux double opt-in :
 *  1. User soumet le formulaire → token UUID généré + stocké en localStorage
 *  2. Email envoyé via Formspree avec lien de confirmation dans le payload
 *     (Formspree autoresponder envoie le lien au prospect)
 *  3. User clique le lien → page rouvre avec ?confirm=TOKEN dans l'URL
 *  4. Token vérifié → accès débloqué → PDF généré + lead confirmé
 *
 * Pour activer le double opt-in dans Formspree :
 *  - Aller dans Settings > Emails > Autoresponder
 *  - Activer l'autoresponder, choisir le champ "email" comme destinataire
 *  - Dans le corps du mail, inclure la variable {{confirmationLink}}
 */

const STORAGE_KEY = 'ecoverta_optin';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ─── Générer et stocker un token de confirmation ───────────────────────────────
export function createOptinToken(contact, auditSummary) {
  const token = crypto.randomUUID();
  const payload = {
    token,
    contact,
    auditSummary,
    createdAt: Date.now(),
    confirmed: false
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
  return token;
}

// ─── Lire le token en attente ─────────────────────────────────────────────────
export function getPendingOptin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expiration 24h
    if (Date.now() - data.createdAt > TOKEN_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (_) { return null; }
}

// ─── Marquer comme confirmé ────────────────────────────────────────────────────
export function confirmOptin(token) {
  const data = getPendingOptin();
  if (!data || data.token !== token) return false;
  data.confirmed = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
  return true;
}

// ─── Vérifier si l'utilisateur est déjà confirmé ──────────────────────────────
export function isOptinConfirmed() {
  const data = getPendingOptin();
  return data?.confirmed === true;
}

// ─── Supprimer le token (après génération PDF) ────────────────────────────────
export function clearOptin() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

// ─── Détecter un token de confirmation dans l'URL ─────────────────────────────
export function getConfirmTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('confirm') || null;
}

// ─── Construire le lien de confirmation (à inclure dans le payload Formspree) ──
export function buildConfirmationLink(token) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?confirm=${token}`;
}
