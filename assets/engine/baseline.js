export function computeBaseline(site) {
  const currentKwh = site.data.annualConsumptionKwh || 0;
  const currentCost = site.data.annualCostEur || 0;
  const surface = Math.max(1, site.identity.surface || 1);
  return {
    currentKwh,
    currentCost,
    intensity: currentKwh / surface,
    dataQuality: site.data.dataQuality
  };
}
