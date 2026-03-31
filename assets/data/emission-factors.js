export const EMISSION_FACTORS = {
  electricite: { label: 'Électricité', kgco2ePerKwh: 0.055 },
  gaz: { label: 'Gaz naturel', kgco2ePerKwh: 0.204 },
  fioul: { label: 'Fioul', kgco2ePerKwh: 0.300 },
  bois: { label: 'Bois', kgco2ePerKwh: 0.030 },
  granules: { label: 'Granulés bois', kgco2ePerKwh: 0.035 },
  reseau_chaleur: { label: 'Réseau de chaleur', kgco2ePerKwh: 0.150 }
};

export function getEmissionFactor(energy) {
  return EMISSION_FACTORS[energy]?.kgco2ePerKwh ?? 0.055;
}
