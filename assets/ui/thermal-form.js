/**
 * thermal-form.js — EcoVerta v7
 *
 * Formulaires de saisie de l'état thermique d'un bâtiment :
 *   - Isolant + épaisseur → calcul automatique de R (ou saisie manuelle)
 *   - Type de fenêtre → Uw tabulé (ou saisie manuelle)
 *   - Portes : Ud tabulé
 *
 * Peut représenter l'état AVANT (État actuel) ou APRÈS (État projeté).
 */

import {
  INSULATION_MATERIALS, WALL_MATERIALS, WINDOW_TYPES, DOOR_TYPES,
  computeR, computeUw, computeUd
} from '../data/thermal-materials.js';
import { clone } from '../core/helpers.js';

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function matOptions(list, current) {
  return `<option value="">— Choisir un matériau —</option>` +
    list.map(m =>
      `<option value="${m.id}" ${m.id === current ? 'selected' : ''}>${m.label} (λ=${m.lambda} W/m·K)</option>`
    ).join('');
}

function winOptions(current) {
  return `<option value="">— Choisir —</option>` +
    WINDOW_TYPES.map(w =>
      `<option value="${w.id}" ${w.id === current ? 'selected' : ''}>${w.label} (Uw=${w.Uw})</option>`
    ).join('');
}

function doorOptions(current) {
  return `<option value="">— Choisir —</option>` +
    DOOR_TYPES.map(d =>
      `<option value="${d.id}" ${d.id === current ? 'selected' : ''}>${d.label} (Ud=${d.Ud})</option>`
    ).join('');
}

function rBadge(r, label = '') {
  if (!r && r !== 0) return `<span class="ev-hint">—</span>`;
  const color = r >= 5 ? '#18b45b' : r >= 3 ? '#f0c040' : r >= 1.5 ? '#f59e0b' : '#e34b4b';
  return `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:900;background:${color}18;border:1px solid ${color}44;color:${color}">
    R = ${r} m²K/W ${label}
  </span>`;
}

function uwBadge(uw) {
  if (!uw && uw !== 0) return `<span class="ev-hint">—</span>`;
  const color = uw <= 1.0 ? '#18b45b' : uw <= 1.8 ? '#f0c040' : uw <= 2.6 ? '#f59e0b' : '#e34b4b';
  return `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:900;background:${color}18;border:1px solid ${color}44;color:${color}">
    Uw = ${uw} W/m²K
  </span>`;
}

// ─── Rendu d'un bloc isolation (toiture | murs | plancher) ───────────────────

