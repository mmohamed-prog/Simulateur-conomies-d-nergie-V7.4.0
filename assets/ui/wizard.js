/**
 * wizard.js — EcoVerta v7
 * Approche event delegation sur rootEl pour éviter les problèmes de timing
 */

import { clone } from '../core/helpers.js';
import { createEmptySite, createEmptyThermalState } from '../core/state.js';
import { renderThermalForm, bindThermalForm } from './thermal-form.js';
import { renderSiteForm } from './site-form.js';
import { MEASURES_CATALOG, SCENARIOS } from '../data/measures-catalog.js';
import { WINDOW_TYPES, DOOR_TYPES } from '../data/thermal-materials.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getNestedValue(obj, path) {
  return path.split('.').reduce((ref, key) => ref?.[key], obj);
}
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let ref = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!ref[parts[i]]) ref[parts[i]] = {};
    ref = ref[parts[i]];
  }
  ref[parts[parts.length - 1]] = value;
}
function syncInputValue(input, value) {
  if (input.tagName === 'SELECT') {
    const opt = [...input.options].find(o => o.value === String(value ?? ''));
    if (opt) input.value = opt.value;
  } else if (input.type === 'checkbox') {
    input.checked = !!value;
  } else {
    input.value = value ?? '';
  }
}

// ─── U-values fenêtres/portes ─────────────────────────────────────────────────
const uVal  = (o) => o.Uw ?? o.Ud ?? o.U ?? '';
const uOpts = (list, current) => list.map(o => {
  const v = uVal(o);
  return `<option value="${v}" ${String(v) === String(current ?? '') ? 'selected' : ''}>${o.label} (U=${v || '—'})</option>`;
}).join('');

// ─── Rendu état actuel (systèmes) ─────────────────────────────────────────────
function renderCurrentSiteForm(site) {
  const env = site.currentState.envelope;
  return `
    <div class="ev-grid g3" data-site-form>
      <div class="ev-field"><label>Performance du bâtiment</label>
        <select class="ev-select" data-bind="identity.buildingPerf">
          <option value="Tres">Très énergivore (&gt; 420 kWh/m²)</option>
          <option value="Energivore">Énergivore (330–420 kWh/m²)</option>
          <option value="Insuffisante">Insuffisante (250–330 kWh/m²)</option>
          <option value="Convenable">Convenable (110–250 kWh/m²)</option>
          <option value="Bonne">Bonne (&lt; 110 kWh/m²)</option>
        </select></div>
      <div class="ev-field"><label>Zone climatique</label>
        <select class="ev-select" data-bind="identity.climateZone">
          <option value="H1">H1 — Nord / altitude (froid)</option>
          <option value="H2">H2 — Centre (tempéré)</option>
          <option value="H3">H3 — Sud / Méditerranée (doux)</option>
        </select></div>
      <div class="ev-field"><label>Occupation (h/jour)</label>
        <input class="ev-input" type="number" min="1" max="24" step="1"
          data-bind="data.occupancyHoursPerDay"
          value="${site.data.occupancyHoursPerDay ?? 10}" /></div>
      <div class="ev-field"><label>Énergie chauffage</label>
        <select class="ev-select" data-bind="currentState.heatingEnergy">
          <option value="gaz">Gaz naturel</option>
          <option value="fioul">Fioul</option>
          <option value="electricite">Électricité</option>
          <option value="reseau_chaleur">Réseau de chaleur</option>
          <option value="bois">Bois</option>
          <option value="granules">Granulés bois</option>
        </select></div>
      <div class="ev-field"><label>Système chauffage</label>
        <select class="ev-select" data-bind="currentState.heatingSystem">
          <option value="chaudiere_gaz">Chaudière gaz</option>
          <option value="chaudiere_fioul">Chaudière fioul</option>
          <option value="effet_joule">Électrique direct</option>
          <option value="pac">PAC existante</option>
        </select></div>
      <div class="ev-field"><label>GTB actuelle</label>
        <select class="ev-select" data-bind="currentState.gtbLevel">
          <option value="aucune">Aucune</option>
          <option value="partielle">Partielle</option>
          <option value="avancee">Avancée</option>
        </select></div>
      <div class="ev-field"><label>Éclairage actuel</label>
        <select class="ev-select" data-bind="currentState.lighting">
          <option value="incandescent">Incandescent</option>
          <option value="fluocompact">Fluocompact</option>
          <option value="led">LED</option>
        </select></div>
      <div class="ev-field"><label>Qualité des données</label>
        <select class="ev-select" data-bind="data.dataQuality">
          <option value="low">Faible (estimation)</option>
          <option value="medium">Moyenne (factures)</option>
          <option value="good">Bonne (sous-comptage)</option>
        </select></div>
      <div class="ev-field"><label>R murs (m²K/W)</label>
        <input class="ev-input" type="number" min="0" step="0.1"
          data-bind="currentState.envelope.wallR"
          value="${env.wallR ?? ''}" placeholder="Ex. 1.5" /></div>
      <div class="ev-field"><label>R toiture (m²K/W)</label>
        <input class="ev-input" type="number" min="0" step="0.1"
          data-bind="currentState.envelope.roofR"
          value="${env.roofR ?? ''}" placeholder="Ex. 3.0" /></div>
      <div class="ev-field"><label>Uw fenêtres (W/m²K)</label>
        <input class="ev-input" type="number" min="0" step="0.1"
          data-bind="currentState.envelope.windowUw"
          value="${env.windowUw ?? ''}" placeholder="Ex. 2.4" /></div>
    </div>`;
}

