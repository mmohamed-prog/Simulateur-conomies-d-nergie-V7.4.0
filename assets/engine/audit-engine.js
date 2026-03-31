/**
 * audit-engine.js — EcoVerta v7
 *
 * Fusions :
 *  - gainRange [min,max] par poste (v5.3) → gain physique ajusté par enveloppe
 *  - 3 scénarios d'ambition (v5.3) : sobriété / intermédiaire / ambitieux
 *  - Boost zone climatique H1/H2/H3 (v5.3)
 *  - Boost heures d'occupation (v5.3)
 *  - Agrégation portefeuille par poste cross-sites (v5.3)
 *  - CAP_PERF, envelopeFactor, menuiseries delta-U, PV (v6)
 *  - plancher_bas, étiquettes énergie+climat, priorityIndex (v6.1.2)
 */

import { applyConstructionDefaults, computeEnvelopeWeaknessFactor, computeEnvelopeDeltaFactor } from './envelope.js';
import { computeCurrentEmissions, computeProjectedEmissions }        from './emissions.js';
import { computePortfolio }                                           from './portfolio.js';
import { computeSiteScore, computeEnergyClimateLabels, computePriorityIndex } from './scoring.js';
import { DEFAULT_ENERGY_PRICES }                                      from '../data/energy-prices.js';
import { EMISSION_FACTORS }                                           from '../data/emission-factors.js';
import {
  MEASURES_CATALOG, MEASURES_BY_ID,
  SEGMENT_MULTIPLIERS, CAP_PERF,
  SCENARIOS,
  CLIMATE_BOOST,
  OCCUPANCY_BOOST_THRESHOLD, OCCUPANCY_BOOST_FACTOR, OCCUPANCY_SENSITIVE_POSTS
} from '../data/measures-catalog.js';

const RATE_FENETRE_M2 = 380;
const RATE_PORTE_M2   = 320;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dpeClass(intensity) {
  if (intensity <= 70)  return 'A';
  if (intensity <= 110) return 'B';
  if (intensity <= 180) return 'C';
  if (intensity <= 250) return 'D';
  if (intensity <= 330) return 'E';
  if (intensity <= 420) return 'F';
  return 'G';
}

function effectivePrice(site, baseline) {
  if (site.financial?.priceOverrideEurPerKwh > 0)
    return site.financial.priceOverrideEurPerKwh;
  if (baseline.currentKwh > 0 && baseline.currentCost > 0)
    return baseline.currentCost / baseline.currentKwh;
  return DEFAULT_ENERGY_PRICES[site.currentState.heatingEnergy] ?? 0.18;
}

function effectiveCo2Factor(site) {
  const he  = site.currentState.heatingEnergy;
  const co2 = EMISSION_FACTORS[he]?.kgco2ePerKwh ?? 0.204;
  const elecShare = site.data?.electricitySharePct ?? null;
  if (elecShare !== null && elecShare >= 0 && elecShare <= 1) {
    const co2Elec = EMISSION_FACTORS.electricite.kgco2ePerKwh;
    return (1 - elecShare) * co2 + elecShare * co2Elec;
  }
  return co2;
}

function fmtEur(x) {
  return isFinite(x)
    ? new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(x)
    : '—';
}

// ─── Gain physique ajusté d'un poste standard ─────────────────────────────────
/**
 * Calcule le gain effectif d'un poste en combinant :
 *  1. gainRange [min, max] → base = médiane
 *  2. envelopeFactor (état de dégradation de l'enveloppe)
 *  3. scenarioMultiplier (sobriété / intermédiaire / ambitieux)
 *  4. climatBoost (H1 / H2 / H3)
 *  5. occupancyBoost (heures d'occupation > seuil)
 */
