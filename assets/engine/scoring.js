/** Scoring technique (0–100) — pondéré sur qualité données, gain, ROI, énergie fossile. */
export function computeSiteScore(site, recommended) {
  let score = 0;
  const dq = site.data?.dataQuality ?? 'medium';
  if (dq === 'good') score += 20;
  else if (dq === 'medium') score += 12;
  else score += 5;

  const gain = recommended.gainPct ?? 0;
  if (gain >= 40) score += 30;
  else if (gain >= 25) score += 20;
  else if (gain >= 10) score += 12;
  else score += 5;

  const roi = recommended.roiYears;
  if (roi !== null && isFinite(roi)) {
    if (roi <= 5) score += 25;
    else if (roi <= 8) score += 18;
    else if (roi <= 12) score += 10;
    else score += 5;
  }

  const he = site.currentState?.heatingEnergy;
  if (he === 'fioul') score += 15;
  else if (he === 'gaz') score += 8;

  if (site.currentState?.gtbLevel === 'aucune') score += 10;

  return Math.min(score, 100);
}

export function energyClassFromIntensity(intensity) {
  if (!Number.isFinite(intensity)) return '-';
  if (intensity <= 70) return 'A';
  if (intensity <= 110) return 'B';
  if (intensity <= 180) return 'C';
  if (intensity <= 250) return 'D';
  if (intensity <= 330) return 'E';
  if (intensity <= 420) return 'F';
  return 'G';
}

export function climateClassFromIntensity(intensityKgCo2M2) {
  if (!Number.isFinite(intensityKgCo2M2)) return '-';
  if (intensityKgCo2M2 <= 6) return 'A';
  if (intensityKgCo2M2 <= 11) return 'B';
  if (intensityKgCo2M2 <= 30) return 'C';
  if (intensityKgCo2M2 <= 50) return 'D';
  if (intensityKgCo2M2 <= 70) return 'E';
  if (intensityKgCo2M2 <= 100) return 'F';
  return 'G';
}

export function computeEnergyClimateLabels(recommended, area) {
  const safeArea = Math.max(1, Number(area) || 1);
  const energyIntensity = (recommended?.projectedKwh ?? 0) / safeArea;
  const climateIntensity = (recommended?.projectedEmissions ?? 0) / safeArea;
  return {
    energyLabel: energyClassFromIntensity(energyIntensity),
    climateLabel: climateClassFromIntensity(climateIntensity),
    energyIntensity,
    climateIntensity
  };
}

function classSeverity(label) {
  return ({ A: 0, B: 15, C: 30, D: 50, E: 70, F: 85, G: 100 }[label] ?? 50);
}

/**
 * Indice interne de priorité technique (0–100).
 * Sert au classement multi-sites sans exposer un "score commercial" à l'utilisateur.
 */
export function computePriorityIndex(site, recommended, labels, siteScore) {
  const gain = recommended?.gainPct ?? 0;
  const roi = recommended?.roiYears;
  let score = 0;

  score += (100 - (siteScore ?? 50)) * 0.35;
  score += Math.min(100, gain * 2) * 0.25;
  score += classSeverity(labels?.energyLabel) * 0.20;
  score += classSeverity(labels?.climateLabel) * 0.20;

  if (Number.isFinite(roi)) {
    if (roi <= 5) score += 6;
    else if (roi <= 10) score += 3;
  }
  if (site.currentState?.heatingEnergy === 'fioul') score += 6;
  if (site.currentState?.gtbLevel === 'aucune') score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}