// ─── Rendu état projeté ───────────────────────────────────────────────────────
function renderProjectedSiteForm(site) {
  const sel = site.projectState?.selectedMeasures ?? [];
  const men = site.projectState?.menuiseries ?? {};
  const pv  = site.projectState?.pv ?? {};
  const fin = site.financial ?? {};
  const activeScenario = site.projectState?.scenario ?? 'intermediaire';

  const scenarioCards = Object.values(SCENARIOS).map(sc => {
    const active = sc.id === activeScenario;
    return `
      <label class="ev-scenario-card ${active ? 'is-active' : ''}" style="cursor:pointer;">
        <input type="radio" name="scenario_${site.id}" value="${sc.id}"
          class="scenario-radio" ${active ? 'checked' : ''} style="display:none;">
        <div class="ev-scenario-card__head">
          <strong>${sc.label}</strong>
          <div class="ev-scenario-card__tags">
            ${sc.tags.map(t => `<span class="ev-tag">${t}</span>`).join('')}
          </div>
        </div>
        <p class="ev-scenario-card__desc">${sc.description}</p>
        <div class="ev-scenario-card__mults">
          <span>Gain ×${sc.gainMultiplier}</span>
          <span>CAPEX ×${sc.capexMultiplier}</span>
        </div>
      </label>`;
  }).join('');

  const postChecks = MEASURES_CATALOG.map(m => `
    <label class="ev-check" style="cursor:pointer;">
      <input type="checkbox" class="cb-measure" data-measure-id="${m.id}"
        ${sel.includes(m.id) ? 'checked' : ''} />
      <span>${m.label}
        ${m.roiTarget ? `<br><small style="color:#557265;font-weight:400">${m.roiTarget}</small>` : ''}
      </span>
    </label>`).join('');

  return `
    <div data-site-form>
      <div class="ev-section-box">
        <h4>Scénario d'ambition travaux</h4>
        <div class="ev-scenario-row" style="margin-top:10px">${scenarioCards}</div>
      </div>
      <div class="ev-section-box">
        <div class="ev-section-box__head">
          <h4>Postes de travaux</h4>
          <label class="ev-check" style="cursor:pointer;margin:0">
            <input type="checkbox" id="cbAll" /><span>Tout sélectionner</span>
          </label>
        </div>
        <div class="ev-checks" id="postsGrid">${postChecks}</div>
      </div>
      <div class="ev-section-box">
        <h4>Menuiseries (fenêtres + portes)</h4>
        <div class="ev-grid g3" style="margin-top:10px">
          <div class="ev-field"><label>Surface vitrée (m²)</label>
            <input class="ev-input" type="number" min="0" step="1"
              data-bind="projectState.menuiseries.surfaceFenetres"
              value="${men.surfaceFenetres ?? 120}" /></div>
          <div class="ev-field"><label>Fenêtres — avant</label>
            <select class="ev-select" data-bind="projectState.menuiseries.uFenetresAvant">
              ${uOpts(WINDOW_TYPES, men.uFenetresAvant ?? 5.0)}
            </select></div>
          <div class="ev-field"><label>Fenêtres — après</label>
            <select class="ev-select" data-bind="projectState.menuiseries.uFenetresApres">
              ${uOpts(WINDOW_TYPES, men.uFenetresApres ?? 1.6)}
            </select></div>
          <div class="ev-field"><label>Surface portes (m²)</label>
            <input class="ev-input" type="number" min="0" step="1"
              data-bind="projectState.menuiseries.surfacePortes"
              value="${men.surfacePortes ?? 20}" /></div>
          <div class="ev-field"><label>Portes — avant</label>
            <select class="ev-select" data-bind="projectState.menuiseries.uPortesAvant">
              ${uOpts(DOOR_TYPES, men.uPortesAvant ?? 3.5)}
            </select></div>
          <div class="ev-field"><label>Portes — après</label>
            <select class="ev-select" data-bind="projectState.menuiseries.uPortesApres">
              ${uOpts(DOOR_TYPES, men.uPortesApres ?? 1.8)}
            </select></div>
        </div>
      </div>
      <div class="ev-section-box">
        <div class="ev-section-box__head">
          <h4>Photovoltaïque</h4>
          <label class="ev-check" style="cursor:pointer;margin:0">
            <input type="checkbox" id="pvEnabled" ${pv.enabled ? 'checked' : ''} />
            <span>Activer</span>
          </label>
        </div>
        <div class="ev-grid g4" id="pvFields" style="${pv.enabled ? '' : 'display:none'};margin-top:10px">
          <div class="ev-field"><label>Puissance (kWc)</label>
            <input class="ev-input" type="number" min="0" step="1"
              data-bind="projectState.pv.kwc" value="${pv.kwc ?? 0}" /></div>
          <div class="ev-field"><label>Coût (€/kWc)</label>
            <input class="ev-input" type="number" min="0" step="10"
              data-bind="projectState.pv.capexPerKwc" value="${pv.capexPerKwc ?? 1400}" /></div>
          <div class="ev-field"><label>Autoconso. (%)</label>
            <input class="ev-input" type="number" min="0" max="100" step="1"
              id="pvSelfInput" value="${Math.round((pv.selfConsumptionRate ?? 0.7) * 100)}" /></div>
          <div class="ev-field"><label>Productible (kWh/kWc/an)</label>
            <input class="ev-input" type="number" min="0" step="10"
              data-bind="projectState.pv.yieldKwhPerKwc" value="${pv.yieldKwhPerKwc ?? 1100}" /></div>
        </div>
      </div>
      <div class="ev-grid g2">
        <div class="ev-field"><label>Subventions estimées (%)</label>
          <input class="ev-input" type="number" min="0" max="80" step="5"
            data-bind="financial.subsidiesPct" value="${fin.subsidiesPct ?? 20}" /></div>
        <div class="ev-field"><label>Upgrade GTB</label>
          <select class="ev-select" data-bind="projectState.gtbUpgrade">
            <option value="aucun">Aucun</option>
            <option value="gtb_b">GTB classe B</option>
            <option value="gtb_a">GTB classe A</option>
          </select></div>
      </div>
    </div>`;
}