function physicalGain(postId, measure, envelopeFactor, envelopeDeltaFactor, scenarioMultiplier, climateBoost, occupancyBoost) {
  const [minG, maxG] = measure.gainRange ?? [measure.gainPct ?? 0, measure.gainPct ?? 0];
  let base = (minG + maxG) / 2;

  // Modulation enveloppe — postes enveloppe/CVC profitent d'un bâtiment dégradé
  if (['enveloppe', 'cvc'].includes(measure.category)) {
    base *= envelopeFactor;
  }
  // Si des travaux d'isolation sont définis (thermalAfter), amplifier le gain des postes enveloppe
  if (measure.category === 'enveloppe' && envelopeDeltaFactor > 1) {
    base *= envelopeDeltaFactor;
  }

  // Scénario d'ambition
  base *= scenarioMultiplier;

  // Boost zone climatique (H1 = plus froid → gains enveloppe/CVC supérieurs)
  if (['enveloppe', 'cvc'].includes(measure.category)) {
    base *= climateBoost;
  }

  // Boost occupation (postes sensibles à l'usage)
  if (OCCUPANCY_SENSITIVE_POSTS.includes(postId)) {
    base *= occupancyBoost;
  }

  return Math.max(0, Math.min(0.40, base));
}

// ─── Poste standard ───────────────────────────────────────────────────────────
function computeStandardPost(postId, site, effectivePct, pricePerKwh, segMult, capexScenarioMult, area, subsidiesPct) {
  const measure = MEASURES_BY_ID[postId];
  if (!measure) return null;

  const grossCapex = measure.capexPerM2 * segMult * capexScenarioMult * area;
  const netCapex   = grossCapex * (1 - subsidiesPct / 100);
  const savedKwh   = site.data.annualConsumptionKwh * effectivePct;
  const savedEur   = savedKwh * pricePerKwh;
  const roiYears   = savedEur > 0 ? netCapex / savedEur : null;
  const [minG, maxG] = measure.gainRange ?? [effectivePct, effectivePct];

  return {
    id         : postId,
    label      : measure.label,
    category   : measure.category,
    priority   : measure.priority,
    roiTarget  : measure.roiTarget,
    description: measure.description,
    gainRange  : [minG, maxG],
    grossCapex, netCapex, savedKwh, savedEur, roiYears,
    gainPctRaw : effectivePct
  };
}

// ─── Poste menuiseries (delta-U) ──────────────────────────────────────────────
function computeMenuiseriesPost(site, pricePerKwh, segMult, capexScenarioMult, subsidiesPct) {
  const men = site.projectState?.menuiseries;
  if (!men) return null;

  const surfFen = Math.max(0, men.surfaceFenetres ?? 0);
  const surfPor = Math.max(0, men.surfacePortes   ?? 0);
  const U_f_av  = Math.max(0.1, men.uFenetresAvant ?? 5.0);
  const U_f_ap  = Math.max(0.1, men.uFenetresApres ?? 1.6);
  const U_p_av  = Math.max(0.1, men.uPortesAvant   ?? 3.5);
  const U_p_ap  = Math.max(0.1, men.uPortesApres   ?? 1.8);

  const grossCapex = (surfFen * RATE_FENETRE_M2 + surfPor * RATE_PORTE_M2) * segMult * capexScenarioMult;
  const netCapex   = grossCapex * (1 - subsidiesPct / 100);

  const area = Math.max(1, site.identity?.surface ?? 1);
  const conso = site.data.annualConsumptionKwh;

  const deltaUF    = Math.max(0, U_f_av - U_f_ap);
  const deltaUP    = Math.max(0, U_p_av - U_p_ap);
  const effF       = U_f_av > 0 ? deltaUF / U_f_av : 0;
  const effP       = U_p_av > 0 ? deltaUP / U_p_av : 0;
  const envShare   = Math.min(0.35, (surfFen + surfPor) / area);
  const gainPctRaw = Math.min(0.30, envShare * (0.7 * effF + 0.3 * effP));

  const savedKwh = conso * gainPctRaw;
  const savedEur = savedKwh * pricePerKwh;
  const roiYears = savedEur > 0 ? netCapex / savedEur : null;
  const measure  = MEASURES_BY_ID.menuis;

  return {
    id: 'menuis', label: measure?.label ?? 'Menuiseries',
    category: 'enveloppe', priority: 'structurant',
    roiTarget: measure?.roiTarget, description: measure?.description,
    gainRange: measure?.gainRange ?? [0.03, 0.12],
    grossCapex, netCapex, savedKwh, savedEur, roiYears, gainPctRaw,
    detail: { surfFen, surfPor, U_f_av, U_f_ap, U_p_av, U_p_ap }
  };
}

