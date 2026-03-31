import { CONSTRUCTION_PERIODS } from '../data/construction-periods.js';
import { USAGE_PROFILES } from '../data/usage-profiles.js';

function options(list, valueKey = 'id', labelKey = 'label') {
  return list.map(item => `<option value="${item[valueKey]}">${item[labelKey]}</option>`).join('');
}

export function renderSiteForm(site) {
  return `
    <div class="ev-grid g3">
      <div class="ev-field">
        <label>Nom du site</label>
        <input class="ev-input" data-bind="identity.name" value="${site.identity.name}" />
      </div>
      <div class="ev-field">
        <label>Usage</label>
        <select class="ev-select" data-bind="identity.usage">${options(USAGE_PROFILES)}</select>
      </div>
      <div class="ev-field">
        <label>Surface (m²)</label>
        <input class="ev-input" type="number" min="0" data-bind="identity.surface" value="${site.identity.surface}" />
      </div>
      <div class="ev-field">
        <label>Période de construction</label>
        <select class="ev-select" data-bind="identity.constructionPeriod">${options(CONSTRUCTION_PERIODS)}</select>
      </div>
      <div class="ev-field">
        <label>Consommation annuelle (kWh)</label>
        <input class="ev-input" type="number" min="0" data-bind="data.annualConsumptionKwh" value="${site.data.annualConsumptionKwh}" />
      </div>
      <div class="ev-field">
        <label>Coût annuel (€)</label>
        <input class="ev-input" type="number" min="0" data-bind="data.annualCostEur" value="${site.data.annualCostEur}" />
      </div>
    </div>
  `;
}
