export function createEmptyProject() {
  return {
    meta: {
      projectName  : '',
      customerType : 'tertiaire_prive',
      objective    : 'economies',
      horizon      : '2030',
      createdAt    : new Date().toISOString(),
      updatedAt    : new Date().toISOString()
    },
    contact: { firstName:'', lastName:'', company:'', email:'', phone:'', consent:false },
    settings: { currency:'EUR', locale:'fr-FR' },
    sites: [createEmptySite()]
  };
}

export function createEmptySite() {
  return {
    id: crypto.randomUUID(),
    identity: {
      name              : 'Site 1',
      usage             : 'bureaux',
      surface           : 1000,
      constructionPeriod: '1989_2000',
      climateZone       : 'H2',        // H1 | H2 | H3
      buildingPerf      : 'Energivore',// Tres | Energivore | Insuffisante | Convenable | Bonne
      customerType      : 'tertiaire_prive'
    },
    data: {
      annualConsumptionKwh: 250000,
      annualCostEur       : 30000,
      dataQuality         : 'medium',
      occupancyHoursPerDay: 10,
      hasSubmetering      : false,
      electricitySharePct : null
    },
    thermalBefore : null,   // rempli par createEmptyThermalState() au besoin
    thermalAfter  : null,   // état projeté enveloppe
    currentState: {
      heatingEnergy : 'gaz',
      dhwEnergy     : 'gaz',
      coolingEnergy : 'electricite',
      heatingSystem : 'chaudiere_gaz',
      coolingSystem : 'split_ancien',
      ventilation   : 'simple_flux',
      lighting      : 'fluocompact',
      gtbLevel      : 'aucune',
      envelopeSource: 'period_default',
      envelope      : { wallR:null, roofR:null, floorR:null, windowUw:null, infiltrationLevel:null }
    },
    projectState: {
      scenario         : 'intermediaire',    // ← scénario par site
      selectedMeasures : ['gtb','led','toiture','murs','plancher_bas','generateur'],
      heatingReplacement  : 'pac_air_eau',
      dhwReplacement      : 'thermodynamique',
      coolingReplacement  : 'pac_reversible',
      ventilationUpgrade  : 'double_flux',
      lightingUpgrade     : 'led',
      gtbUpgrade          : 'gtb_b',
      envelopeUpgrade     : { walls:true, roof:true, floor:false, windows:true, airtightness:true },
      menuiseries: {
        surfaceFenetres : 120,
        surfacePortes   : 20,
        uFenetresAvant  : 5.0,
        uFenetresApres  : 1.6,
        uPortesAvant    : 3.5,
        uPortesApres    : 1.8
      },
      pv: {
        enabled            : false,
        kwc                : 0,
        capexPerKwc        : 1400,
        selfConsumptionRate: 0.70,
        yieldKwhPerKwc     : 1100
      }
    },
    financial: { subsidiesPct:20, priceOverrideEurPerKwh:null }
  };
}

// ─── Helper : état thermique vide (avant ou après) ───────────────────────────
export function createEmptyThermalState() {
  return {
    // Toiture
    roofInsulationType    : null,    // id matériau
    roofInsulationThickness: null,   // mm
    roofR                 : null,    // m²K/W (calculé ou saisi)
    roofRMode             : 'calc',  // 'calc' | 'manual'
    // Murs
    wallInsulationType    : null,
    wallInsulationThickness: null,
    wallR                 : null,
    wallRMode             : 'calc',
    // Plancher bas
    floorInsulationType   : null,
    floorInsulationThickness: null,
    floorR                : null,
    floorRMode            : 'calc',
    // Fenêtres
    windowType            : null,    // id type fenêtre
    windowUw              : null,    // W/m²K (de la table ou manuel)
    windowUwMode          : 'table', // 'table' | 'manual'
    // Portes
    doorType              : null,
    doorUd                : null,
  };
}
