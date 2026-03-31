/**
 * measures-catalog.js — EcoVerta v7
 *
 * gainRange   : [min, max] — fourchette physique de gain par poste (de v5.3)
 * gainPct     : valeur médiane = (min+max)/2, utilisée comme base de calcul
 * capexPerM2  : coût unitaire tertiaire privé (€/m² SHON)
 * SCENARIOS   : 3 niveaux d'ambition avec gainMultiplier et capexMultiplier
 */

export const SEGMENT_MULTIPLIERS = {
  tertiaire_prive : 1.00,
  public          : 1.15,
  copropriete     : 1.10,
  industrie       : 0.95
};

export const CAP_PERF = {
  Tres        : 0.70,
  Energivore  : 0.60,
  Insuffisante: 0.50,
  Convenable  : 0.25,
  Bonne       : 0.12
};

/** Boost zone climatique sur les postes enveloppe et CVC. */
export const CLIMATE_BOOST = { H1: 1.07, H2: 1.00, H3: 0.95 };

/** Boost occupation (heures/jour > 11 → +6% sur GTB et éclairage). */
export const OCCUPANCY_BOOST_THRESHOLD = 11;
export const OCCUPANCY_BOOST_FACTOR    = 1.06;
export const OCCUPANCY_SENSITIVE_POSTS = ['gtb', 'led'];

/**
 * 3 scénarios d'ambition (de v5.3) :
 *  - gainMultiplier  : appliqué à gainPct de chaque poste
 *  - capexMultiplier : appliqué au capexPerM2
 */
export const SCENARIOS = {
  sobriete: {
    id             : 'sobriete',
    label          : 'Sobriété',
    description    : 'Quick wins, exploitation, réglages — investissements modérés.',
    gainMultiplier : 0.78,
    capexMultiplier: 0.72,
    tags           : ['Faible CAPEX', 'Quick wins', 'ROI rapide']
  },
  intermediaire: {
    id             : 'intermediaire',
    label          : 'Intermédiaire',
    description    : 'Équilibre entre gains structurels, systèmes et budget.',
    gainMultiplier : 1.00,
    capexMultiplier: 1.00,
    tags           : ['Équilibré', 'Travaux ciblés', 'Trajectoire réaliste']
  },
  ambitieux: {
    id             : 'ambitieux',
    label          : 'Ambitieux',
    description    : 'Rénovation profonde, massification, décarbonation forte.',
    gainMultiplier : 1.18,
    capexMultiplier: 1.22,
    tags           : ['Décarbonation', 'Vision long terme', 'Impact fort']
  }
};

export const MEASURES_CATALOG = [
  {
    id          : 'gtb',
    label       : 'GTB / pilotage',
    category    : 'pilotage',
    priority    : 'quick_win',
    gainRange   : [0.06, 0.12],
    gainPct     : 0.08,
    capexPerM2  : 18,
    roiTarget   : '≤ 3 ans',
    description : 'Régulation, télégestion, optimisation des plages de fonctionnement.'
  },
  {
    id          : 'led',
    label       : 'Éclairage LED + détection',
    category    : 'eclairage',
    priority    : 'quick_win',
    gainRange   : [0.05, 0.10],
    gainPct     : 0.07,
    capexPerM2  : 20,
    roiTarget   : '≤ 4 ans',
    description : 'Relampage LED, capteurs de présence et lumière naturelle.'
  },
  {
    id          : 'etancheite',
    label       : "Étanchéité à l'air",
    category    : 'enveloppe',
    priority    : 'quick_win',
    gainRange   : [0.02, 0.05],
    gainPct     : 0.03,
    capexPerM2  : 12,
    roiTarget   : '≤ 5 ans',
    description : "Traitement des ponts thermiques et fuites d'air parasite."
  },
  {
    id          : 'vmc',
    label       : 'Ventilation double flux',
    category    : 'cvc',
    priority    : 'structurant',
    gainRange   : [0.05, 0.11],
    gainPct     : 0.08,
    capexPerM2  : 69,
    roiTarget   : '5–10 ans',
    description : "Récupération de chaleur sur l'air extrait (η ≥ 80 %)."
  },
  {
    id          : 'toiture',
    label       : 'Isolation toiture / combles',
    category    : 'enveloppe',
    priority    : 'structurant',
    gainRange   : [0.08, 0.16],
    gainPct     : 0.14,
    capexPerM2  : 55,
    roiTarget   : '5–8 ans',
    description : "Isolation par l'extérieur ou en soufflage — R ≥ 6 m²K/W."
  },
  {
    id          : 'murs',
    label       : 'Isolation murs (ITE / ITI)',
    category    : 'enveloppe',
    priority    : 'structurant',
    gainRange   : [0.08, 0.18],
    gainPct     : 0.12,
    capexPerM2  : 138,
    roiTarget   : '8–15 ans',
    description : 'Isolation thermique extérieure ou intérieure — R ≥ 3,7 m²K/W.'
  },
  {
    id          : 'plancher_bas',
    label       : 'Isolation plancher bas',
    category    : 'enveloppe',
    priority    : 'structurant',
    gainRange   : [0.04, 0.09],
    gainPct     : 0.06,
    capexPerM2  : 42,
    roiTarget   : '6–12 ans',
    description : 'Isolation sous dalle, sous-face ou vide sanitaire — R ≥ 3,0 m²K/W.'
  },
  {
    id          : 'generateur',
    label       : 'Générateur (chaudière / PAC)',
    category    : 'cvc',
    priority    : 'structurant',
    gainRange   : [0.12, 0.24],
    gainPct     : 0.20,
    capexPerM2  : 92,
    roiTarget   : '6–12 ans',
    description : 'Remplacement chaudière fioul/gaz par PAC haute performance ou chaudière condensation.'
  },
  {
    id          : 'menuis',
    label       : 'Menuiseries (fenêtres + portes)',
    category    : 'enveloppe',
    priority    : 'structurant',
    gainRange   : [0.03, 0.12],
    gainPct     : null,  // calculé dynamiquement via delta-U × surface
    capexPerM2  : null,  // calculé via surfaces saisies
    roiTarget   : '8–20 ans',
    description : 'Remplacement simple vitrage ou vitrage ancien par double/triple vitrage.'
  },
  {
    id          : 'pv',
    label       : 'Photovoltaïque',
    category    : 'production',
    priority    : 'complementaire',
    gainRange   : [0.00, 0.00],
    gainPct     : null,  // calculé via kWc / productible / autoconsommation
    capexPerM2  : null,
    roiTarget   : '5–10 ans',
    description : 'Production solaire autoconsommée — réduction de la facture électrique.'
  }
];

export const MEASURES_BY_ID = Object.fromEntries(
  MEASURES_CATALOG.map(m => [m.id, m])
);
