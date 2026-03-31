/**
 * charts.js — Visualisations SVG inline sans dépendance externe.
 * Utilisé dans results-view pour le comparatif de scénarios.
 */

/**
 * Barre de progression colorée avec libellé et valeur.
 * @param {string} label
 * @param {number} value  — valeur absolue (kWh, €, %)
 * @param {number} max    — valeur max pour normaliser la largeur
 * @param {string} color  — couleur CSS
 * @param {string} suffix — unité affichée
 */
export function renderBar({ label, value, max, color = '#18b45b', suffix = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return `
    <div class="ev-bar-row">
      <div class="ev-bar-label">${label}</div>
      <div class="ev-bar-track">
        <div class="ev-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
      </div>
      <div class="ev-bar-value">${Number.isFinite(value) ? value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '—'}${suffix}</div>
    </div>
  `;
}

/**
 * Comparatif des 3 scénarios en barres horizontales groupées.
 * @param {Array} scenarios — tableau de résultats de scénario
 */
export function renderScenarioComparison(scenarios) {
  if (!scenarios?.length) return '';

  const maxGain    = Math.max(...scenarios.map(s => s.gainPct));
  const maxSavings = Math.max(...scenarios.map(s => s.savingsEur));
  const maxCapex   = Math.max(...scenarios.map(s => s.netCapex));

  const COLORS = ['#18b45b', '#2c7b98', '#f0c040'];
  const SCENARIO_COLORS = {
    rapide:    '#18b45b',
    equilibre: '#2c7b98',
    ambitieux: '#f0c040'
  };

  const rows = scenarios.map((s, i) => {
    const color = SCENARIO_COLORS[s.scenarioId] || COLORS[i % COLORS.length];
    return `
      <div class="ev-scenario-block" style="border-left:3px solid ${color}">
        <div class="ev-scenario-name" style="color:${color}">${s.scenarioLabel}</div>
        ${renderBar({ label: 'Gain énergie', value: s.gainPct,    max: maxGain,    color, suffix: ' %' })}
        ${renderBar({ label: 'Économies/an', value: s.savingsEur, max: maxSavings, color, suffix: ' €' })}
        ${renderBar({ label: 'CAPEX net',    value: s.netCapex,   max: maxCapex,   color, suffix: ' €' })}
        <div class="ev-scenario-roi">ROI estimé : <strong>${
          s.roiYears ? s.roiYears.toFixed(1).replace('.', ',') + ' ans' : '—'
        }</strong></div>
      </div>
    `;
  });

  return `<div class="ev-scenario-compare">${rows.join('')}</div>`;
}
