export function computeSystemFactor(site) {
  let factor = 1;
  const heating = site.currentState.heatingSystem;
  const gtb = site.currentState.gtbLevel;
  const lighting = site.currentState.lighting;

  if (heating === 'chaudiere_fioul') factor += 0.18;
  if (heating === 'chaudiere_gaz') factor += 0.10;
  if (gtb === 'aucune') factor += 0.08;
  if (lighting === 'fluocompact') factor += 0.04;

  return factor;
}

export function computeFutureSystemGain(site) {
  let gain = 0;
  if (site.projectState.heatingReplacement !== 'aucun') gain += 0.18;
  if (site.projectState.gtbUpgrade !== 'aucun') gain += 0.08;
  if (site.projectState.lightingUpgrade === 'led') gain += 0.07;
  if (site.projectState.ventilationUpgrade === 'double_flux') gain += 0.06;
  return Math.min(gain, 0.35);
}