function renderInsulationBlock({ id, label, icon, materials, state, prefix }) {
  const mode      = state?.[`${prefix}RMode`]  ?? 'calc';
  const matId     = state?.[`${prefix}InsulationType`]    ?? '';
  const thickness = state?.[`${prefix}InsulationThickness`] ?? '';
  const rValue    = state?.[`${prefix}R`] ?? null;

  // Calcul live
  const rCalc = matId && thickness ? computeR(matId, Number(thickness)) : null;
  const rDisplay = mode === 'manual' ? rValue : rCalc;

  return `
    <div class="ev-thermal-block" id="thermal-${id}-${prefix}">
      <div class="ev-thermal-block__head">
        <span class="ev-thermal-block__icon">${icon}</span>
        <strong>${label}</strong>
        <div class="ev-thermal-block__badge" id="badge-${id}-${prefix}">
          ${rBadge(rDisplay)}
        </div>
      </div>

      <!-- Sélecteur de mode -->
      <div class="ev-thermal-mode-row">
        <label class="ev-thermal-mode-btn ${mode==='calc'?'is-active':''}">
          <input type="radio" name="mode-${id}-${prefix}" value="calc" ${mode==='calc'?'checked':''} class="mode-radio" data-field="${prefix}RMode" />
          Matériau + épaisseur
        </label>
        <label class="ev-thermal-mode-btn ${mode==='manual'?'is-active':''}">
          <input type="radio" name="mode-${id}-${prefix}" value="manual" ${mode==='manual'?'checked':''} class="mode-radio" data-field="${prefix}RMode" />
          Saisir R directement
        </label>
      </div>

      <!-- Mode calc -->
      <div class="ev-thermal-calc-fields ${mode==='manual'?'ev-hidden':''}" id="calc-${id}-${prefix}">
        <div class="ev-grid g2">
          <div class="ev-field">
            <label>Type d'isolant</label>
            <select class="ev-select mat-select" data-field="${prefix}InsulationType" data-target="${id}-${prefix}">
              ${matOptions(materials, matId)}
            </select>
          </div>
          <div class="ev-field" id="thickness-field-${id}-${prefix}" style="${matId?'':'display:none'}">
            <label>Épaisseur (mm)</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input class="ev-input thickness-input" type="number" min="10" max="500" step="10"
                data-field="${prefix}InsulationThickness" data-target="${id}-${prefix}"
                value="${thickness}" placeholder="Ex. 200" style="flex:1" />
              <span class="ev-hint" id="mat-lambda-${id}-${prefix}"></span>
            </div>
          </div>
        </div>
        ${matId && thickness ? `<div class="ev-thermal-result">${rBadge(rCalc, '— calculé')}</div>` : ''}
      </div>

      <!-- Mode manual -->
      <div class="ev-thermal-manual-fields ${mode==='calc'?'ev-hidden':''}" id="manual-${id}-${prefix}">
        <div class="ev-field" style="max-width:260px">
          <label>Résistance thermique R (m²K/W)</label>
          <input class="ev-input r-manual-input" type="number" min="0" step="0.1"
            data-field="${prefix}R" value="${rValue ?? ''}" placeholder="Ex. 4.0" />
        </div>
      </div>
    </div>`;
}

// ─── Rendu fenêtres ───────────────────────────────────────────────────────────

function renderWindowBlock({ id, state }) {
  const mode    = state?.windowUwMode ?? 'table';
  const winType = state?.windowType   ?? '';
  const uw      = state?.windowUw     ?? null;

  const selectedWin = WINDOW_TYPES.find(w => w.id === winType);
  const uwCalc      = selectedWin?.Uw ?? null;
  const uwDisplay   = mode === 'manual' ? uw : uwCalc;

  return `
    <div class="ev-thermal-block" id="thermal-${id}-window">
      <div class="ev-thermal-block__head">
        <span class="ev-thermal-block__icon">🪟</span>
        <strong>Fenêtres</strong>
        <div class="ev-thermal-block__badge" id="badge-${id}-window">
          ${uwBadge(uwDisplay)}
        </div>
      </div>

      <div class="ev-thermal-mode-row">
        <label class="ev-thermal-mode-btn ${mode==='table'?'is-active':''}">
          <input type="radio" name="mode-${id}-window" value="table" ${mode==='table'?'checked':''} class="mode-radio" data-field="windowUwMode" />
          Choisir type de fenêtre
        </label>
        <label class="ev-thermal-mode-btn ${mode==='manual'?'is-active':''}">
          <input type="radio" name="mode-${id}-window" value="manual" ${mode==='manual'?'checked':''} class="mode-radio" data-field="windowUwMode" />
          Saisir Uw directement
        </label>
      </div>

      <!-- Mode table -->
      <div class="${mode==='manual'?'ev-hidden':''}" id="calc-${id}-window">
        <div class="ev-field" style="max-width:420px">
          <label>Type de fenêtre</label>
          <select class="ev-select win-select" data-field="windowType" data-target="${id}-window">
            ${winOptions(winType)}
          </select>
        </div>
        ${selectedWin ? `
          <div class="ev-thermal-result" style="margin-top:6px">
            ${uwBadge(selectedWin.Uw)}
            <span class="ev-hint" style="margin-left:8px">${selectedWin.description}</span>
          </div>` : ''}
      </div>

      <!-- Mode manual -->
      <div class="${mode==='table'?'ev-hidden':''}" id="manual-${id}-window">
        <div class="ev-field" style="max-width:260px">
          <label>Uw (W/m²K)</label>
          <input class="ev-input uw-manual-input" type="number" min="0" step="0.1"
            data-field="windowUw" value="${uw ?? ''}" placeholder="Ex. 1.6" />
        </div>
      </div>
    </div>`;
}

