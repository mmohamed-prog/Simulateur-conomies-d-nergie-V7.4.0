import { ENVELOPE_DEFAULTS_BY_PERIOD } from '../data/envelope-defaults.js';

/**
 * Applique les valeurs de résistance thermique sur un site.
 *
 * Chaîne de priorité pour l'état ACTUEL (before) :
 *   thermalBefore.R > envelope saisi manuellement > défauts par période
 *
 * Chaîne de priorité pour l'état PROJETÉ (after) :
 *   thermalAfter.R  > défauts par période (si pas renseigné → on garde l'avant)
 */
export function applyConstructionDefaults(site) {
  const period   = site.identity.constructionPeriod;
  const defaults = ENVELOPE_DEFAULTS_BY_PERIOD[period] ?? {};
  const src      = site.currentState.envelopeSource;
  const tB       = site.thermalBefore ?? {};
  const tA       = site.thermalAfter  ?? {};

  // ── État actuel (before) ─────────────────────────────────────────────────
  const beforeEnv = {
    wallR  : tB.wallR   ?? site.currentState.envelope.wallR   ?? defaults.wallR,
    roofR  : tB.roofR   ?? site.currentState.envelope.roofR   ?? defaults.roofR,
    floorR : tB.floorR  ?? site.currentState.envelope.floorR  ?? defaults.floorR,
    windowUw: tB.windowUw ?? site.currentState.envelope.windowUw ?? defaults.windowUw,
    infiltrationLevel: site.currentState.envelope.infiltrationLevel ?? defaults.infiltrationLevel,
  };

  // ── État projeté (after) — uniquement si thermalAfter est renseigné ──────
  const afterEnv = {
    wallR  : tA.wallR   ?? beforeEnv.wallR,
    roofR  : tA.roofR   ?? beforeEnv.roofR,
    floorR : tA.floorR  ?? beforeEnv.floorR,
    windowUw: tA.windowUw ?? beforeEnv.windowUw,
  };

  // ── Synchronisation menuiseries projetées ─────────────────────────────────
  // Si thermalBefore/After définissent les Uw fenêtres et Ud portes,
  // on les propage dans projectState.menuiseries pour computeMenuiseriesPost
  const updatedMenuiseries = site.projectState?.menuiseries
    ? {
        ...site.projectState.menuiseries,
        // Uw avant = thermalBefore (état actuel fenêtres)
        uFenetresAvant: tB.windowUw ?? site.projectState.menuiseries.uFenetresAvant ?? 5.0,
        // Uw après = thermalAfter (état projeté fenêtres)
        uFenetresApres: tA.windowUw ?? site.projectState.menuiseries.uFenetresApres ?? 1.6,
        // Ud portes
        uPortesAvant: tB.doorUd ?? site.projectState.menuiseries.uPortesAvant ?? 3.5,
        uPortesApres: tA.doorUd ?? site.projectState.menuiseries.uPortesApres ?? 1.8,
      }
    : site.projectState?.menuiseries;

  return {
    ...site,
    currentState: {
      ...site.currentState,
      envelopeSource: tB.wallR ? 'thermal_form' : (src === 'manual' ? 'manual' : 'period_default'),
      envelope: beforeEnv,
      // Stocker aussi l'état after pour que le moteur puisse calculer le delta R
      envelopeAfter: afterEnv,
    },
    projectState: updatedMenuiseries
      ? { ...site.projectState, menuiseries: updatedMenuiseries }
      : site.projectState,
  };
}

/**
 * Facteur de faiblesse de l'enveloppe ACTUELLE (before).
 * Plus le bâtiment est mal isolé, plus les gains potentiels sont amplifiés.
 */
export function computeEnvelopeWeaknessFactor(site) {
  const env = site.currentState.envelope;
  if (!env) return 1;

  let factor = 1;

  // Murs
  const w = env.wallR;
  if (w !== null && w !== undefined) {
    if      (w < 1)  factor += 0.14;
    else if (w < 2)  factor += 0.08;
    else if (w < 3)  factor += 0.03;
  }
  // Toiture
  const r = env.roofR;
  if (r !== null && r !== undefined) {
    if      (r < 2)  factor += 0.16;
    else if (r < 4)  factor += 0.09;
    else if (r < 6)  factor += 0.03;
  }
  // Plancher
  const f = env.floorR;
  if (f !== null && f !== undefined) {
    if      (f < 1)  factor += 0.07;
    else if (f < 2)  factor += 0.04;
  }
  // Fenêtres
  const u = env.windowUw;
  if (u !== null && u !== undefined) {
    if      (u > 3.5) factor += 0.12;
    else if (u > 2.2) factor += 0.06;
    else if (u > 1.6) factor += 0.02;
  }
  // Infiltration
  if (env.infiltrationLevel === 'very_high')   factor += 0.09;
  else if (env.infiltrationLevel === 'high')   factor += 0.06;
  else if (env.infiltrationLevel === 'medium_high') factor += 0.03;

  return Math.min(factor, 1.65);
}

/**
 * Facteur de gain différentiel sur l'enveloppe.
 * Compare l'état avant vs après pour les postes isolation.
 * Retourne un multiplicateur > 1 si les travaux améliorent vraiment l'enveloppe.
 */
export function computeEnvelopeDeltaFactor(site) {
  const before = site.currentState.envelope;
  const after  = site.currentState.envelopeAfter;
  if (!before || !after) return 1;

  let delta = 0;
  let n     = 0;

  // Pour chaque élément, on calcule l'amélioration relative de R
  const pairs = [
    [before.wallR,   after.wallR,   'wall'],
    [before.roofR,   after.roofR,   'roof'],
    [before.floorR,  after.floorR,  'floor'],
  ];
  pairs.forEach(([rB, rA, name]) => {
    if (rB && rA && rA > rB) {
      // Gain relatif normalisé — plafonné à 100% d'amélioration
      delta += Math.min((rA - rB) / rB, 1.0);
      n++;
    }
  });

  // Fenêtres — amélioration relative de Uw (une baisse de Uw est une amélioration)
  const uwB = before.windowUw, uwA = after.windowUw;
  if (uwB && uwA && uwA < uwB) {
    delta += Math.min((uwB - uwA) / uwB, 1.0);
    n++;
  }

  if (n === 0) return 1;
  // Facteur entre 1.0 et 1.30 selon l'amplitude des travaux
  return Math.min(1 + (delta / n) * 0.30, 1.30);
}