// ─── Poste PV ─────────────────────────────────────────────────────────────────
function computePvPost(site, pricePerKwh, subsidiesPct) {
  const pv = site.projectState?.pv;
  if (!pv?.enabled || !pv.kwc) return null;

  const kWc      = Math.max(0, pv.kwc ?? 0);
  const capexKwc = Math.max(0, pv.capexPerKwc ?? 1400);
  const selfRate = Math.min(1, Math.max(0, pv.selfConsumptionRate ?? 0.7));
  const yieldKwh = Math.max(0, pv.yieldKwhPerKwc ?? 1100);

  const grossCapex = kWc * capexKwc;
  const netCapex   = grossCapex * (1 - subsidiesPct / 100);
  const pvKwhSelf  = kWc * yieldKwh * selfRate;
  const savedEur   = pvKwhSelf * pricePerKwh;
  const roiYears   = savedEur > 0 ? netCapex / savedEur : null;
  const measure    = MEASURES_BY_ID.pv;

  return {
    id: 'pv', label: measure?.label ?? 'Photovoltaïque',
    category: 'production', priority: 'complementaire',
    roiTarget: measure?.roiTarget, description: measure?.description,
    gainRange: [0, 0],
    grossCapex, netCapex,
    savedKwh: pvKwhSelf, savedEur, roiYears, gainPctRaw: 0,
    detail: { kWc, capexKwc, selfRate, yieldKwh, pvKwhSelf }
  };
}