// ─── Rendu portes ─────────────────────────────────────────────────────────────

function renderDoorBlock({ id, state }) {
  const doorType = state?.doorType ?? '';
  const ud       = state?.doorUd   ?? null;
  const selectedDoor = DOOR_TYPES.find(d => d.id === doorType);

  return `
    <div class="ev-thermal-block" id="thermal-${id}-door">
      <div class="ev-thermal-block__head">
        <span class="ev-thermal-block__icon">🚪</span>
        <strong>Portes</strong>
        <div class="ev-thermal-block__badge">
          ${selectedDoor ? `<span style="font-size:12px;font-weight:900;color:#557265">Ud = ${selectedDoor.Ud} W/m²K</span>` : '<span class="ev-hint">—</span>'}
        </div>
      </div>
      <div class="ev-field" style="max-width:360px">
        <label>Type de porte</label>
        <select class="ev-select door-select" data-field="doorType" data-target="${id}-door">
          ${doorOptions(doorType)}
        </select>
      </div>
    </div>`;
}

// ─── Formulaire complet avant ou après ───────────────────────────────────────

/**
 * @param {string} siteId    — identifiant unique du site
 * @param {string} phase     — 'before' | 'after'
 * @param {object} state     — état thermique courant (thermalBefore ou thermalAfter)
 * @returns {string}         — HTML du formulaire
 */
export function renderThermalForm(siteId, phase, state) {
  const id = `${siteId}-${phase}`;
  const phaseLabel = phase === 'before' ? 'État actuel' : 'État projeté';

  return `
    <div class="ev-thermal-form" data-thermal-form data-site-id="${siteId}" data-phase="${phase}">
      <div class="ev-thermal-form__header">
        <span class="ev-eyebrow" style="color:${phase==='before'?'#557265':'#18b45b'}">${phaseLabel}</span>
        <p class="ev-hint">
          ${phase === 'before'
            ? "Décrivez l'enveloppe existante. Si vous ne connaissez pas R, saisissez le matériau et l'épaisseur."
            : "Définissez les travaux d'isolation envisagés. Les résistances calculées alimenteront le moteur de gain."}
        </p>
      </div>

      ${renderInsulationBlock({
        id, label:'Toiture / combles', icon:'🏠', phase,
        materials: INSULATION_MATERIALS,
        state, prefix:'roof'
      })}

      ${renderInsulationBlock({
        id, label:'Murs (ITE / ITI)', icon:'🧱', phase,
        materials: WALL_MATERIALS,
        state, prefix:'wall'
      })}

      ${renderInsulationBlock({
        id, label:'Plancher bas', icon:'⬛', phase,
        materials: INSULATION_MATERIALS,
        state, prefix:'floor'
      })}

      ${renderWindowBlock({ id, state })}
      ${renderDoorBlock({ id, state })}
    </div>`;
}

// ─── Binding interactif ───────────────────────────────────────────────────────

/**
 * Active toute l'interactivité du formulaire thermique dans un container.
 * @param {HTMLElement} container
 * @param {string}      siteId
 * @param {string}      phase        'before' | 'after'
 * @param {Function}    getState     () => thermalState object
 * @param {Function}    setState     (newState) => void
 */