// ─── Wizard factory ───────────────────────────────────────────────────────────
export function createWizard({
  steps, rootEl, stepsNavEl, titleEl, subtitleEl, remainEl, progressFillEl,
  getProject, setProject, onCompute,
  portfolioView, resultsView, leadGate, onReset
}) {
  let currentStep     = 0;
  let activeSiteIndex = 0;
  let currentPhase    = 'systems'; // 'systems' | 'envelope-before' | 'envelope-after'

  // ── patchProject ──────────────────────────────────────────────────────────
  function patchProject(path, value, siteIndex = 0) {
    const project = clone(getProject());
    const isSite  = path.startsWith('site:');
    const root    = isSite ? project.sites[siteIndex] : project;
    const realPath = isSite ? path.replace('site:', '') : path;
    setNestedValue(root, realPath, value);
    project.meta.updatedAt = new Date().toISOString();
    setProject(project);
  }

  // ── Bindings génériques ───────────────────────────────────────────────────
  function bindProjectInputs(scope) {
    scope.querySelectorAll('[data-project-bind]').forEach(input => {
      const path = input.dataset.projectBind;
      syncInputValue(input, getNestedValue(getProject(), path));
      input.addEventListener('input', () => {
        const v = input.type === 'checkbox' ? input.checked
          : input.type === 'number' ? Number(input.value) : input.value;
        patchProject(path, v);
      });
    });
  }

  function bindSiteInputs(scope, siteIndex) {
    scope.querySelectorAll('[data-bind]').forEach(input => {
      const path = input.dataset.bind;
      syncInputValue(input, getNestedValue(getProject().sites[siteIndex], path));
      input.addEventListener('input', () => {
        const v = input.type === 'checkbox' ? input.checked
          : input.type === 'number' ? Number(input.value) : input.value;
        patchProject(`site:${path}`, v, siteIndex);
      });
    });
  }

  // ── Tab bar sites ─────────────────────────────────────────────────────────
  function renderSiteTabBar(container, sites, siteIndex) {
    const bar = container.querySelector('#siteTabBar');
    if (!bar) return;
    bar.innerHTML = sites.map((site, i) => `
      <button type="button" class="ev-site-tab ${i === siteIndex ? 'is-active' : ''}"
        data-site-tab="${i}">
        <span class="ev-site-tab__dot"></span>
        <span class="ev-site-tab__name">${site.identity.name || 'Site ' + (i + 1)}</span>
        ${sites.length > 1 ? `<span class="ev-site-tab__remove" data-site-remove="${i}" title="Supprimer">×</span>` : ''}
      </button>`).join('') +
      `<button type="button" class="ev-site-tab ev-site-tab--add" id="addSiteTabBtn">+ Site</button>`;

    bar.querySelectorAll('[data-site-tab]').forEach(btn => {
      btn.addEventListener('click', e => {
        if (e.target.dataset.siteRemove !== undefined) return;
        activeSiteIndex = Number(btn.dataset.siteTab);
        currentPhase = 'systems';
        renderPanel();
      });
    });
    bar.querySelectorAll('[data-site-remove]').forEach(span => {
      span.addEventListener('click', e => {
        e.stopPropagation();
        const idx = Number(span.dataset.siteRemove);
        if (!confirm(`Supprimer ce site ?`)) return;
        const project = clone(getProject());
        project.sites.splice(idx, 1);
        setProject(project);
        activeSiteIndex = Math.min(activeSiteIndex, project.sites.length - 1);
        currentPhase = 'systems';
        renderPanel();
      });
    });
    bar.querySelector('#addSiteTabBtn')?.addEventListener('click', () => {
      const project = clone(getProject());
      const site = createEmptySite();
      site.identity.name = `Site ${project.sites.length + 1}`;
      project.sites.push(site);
      setProject(project);
      activeSiteIndex = project.sites.length - 1;
      currentPhase = 'systems';
      renderPanel();
    });
  }

  // ── Sync thermal → envelope moteur ───────────────────────────────────────
  function syncThermalToEnvelope(site, phase) {
    if (phase === 'before') {
      const t = site.thermalBefore;
      if (!t) return;
      if (t.wallR   != null) site.currentState.envelope.wallR   = t.wallR;
      if (t.roofR   != null) site.currentState.envelope.roofR   = t.roofR;
      if (t.floorR  != null) site.currentState.envelope.floorR  = t.floorR;
      if (t.windowUw!= null) site.currentState.envelope.windowUw= t.windowUw;
    } else {
      const t = site.thermalAfter;
      if (!t || !site.projectState?.menuiseries) return;
      if (t.windowUw != null) site.projectState.menuiseries.uFenetresApres = t.windowUw;
      if (t.doorUd   != null) site.projectState.menuiseries.uPortesApres   = t.doorUd;
    }
  }

  // ── Panels ────────────────────────────────────────────────────────────────
  function panelProject() {
    const project = getProject();
    return `
      <section class="ev-panel is-active">
        <div class="ev-panel__head">
          <div><div class="ev-eyebrow">Étape 1</div><h2 class="ev-title">Portefeuille &amp; objectif</h2></div>
          <div class="ev-chip ev-chip--soft">Projet</div>
        </div>
        <div class="ev-grid g2">
          <div class="ev-field"><label>Nom du projet</label>
            <input class="ev-input" data-project-bind="meta.projectName"
              value="${project.meta.projectName}" placeholder="Ex. Portefeuille Île-de-France" /></div>
          <div class="ev-field"><label>Type de client</label>
            <select class="ev-select" data-project-bind="meta.customerType">
              <option value="tertiaire_prive">Tertiaire privé</option>
              <option value="public">Secteur public</option>
              <option value="copropriete">Copropriété</option>
              <option value="industrie">Industrie</option>
            </select></div>
          <div class="ev-field"><label>Objectif principal</label>
            <select class="ev-select" data-project-bind="meta.objective">
              <option value="economies">Réduction des consommations</option>
              <option value="decarbonation">Décarbonation</option>
              <option value="conformite">Conformité / trajectoire</option>
              <option value="valorisation">Valorisation patrimoniale</option>
            </select></div>
          <div class="ev-field"><label>Horizon cible</label>
            <select class="ev-select" data-project-bind="meta.horizon">
              <option value="2030">2030</option><option value="2035">2035</option>
              <option value="2040">2040</option><option value="2050">2050</option>
            </select></div>
        </div>
        <div class="ev-actions"><button class="ev-btn ev-btn--dark" data-next>Étape suivante →</button></div>
      </section>`;
  }

  function panelSites() {
    const project = getProject();
    return `
      <section class="ev-panel is-active">
        <div class="ev-panel__head">
          <div><div class="ev-eyebrow">Étape 2</div><h2 class="ev-title">Sites du portefeuille</h2></div>
          <div class="ev-chip ev-chip--soft">${project.sites.length} site(s)</div>
        </div>
        <div id="siteTabBar" class="ev-site-tabs" style="margin-bottom:14px"></div>
        <div id="siteFormContainer">${renderSiteForm(project.sites[activeSiteIndex])}</div>
        <div class="ev-actions">
          <button class="ev-btn ev-btn--light" data-prev>← Retour</button>
          <button class="ev-btn ev-btn--dark" data-next>Étape suivante →</button>
        </div>
      </section>`;
  }

  function buildPhaseTabs() {
    return `
      <div class="ev-phase-tabs">
        <button type="button"
          class="ev-phase-tab${currentPhase === 'systems' ? ' is-active' : ''}"
          data-phase="systems">
          Systèmes &amp; profil
        </button>
        <button type="button"
          class="ev-phase-tab${currentPhase === 'envelope-before' ? ' is-active' : ''}"
          data-phase="envelope-before">
          Enveloppe — État actuel
        </button>
        <button type="button"
          class="ev-phase-tab is-after${currentPhase === 'envelope-after' ? ' is-active' : ''}"
          data-phase="envelope-after">
          Enveloppe — État projeté
        </button>
      </div>`;
  }

  function buildPhaseContent(site) {
    if (currentPhase === 'envelope-before') {
      const state = site.thermalBefore ?? createEmptyThermalState();
      return renderThermalForm(site.id, 'before', state);
    }
    if (currentPhase === 'envelope-after') {
      const state = site.thermalAfter ?? createEmptyThermalState();
      return renderThermalForm(site.id, 'after', state);
    }
    return renderCurrentSiteForm(site);
  }

  function panelCurrent() {
    const project = getProject();
    const site    = project.sites[activeSiteIndex];
    return `
      <section class="ev-panel is-active">
        <div class="ev-panel__head">
          <div><div class="ev-eyebrow">Étape 3</div><h2 class="ev-title">État actuel &amp; enveloppe</h2></div>
          <div class="ev-chip ev-chip--soft">${site.identity.name}</div>
        </div>
        ${project.sites.length > 1 ? '<p class="ev-hint" style="margin-bottom:10px">Naviguez entre les onglets pour renseigner chaque bâtiment.</p>' : ''}
        <div id="siteTabBar" class="ev-site-tabs" style="margin-bottom:14px"></div>
        ${buildPhaseTabs()}
        <div id="siteFormContainer">${buildPhaseContent(site)}</div>
        <div class="ev-actions">
          <button class="ev-btn ev-btn--light" data-prev>← Retour</button>
          <button class="ev-btn ev-btn--dark" data-next>Étape suivante →</button>
        </div>
      </section>`;
  }

  function panelProjectState() {
    const project = getProject();
    const site    = project.sites[activeSiteIndex];
    return `
      <section class="ev-panel is-active">
        <div class="ev-panel__head">
          <div><div class="ev-eyebrow">Étape 4</div><h2 class="ev-title">État projeté &amp; travaux</h2></div>
          <div class="ev-chip ev-chip--soft">${site.identity.name}</div>
        </div>
        ${project.sites.length > 1 ? '<p class="ev-hint" style="margin-bottom:10px">Chaque site peut avoir un scénario et des postes différents.</p>' : ''}
        <div id="siteTabBar" class="ev-site-tabs" style="margin-bottom:14px"></div>
        <div id="siteFormContainer">${renderProjectedSiteForm(site)}</div>
        <div class="ev-actions">
          <button class="ev-btn ev-btn--light" data-prev>← Retour</button>
          <button class="ev-btn ev-btn--dark" data-next>Voir les résultats →</button>
        </div>
      </section>`;
  }

  function panelResults() {
    let auditResult;
    try { auditResult = onCompute(); } catch (e) { console.error('[Wizard]', e); auditResult = null; }
    return `
      <section class="ev-panel is-active">
        <div class="ev-panel__head">
          <div><div class="ev-eyebrow">Étape 5</div><h2 class="ev-title">Résultats &amp; export</h2></div>
          <div class="ev-chip ev-chip--soft">Analyse</div>
        </div>
        ${portfolioView.render(getProject(), auditResult)}
        <div style="margin-top:16px">${resultsView.render(auditResult)}</div>
        <div style="margin-top:16px" id="leadGateMount">${leadGate.render()}</div>
        <div class="ev-actions">
          <button class="ev-btn ev-btn--light" data-prev>← Retour</button>
          <button class="ev-btn ev-btn--light" id="resetProjectBtn">↺ Nouvelle simulation</button>
        </div>
      </section>`;
  }

  // ── Render & bind ─────────────────────────────────────────────────────────
  function renderStepsNav() {
    stepsNavEl.innerHTML = steps.map((step, i) => `
      <button type="button"
        class="ev-step ${i === currentStep ? 'is-active' : ''} ${i < currentStep ? 'is-done' : ''}"
        data-step="${i}" aria-current="${i === currentStep ? 'step' : 'false'}">
        <div class="ev-step__n">${i < currentStep ? '✓' : i + 1}</div>
        <div><b>${step.short}</b><span>${step.subtitle}</span></div>
      </button>`).join('');

    stepsNavEl.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = Number(btn.dataset.step);
        if (next <= currentStep || next === currentStep + 1) {
          activeSiteIndex = 0; currentPhase = 'systems'; currentStep = next; render();
        }
      });
    });
  }

  function updateHeader() {
    const rem = steps.length - currentStep - 1;
    titleEl.textContent    = `Étape ${currentStep + 1} sur ${steps.length} — ${steps[currentStep].title}`;
    subtitleEl.textContent = steps[currentStep].description;
    remainEl.textContent   = rem > 0 ? `${rem} étape${rem > 1 ? 's' : ''} restante${rem > 1 ? 's' : ''}` : 'Dernière étape';
    progressFillEl.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  }

  function bindPanel() {
    // Navigation next/prev
    rootEl.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        activeSiteIndex = 0; currentPhase = 'systems'; currentStep++; render();
      }
    }));
    rootEl.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', () => {
      if (currentStep > 0) {
        activeSiteIndex = 0; currentPhase = 'systems'; currentStep--; render();
      }
    }));
    rootEl.querySelector('#resetProjectBtn')?.addEventListener('click', () => {
      if (!confirm('Réinitialiser la simulation ?')) return;
      onReset(); currentStep = 0; activeSiteIndex = 0; currentPhase = 'systems'; render();
    });

    // Étape 1 — projet
    if (currentStep === 0) bindProjectInputs(rootEl);

    // Étapes 2, 3, 4 — tab bar sites
    if ([1, 2, 3].includes(currentStep)) {
      renderSiteTabBar(rootEl, getProject().sites, activeSiteIndex);
    }

    // Étape 2 — sites
    if (currentStep === 1) {
      const fc = rootEl.querySelector('#siteFormContainer');
      if (fc) {
        bindSiteInputs(fc, activeSiteIndex);
        fc.querySelectorAll('[data-bind="identity.name"]').forEach(input => {
          input.addEventListener('input', () =>
            renderSiteTabBar(rootEl, getProject().sites, activeSiteIndex));
        });
      }
    }

    // Étape 3 — état actuel + enveloppe
    if (currentStep === 2) {
      // ── Onglets phase : event delegation sur rootEl ──────────────────────
      rootEl.querySelectorAll('[data-phase]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPhase = btn.dataset.phase;
          // Re-rendre uniquement le contenu + les onglets sans tout recharger
          const phaseTabs = rootEl.querySelector('.ev-phase-tabs');
          if (phaseTabs) {
            phaseTabs.outerHTML; // force read
            // Mettre à jour les classes actives
            rootEl.querySelectorAll('[data-phase]').forEach(b => {
              b.classList.toggle('is-active',
                b.dataset.phase === currentPhase && !b.classList.contains('is-after'));
              if (b.classList.contains('is-after')) {
                b.classList.toggle('is-active', b.dataset.phase === currentPhase);
              }
            });
          }
          // Mettre à jour le contenu du formulaire
          const fc = rootEl.querySelector('#siteFormContainer');
          if (fc) {
            const site = getProject().sites[activeSiteIndex];
            fc.innerHTML = buildPhaseContent(site);
            bindPhaseContent(fc, activeSiteIndex);
          }
        });
      });

      // Binder le contenu actuel
      const fc = rootEl.querySelector('#siteFormContainer');
      if (fc) bindPhaseContent(fc, activeSiteIndex);

      // Chip nom du site
      const chip = rootEl.querySelector('.ev-chip.ev-chip--soft');
      if (chip) chip.textContent = getProject().sites[activeSiteIndex]?.identity?.name ?? '';
    }

    // Étape 4 — état projeté
    if (currentStep === 3) {
      const fc = rootEl.querySelector('#siteFormContainer');
      if (fc) bindProjectedPanel(fc, activeSiteIndex);
      const chip = rootEl.querySelector('.ev-chip.ev-chip--soft');
      if (chip) chip.textContent = getProject().sites[activeSiteIndex]?.identity?.name ?? '';
    }

    // Étape 5 — résultats
    if (currentStep === 4) leadGate.bind(rootEl.querySelector('#leadGateMount'));
  }

  // ── Binder le contenu selon currentPhase ─────────────────────────────────
  function bindPhaseContent(container, siteIndex) {
    if (currentPhase === 'systems') {
      bindSiteInputs(container, siteIndex);
    } else {
      const phase = currentPhase === 'envelope-before' ? 'before' : 'after';
      const site  = getProject().sites[siteIndex];
      bindThermalForm(container, site.id, phase,
        () => getProject().sites[siteIndex][phase === 'before' ? 'thermalBefore' : 'thermalAfter']
              ?? createEmptyThermalState(),
        (newState) => {
          const project = clone(getProject());
          const key = phase === 'before' ? 'thermalBefore' : 'thermalAfter';
          project.sites[siteIndex][key] = newState;
          syncThermalToEnvelope(project.sites[siteIndex], phase);
          project.meta.updatedAt = new Date().toISOString();
          setProject(project);
        }
      );
    }
  }

  // ── Binding étape 4 ───────────────────────────────────────────────────────
  function bindProjectedPanel(container, siteIndex) {
    bindSiteInputs(container, siteIndex);

    // Scénario
    container.querySelectorAll('.scenario-radio').forEach(radio => {
      radio.addEventListener('change', () => {
        patchProject('site:projectState.scenario', radio.value, siteIndex);
        container.querySelectorAll('.ev-scenario-card').forEach(card => {
          card.classList.toggle('is-active', card.querySelector('input')?.value === radio.value);
        });
      });
    });

    // Postes
    const updateMeasures = () => {
      const ids = [...container.querySelectorAll('.cb-measure:checked')].map(cb => cb.dataset.measureId);
      patchProject('site:projectState.selectedMeasures', ids, siteIndex);
    };
    container.querySelectorAll('.cb-measure').forEach(cb => cb.addEventListener('change', updateMeasures));
    container.querySelector('#cbAll')?.addEventListener('change', e => {
      container.querySelectorAll('.cb-measure').forEach(cb => { cb.checked = e.target.checked; });
      updateMeasures();
    });

    // PV
    const pvEnabled = container.querySelector('#pvEnabled');
    const pvFields  = container.querySelector('#pvFields');
    pvEnabled?.addEventListener('change', () => {
      pvFields.style.display = pvEnabled.checked ? '' : 'none';
      patchProject('site:projectState.pv.enabled', pvEnabled.checked, siteIndex);
    });
    const pvSelf = container.querySelector('#pvSelfInput');
    pvSelf?.addEventListener('input', () => {
      patchProject('site:projectState.pv.selfConsumptionRate', Number(pvSelf.value) / 100, siteIndex);
    });
  }

  function renderPanel() {
    const builders = [panelProject, panelSites, panelCurrent, panelProjectState, panelResults];
    rootEl.innerHTML = builders[currentStep]();
    bindPanel();
  }

  function render() {
    renderStepsNav();
    updateHeader();
    renderPanel();
    rootEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return { init: render };
}