// ─── Audit d'un site pour un scénario donné ───────────────────────────────────
function runSiteAuditForScenario(site, scenarioKey) {
  const updatedSite   = applyConstructionDefaults(site);
  const area          = Math.max(1, updatedSite.identity?.surface ?? 1);
  const conso         = updatedSite.data.annualConsumptionKwh ?? 0;
  const cost          = updatedSite.data.annualCostEur        ?? 0;
  const perfKey       = updatedSite.identity?.buildingPerf    ?? 'Energivore';
  const subsidiesPct  = Math.min(80, Math.max(0, updatedSite.financial?.subsidiesPct ?? 0));
  const segKey        = updatedSite.identity?.customerType    ?? 'tertiaire_prive';
  const segMult       = SEGMENT_MULTIPLIERS[segKey]           ?? 1.0;
  const capGain       = CAP_PERF[perfKey]                     ?? 0.60;
  const climateZone   = updatedSite.identity?.climateZone     ?? 'H2';
  const occupancy     = updatedSite.data?.occupancyHoursPerDay ?? 10;

  const scenario      = SCENARIOS[scenarioKey] ?? SCENARIOS.intermediaire;
  const gainMult      = scenario.gainMultiplier;
  const capexMult     = scenario.capexMultiplier;
  const climatBoost   = CLIMATE_BOOST[climateZone]            ?? 1.0;
  const occupBoost    = occupancy > OCCUPANCY_BOOST_THRESHOLD ? OCCUPANCY_BOOST_FACTOR : 1.0;

  const pricePerKwh   = effectivePrice(updatedSite, { currentKwh: conso, currentCost: cost });
  const co2Factor     = effectiveCo2Factor(updatedSite);
  const envelopeFactor     = computeEnvelopeWeaknessFactor(updatedSite);
  const envelopeDeltaFactor = computeEnvelopeDeltaFactor(updatedSite);

  const selectedIds   = updatedSite.projectState?.selectedMeasures
    ?? MEASURES_CATALOG.map(m => m.id);

  const STD_POSTS = ['gtb', 'led', 'etancheite', 'vmc', 'toiture', 'murs', 'plancher_bas', 'generateur'];

  // Gains physiques bruts par poste
  let demandPctRaw  = 0;
  const rawGainByPost = {};
  STD_POSTS.forEach(id => {
    if (!selectedIds.includes(id)) return;
    const measure = MEASURES_BY_ID[id];
    if (!measure) return;
    const raw = physicalGain(id, measure, envelopeFactor, envelopeDeltaFactor, gainMult, climatBoost, occupBoost);
    rawGainByPost[id] = raw;
    demandPctRaw += raw;
  });

  // Cap global
  const cappedPctTotal = Math.min(demandPctRaw, capGain);
  const capRatio = demandPctRaw > 0 ? cappedPctTotal / demandPctRaw : 0;

  const postResults = [];
  let totalSavedKwhStd = 0, totalSavedEurStd = 0;
  let totalGrossCapex  = 0, totalNetCapex    = 0;

  STD_POSTS.forEach(id => {
    if (!selectedIds.includes(id)) return;
    const effectivePct = (rawGainByPost[id] ?? 0) * capRatio;
    const r = computeStandardPost(id, updatedSite, effectivePct, pricePerKwh, segMult, capexMult, area, subsidiesPct);
    if (!r) return;
    postResults.push(r);
    totalSavedKwhStd += r.savedKwh;
    totalSavedEurStd += r.savedEur;
    totalGrossCapex  += r.grossCapex;
    totalNetCapex    += r.netCapex;
  });

  // Menuiseries
  if (selectedIds.includes('menuis')) {
    const r = computeMenuiseriesPost(updatedSite, pricePerKwh, segMult, capexMult, subsidiesPct);
    if (r) {
      const cappedGain = Math.min(r.gainPctRaw, Math.max(0, capGain - cappedPctTotal));
      const ratio = r.gainPctRaw > 0 ? cappedGain / r.gainPctRaw : 0;
      r.savedKwh  *= ratio; r.savedEur  *= ratio;
      r.gainPctRaw = cappedGain;
      r.roiYears   = r.savedEur > 0 ? r.netCapex / r.savedEur : null;
      postResults.push(r);
      totalSavedKwhStd += r.savedKwh; totalSavedEurStd += r.savedEur;
      totalGrossCapex  += r.grossCapex; totalNetCapex    += r.netCapex;
    }
  }

  // PV
  let pvSavedEur = 0;
  if (selectedIds.includes('pv')) {
    const r = computePvPost(updatedSite, pricePerKwh, subsidiesPct);
    if (r) {
      postResults.push(r);
      pvSavedEur      += r.savedEur;
      totalGrossCapex += r.grossCapex;
      totalNetCapex   += r.netCapex;
    }
  }

  const totalSavedEur   = totalSavedEurStd + pvSavedEur;
  const consoOpt        = Math.max(0, conso - totalSavedKwhStd);
  const costOpt         = Math.max(0, (cost > 0 ? cost : conso * pricePerKwh) - totalSavedEur);
  const gainPctTotal    = conso > 0 ? (totalSavedKwhStd / conso) * 100 : 0;
  const roiGlobal       = totalSavedEur > 0 ? totalNetCapex / totalSavedEur : null;
  const co2Saved        = co2Factor > 0 ? totalSavedKwhStd * co2Factor : 0;
  const intensityBefore = conso / area;
  const intensityAfter  = consoOpt / area;
  const dpeBefore       = dpeClass(intensityBefore);
  const dpeAfter        = dpeClass(intensityAfter);
  const currentEmissions   = computeCurrentEmissions(updatedSite);
  const projectedEmissions = computeProjectedEmissions(consoOpt, updatedSite);
  const avoidedEmissions   = currentEmissions - projectedEmissions;

  const recommended = {
    gainPct: Math.round(gainPctTotal), roiYears: roiGlobal,
    netCapex: totalNetCapex, savingsEur: totalSavedEur,
    avoidedEmissions, currentKwh: conso, projectedKwh: consoOpt,
    currentEmissions, projectedEmissions
  };

  const score         = computeSiteScore(updatedSite, recommended);
  const labels        = computeEnergyClimateLabels(recommended, area);
  const priorityIndex = computePriorityIndex(updatedSite, recommended, labels, score);
  const priorities    = buildPriorities(postResults, roiGlobal, totalSavedEur, totalNetCapex, co2Saved);

  return {
    siteId     : updatedSite.id,
    siteName   : updatedSite.identity?.name ?? 'Site',
    scenarioKey,
    scenarioLabel: scenario.label,
    score, priorityIndex,
    energyLabel: labels.energyLabel, climateLabel: labels.climateLabel,
    energyIntensity: labels.energyIntensity, climateIntensity: labels.climateIntensity,
    area, currentKwh: conso, consoOpt,
    currentCost: cost > 0 ? cost : conso * pricePerKwh, costOpt,
    gainPctTotal  : Math.round(gainPctTotal * 10) / 10,
    capGainPct    : Math.round(capGain * 100),
    climateZone, occupancy,
    intensityBefore: Math.round(intensityBefore),
    intensityAfter : Math.round(intensityAfter),
    dpeBefore, dpeAfter,
    totalGrossCapex, totalNetCapex, totalSavedEur, totalSavedEurStd, pvSavedEur,
    roiGlobal, avgRatePerM2: totalGrossCapex / area,
    pricePerKwh, co2Factor, co2Saved,
    currentEmissions, projectedEmissions, avoidedEmissions,
    postResults: postResults.sort((a, b) => (a.roiYears ?? 999) - (b.roiYears ?? 999)),
    priorities,
    recommendedScenario: recommended
  };
}