export function bindThermalForm(container, siteId, phase, getState, setState) {
  const form = container.querySelector(`[data-thermal-form][data-site-id="${siteId}"][data-phase="${phase}"]`);
  if (!form) return;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function update(field, value) {
    const s = clone(getState() || {});
    s[field] = value;

    // Recalculer R si on change matériau ou épaisseur
    for (const prefix of ['roof', 'wall', 'floor']) {
      const mode   = s[`${prefix}RMode`] ?? 'calc';
      const matId  = s[`${prefix}InsulationType`];
      const thick  = s[`${prefix}InsulationThickness`];
      if (mode === 'calc' && matId && thick) {
        s[`${prefix}R`] = computeR(matId, Number(thick));
      }
    }
    // Recalculer Uw si on change type fenêtre
    if (s.windowUwMode !== 'manual' && s.windowType) {
      s.windowUw = computeUw(s.windowType);
    }
    // Recalculer Ud si on change type porte
    if (s.doorType) {
      s.doorUd = computeUd(s.doorType);
    }

    setState(s);
    refreshBadges(s, form);
  }

  function refreshBadges(s, form) {
    for (const prefix of ['roof', 'wall', 'floor']) {
      const mode  = s[`${prefix}RMode`] ?? 'calc';
      const matId = s[`${prefix}InsulationType`];
      const thick = s[`${prefix}InsulationThickness`];
      const rM    = s[`${prefix}R`];
      const id    = `${siteId}-${phase}`;

      const rCalc = (mode==='calc'&&matId&&thick) ? computeR(matId,Number(thick)) : null;
      const rDisp = mode === 'manual' ? rM : rCalc;

      const badge = form.querySelector(`#badge-${id}-${prefix}`);
      if (badge) badge.innerHTML = rBadge(rDisp, mode==='calc'?'— calculé':'— manuel');

      // Afficher/masquer champ épaisseur
      const thickField = form.querySelector(`#thickness-field-${id}-${prefix}`);
      if (thickField) thickField.style.display = matId ? '' : 'none';

      // Lambda label
      const lambdaSpan = form.querySelector(`#mat-lambda-${id}-${prefix}`);
      if (lambdaSpan && matId) {
        const mat = [...INSULATION_MATERIALS, ...WALL_MATERIALS].find(m=>m.id===matId);
        lambdaSpan.textContent = mat ? `λ = ${mat.lambda} W/m·K` : '';
      }

      // Toggle champs calc / manual
      const calcDiv   = form.querySelector(`#calc-${id}-${prefix}`);
      const manualDiv = form.querySelector(`#manual-${id}-${prefix}`);
      if (calcDiv)   calcDiv.classList.toggle('ev-hidden', mode==='manual');
      if (manualDiv) manualDiv.classList.toggle('ev-hidden', mode==='calc');
    }

    // Fenêtres
    const idFull = `${siteId}-${phase}`;
    const winMode = s.windowUwMode ?? 'table';
    const winBadge = form.querySelector(`#badge-${idFull}-window`);
    if (winBadge) winBadge.innerHTML = uwBadge(s.windowUw);
    const calcWin = form.querySelector(`#calc-${idFull}-window`);
    const manWin  = form.querySelector(`#manual-${idFull}-window`);
    if (calcWin) calcWin.classList.toggle('ev-hidden', winMode==='manual');
    if (manWin)  manWin.classList.toggle('ev-hidden',  winMode==='table');
  }

  // ── Événements ───────────────────────────────────────────────────────────

  // Sélecteurs de mode (radio)
  form.querySelectorAll('.mode-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      // Active le bon bouton
      const group = radio.getAttribute('name');
      form.querySelectorAll(`input[name="${group}"]`).forEach(r => {
        r.closest('.ev-thermal-mode-btn')?.classList.toggle('is-active', r === radio);
      });
      update(radio.dataset.field, radio.value);
    });
  });

  // Sélecteurs matériau
  form.querySelectorAll('.mat-select').forEach(sel => {
    sel.addEventListener('change', () => update(sel.dataset.field, sel.value || null));
  });

  // Épaisseurs
  form.querySelectorAll('.thickness-input').forEach(input => {
    input.addEventListener('input', () => update(input.dataset.field, input.value ? Number(input.value) : null));
  });

  // R manuel
  form.querySelectorAll('.r-manual-input').forEach(input => {
    input.addEventListener('input', () => update(input.dataset.field, input.value ? Number(input.value) : null));
  });

  // Fenêtres
  form.querySelectorAll('.win-select').forEach(sel => {
    sel.addEventListener('change', () => update(sel.dataset.field, sel.value || null));
  });
  form.querySelectorAll('.uw-manual-input').forEach(input => {
    input.addEventListener('input', () => update(input.dataset.field, input.value ? Number(input.value) : null));
  });

  // Portes
  form.querySelectorAll('.door-select').forEach(sel => {
    sel.addEventListener('change', () => update(sel.dataset.field, sel.value || null));
  });

  // Initialiser les badges
  refreshBadges(getState() || {}, form);
}
