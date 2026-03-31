import { getEmissionFactor, EMISSION_FACTORS } from '../data/emission-factors.js';
export { EMISSION_FACTORS };

export function computeCurrentEmissions(site) {
  const kwh    = site.data.annualConsumptionKwh || 0;
  const factor = getEmissionFactor(site.currentState.heatingEnergy);
  return kwh * factor;
}

export function computeProjectedEmissions(projectedKwh, site) {
  const rep = site.projectState?.heatingReplacement ?? 'aucun';
  const futureEnergy = ['pac_air_eau', 'pac_reversible', 'chaudiere_condensation'].includes(rep)
    ? 'electricite'
    : site.currentState.heatingEnergy;
  return projectedKwh * getEmissionFactor(futureEnergy);
}