// ─── Audit complet d'un site (3 scénarios) ───────────────────────────────────
export function runSiteAudit(site) {
  const results = {};
  Object.keys(SCENARIOS).forEach(key => {
    results[key] = runSiteAuditForScenario(site, key);
  });
  // Le scénario "recommended" est celui par défaut du projet (ou intermédiaire)
  const defaultKey = site.projectState?.scenario ?? 'intermediaire';
  return {
    ...results[defaultKey],          // propriétés plates du scénario par défaut
    scenarios : results,             // les 3 scénarios complets
    activeScenario: defaultKey
  };
}

// ─── Priorités dynamiques ─────────────────────────────────────────────────────
function buildPriorities(postResults, roiGlobal, totalSavedEur, totalNetCapex, co2Saved) {
  const items = [];
  const sorted = [...postResults]
    .filter(r => r.category !== 'production' && r.roiYears !== null && isFinite(r.roiYears))
    .sort((a, b) => a.roiYears - b.roiYears);

  sorted.slice(0, 2).forEach((r, i) => {
    items.push({
      rank: i + 1, type: 'poste', title: r.label,
      text: `ROI ${r.roiYears !== null ? r.roiYears.toFixed(1).replace('.', ',') + ' ans' : '—'} · économies ${fmtEur(r.savedEur)}/an · investissement net ${fmtEur(r.netCapex)}.`
    });
  });
  items.push({
    rank: items.length + 1, type: 'global', title: 'ROI global',
    text: roiGlobal !== null && isFinite(roiGlobal)
      ? `Retour sur investissement global estimé à ${roiGlobal.toFixed(1).replace('.', ',')} ans pour ${fmtEur(totalNetCapex)} investis.`
      : "ROI non calculable — vérifiez les données d'entrée."
  });
  if (co2Saved > 0) {
    items.push({
      rank: items.length + 1, type: 'carbone', title: 'Impact carbone',
      text: `Environ ${Math.round(co2Saved).toLocaleString('fr-FR')} kg CO₂ évités par an, soit ${(co2Saved / 1000).toFixed(1).replace('.', ',')} tCO₂.`
    });
  }
  return items;
}

// ─── Audit portefeuille ───────────────────────────────────────────────────────
export function runAudit(project) {
  const sitesResults = project.sites.map(runSiteAudit);
  const portfolio    = computePortfolio(sitesResults);
  return { sitesResults, portfolio };
}
