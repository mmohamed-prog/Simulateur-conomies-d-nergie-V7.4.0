import { energyClassFromIntensity, climateClassFromIntensity } from './scoring.js';

export function computePortfolio(sitesResults) {
  const totals = sitesResults.reduce((acc, site) => {
    acc.surface          += site.area              ?? 0;
    acc.kwhBefore        += site.currentKwh        ?? 0;
    acc.kwhAfter         += site.consoOpt          ?? 0;
    acc.costBefore       += site.currentCost       ?? 0;
    acc.costAfter        += site.costOpt           ?? 0;
    acc.savedEur         += site.totalSavedEur     ?? 0;
    acc.netCapex         += site.totalNetCapex     ?? 0;
    acc.grossCapex       += site.totalGrossCapex   ?? 0;
    acc.avoidedEmissions += site.avoidedEmissions  ?? 0;
    acc.co2Saved         += site.co2Saved          ?? 0;
    acc.score            += site.score             ?? 0;
    acc.priorityIndex    += site.priorityIndex     ?? 0;
    return acc;
  }, {
    surface: 0, kwhBefore: 0, kwhAfter: 0,
    costBefore: 0, costAfter: 0, savedEur: 0,
    netCapex: 0, grossCapex: 0, avoidedEmissions: 0,
    co2Saved: 0, score: 0, priorityIndex: 0
  });

  const count    = Math.max(1, sitesResults.length);
  const gainPct  = totals.kwhBefore > 0
    ? Math.round(((totals.kwhBefore - totals.kwhAfter) / totals.kwhBefore) * 100)
    : 0;

  const energyIntensity  = totals.surface > 0 ? totals.kwhAfter / totals.surface : 0;
  const projEmissions    = sitesResults.reduce((a, s) => a + (s.projectedEmissions ?? 0), 0);
  const climateIntensity = totals.surface > 0 ? projEmissions / totals.surface : 0;

  // ── Agrégation des postes cross-sites (v5.3) ──────────────────────────────
  const measureMap = new Map();
  sitesResults.forEach(site => {
    (site.postResults ?? []).forEach(r => {
      const prev = measureMap.get(r.id) ?? {
        id: r.id, label: r.label, category: r.category,
        priority: r.priority, roiTarget: r.roiTarget, description: r.description,
        savedEur: 0, savedKwh: 0, netCapex: 0, grossCapex: 0, count: 0
      };
      prev.savedEur   += r.savedEur   ?? 0;
      prev.savedKwh   += r.savedKwh   ?? 0;
      prev.netCapex   += r.netCapex   ?? 0;
      prev.grossCapex += r.grossCapex ?? 0;
      prev.count      += 1;
      measureMap.set(r.id, prev);
    });
  });

  const aggregatedMeasures = [...measureMap.values()]
    .map(m => ({
      ...m,
      roiYears: m.savedEur > 0 ? m.netCapex / m.savedEur : null
    }))
    .sort((a, b) => (a.roiYears ?? 999) - (b.roiYears ?? 999));

  return {
    ...totals,
    gainPct,
    avgScore         : Math.round(totals.score / count),
    avgPriorityIndex : Math.round(totals.priorityIndex / count),
    roiYears         : totals.savedEur > 0 ? totals.netCapex / totals.savedEur : null,
    energyLabel      : energyClassFromIntensity(energyIntensity),
    climateLabel     : climateClassFromIntensity(climateIntensity),
    energyIntensity,
    climateIntensity,
    aggregatedMeasures,   // ← nouveau : top actions portefeuille
    ranking: [...sitesResults].sort(
      (a, b) => (b.priorityIndex ?? 0) - (a.priorityIndex ?? 0) || (b.gainPctTotal ?? 0) - (a.gainPctTotal ?? 0)
    )
  };
}
