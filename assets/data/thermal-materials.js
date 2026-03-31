/**
 * thermal-materials.js — EcoVerta v7
 *
 * Données de référence pour le calcul de la résistance thermique R (m²K/W)
 * et du coefficient Uw (W/m²K) à partir du type d'isolant et de l'épaisseur.
 *
 * Formule : R = épaisseur (m) / λ (W/m·K)
 * Pour les fenêtres : Uw est une valeur tabulée (pas de calcul par épaisseur).
 */

// ─── Isolants — toiture & plancher bas ───────────────────────────────────────
export const INSULATION_MATERIALS = [
  // Isolants synthétiques
  { id:'laine_verre',  label:'Laine de verre',        lambda:0.035, unit:'mm', min:40, max:400, step:10, category:'mineral' },
  { id:'laine_roche',  label:'Laine de roche',         lambda:0.036, unit:'mm', min:40, max:300, step:10, category:'mineral' },
  { id:'laine_bois',   label:'Laine de bois (fibre)',  lambda:0.038, unit:'mm', min:40, max:300, step:10, category:'biosource' },
  { id:'ouate_cell',   label:'Ouate de cellulose',     lambda:0.040, unit:'mm', min:60, max:400, step:20, category:'biosource' },
  { id:'pse',          label:'PSE (polystyrène expansé)',lambda:0.032, unit:'mm', min:40, max:300, step:10, category:'synthetic' },
  { id:'xps',          label:'XPS (polystyrène extrudé)',lambda:0.030, unit:'mm', min:40, max:200, step:10, category:'synthetic' },
  { id:'pu_rigide',    label:'Mousse polyuréthane rigide',lambda:0.023,unit:'mm', min:40, max:200, step:10, category:'synthetic' },
  { id:'liege',        label:'Liège expansé',          lambda:0.040, unit:'mm', min:40, max:200, step:10, category:'biosource' },
  { id:'vip',          label:'Panneau sous vide (VIP)', lambda:0.008, unit:'mm', min:10, max:60,  step:5,  category:'performance' },
  { id:'chanvre',      label:'Chanvre (panneau)',       lambda:0.040, unit:'mm', min:60, max:300, step:20, category:'biosource' },
  { id:'ouate_proj',   label:'Ouate projetée (vrac)',   lambda:0.040, unit:'mm', min:80, max:500, step:20, category:'biosource' },
];

// Isolants spécifiques murs (ITE / ITI)
export const WALL_MATERIALS = [
  ...INSULATION_MATERIALS.filter(m => !['vip'].includes(m.id)),
  { id:'ite_composite',label:'Système ITE composite (enduit)',lambda:0.032,unit:'mm',min:60,max:300,step:10,category:'synthetic' },
  { id:'iti_plaque',   label:'ITI — doublage plaque (BA13)',  lambda:0.032,unit:'mm',min:40,max:160,step:10,category:'synthetic' },
];

// ─── Fenêtres — valeurs Uw tabulées ──────────────────────────────────────────
export const WINDOW_TYPES = [
  {
    id:'sg',        label:'Simple vitrage',             Uw:5.0,
    description:'Vitrage unique, très déperditivite. Courant avant 1975.',
    glazing:'simple', frame:'bois_alu'
  },
  {
    id:'dv_ancien', label:'Double vitrage ancien (fin)', Uw:3.0,
    description:'Double vitrage des années 1980-90, lame d\'air ≤ 10 mm.',
    glazing:'double', frame:'bois_alu'
  },
  {
    id:'dv_std',    label:'Double vitrage standard',    Uw:2.6,
    description:'Double vitrage classique avec lame d\'air 16 mm.',
    glazing:'double', frame:'pvc_alu'
  },
  {
    id:'dv_perf',   label:'Double vitrage performant (4/16/4 Ar)', Uw:1.6,
    description:'Double vitrage argon + couche low-e. Standard RT 2012.',
    glazing:'double', frame:'pvc_alu'
  },
  {
    id:'dv_hp',     label:'Double vitrage haute performance', Uw:1.3,
    description:'Double vitrage renforcé, couche low-e améliorée.',
    glazing:'double', frame:'pvc_alu_perf'
  },
  {
    id:'tv_std',    label:'Triple vitrage standard',    Uw:1.0,
    description:'Triple vitrage argon, idéal zones H1 et BBC.',
    glazing:'triple', frame:'pvc_alu'
  },
  {
    id:'tv_perf',   label:'Triple vitrage haute performance', Uw:0.7,
    description:'Triple vitrage krypton + triple couche low-e. Passif.',
    glazing:'triple', frame:'bois_alu_perf'
  },
];

// ─── Portes ───────────────────────────────────────────────────────────────────
export const DOOR_TYPES = [
  { id:'pleine_old',  label:'Pleine ancienne non isolée', Ud:3.5 },
  { id:'pleine_iso',  label:'Pleine isolée (mousse PU)',  Ud:1.8 },
  { id:'vitree_old',  label:'Vitrée ancienne',            Ud:3.0 },
  { id:'vitree_iso',  label:'Vitrée isolée',              Ud:1.6 },
  { id:'alu_iso',     label:'Aluminium isolée classe 4',  Ud:1.4 },
];

// ─── Helper : calcul R depuis matériau + épaisseur ────────────────────────────
export function computeR(materialId, thicknessMm) {
  const mat = INSULATION_MATERIALS.find(m => m.id === materialId)
           ?? WALL_MATERIALS.find(m => m.id === materialId);
  if (!mat || !thicknessMm) return null;
  return Math.round((thicknessMm / 1000 / mat.lambda) * 100) / 100; // arrondi à 0,01
}

export function computeUw(windowTypeId) {
  const win = WINDOW_TYPES.find(w => w.id === windowTypeId);
  return win?.Uw ?? null;
}

export function computeUd(doorTypeId) {
  const door = DOOR_TYPES.find(d => d.id === doorTypeId);
  return door?.Ud ?? null;
}
