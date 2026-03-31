/**
 * lead-gate.js — EcoVerta v7
 *
 * Double opt-in :
 *  - Étape 1 : saisie formulaire → envoi Formspree + email de confirmation
 *  - Étape 2 : clic lien dans l'email → token validé → PDF débloqué
 */
import { isEmail, isRequired, emailErrorMessage } from '../core/validators.js';
import { toast } from '../core/helpers.js';
import {
  createOptinToken, confirmOptin, isOptinConfirmed,
  getConfirmTokenFromUrl, buildConfirmationLink, getPendingOptin
} from '../services/double-optin.js';

const FIELDS = [
  { id:'leadFirstName', label:'Prénom',    key:'firstName', type:'text',  required:true },
  { id:'leadLastName',  label:'Nom',       key:'lastName',  type:'text',  required:true },
  { id:'leadCompany',   label:'Société',   key:'company',   type:'text',  required:true },
  { id:'leadEmail',     label:'Email',     key:'email',     type:'email', required:true },
  { id:'leadPhone',     label:'Téléphone', key:'phone',     type:'tel',   required:false }
];

function validateField(f, val) {
  if (!f.required) return { valid: true, msg: '' };
  if (f.type === 'email') {
    const valid = isEmail(val);
    return { valid, msg: valid ? '' : emailErrorMessage(val) };
  }
  const valid = isRequired(val);
  return { valid, msg: valid ? '' : `${f.label} requis.` };
}

function markField(container, id, valid, errorMsg = '') {
  const input = container.querySelector(`#${id}`);
  if (!input) return;
  input.classList.toggle('ev-input--error', !valid);
  input.classList.toggle('ev-input--ok',    valid);
  const parent = input.closest('.ev-field');
  if (!parent) return;
  let errEl = parent.querySelector('.ev-field-error');
  if (!valid && errorMsg) {
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'ev-field-error';
      parent.appendChild(errEl);
    }
    errEl.textContent = errorMsg;
  } else if (errEl) {
    errEl.remove();
  }
}

// ─── Rendu étape 1 : formulaire de saisie ────────────────────────────────────
function renderStep1() {
  const inputs = FIELDS.map(f => `
    <div class="ev-field">
      <label for="${f.id}">${f.label}${f.required ? ' <span class="ev-required">*</span>' : ''}</label>
      <input class="ev-input" id="${f.id}" type="${f.type}"
        autocomplete="${f.key}" placeholder="${f.label}" />
    </div>`).join('');

  return `
    <div class="ev-dark-card" id="leadGateStep1">
      <div class="ev-eyebrow" style="color:#8df6b7">Export &amp; contact</div>
      <h3 class="ev-title" style="font-size:22px;color:#fff;margin-bottom:6px">
        Débloquer l'export PDF
      </h3>
      <p style="color:rgba(255,255,255,.72);line-height:1.6;margin:0 0 14px">
        Renseignez vos coordonnées. Un email de confirmation vous sera envoyé
        pour valider votre accès et générer le rapport.
      </p>
      <div class="ev-grid g2">${inputs}</div>
      <label class="ev-check ev-check--dark" id="consentLabel"
        style="margin-top:12px;gap:10px;cursor:pointer">
        <input type="checkbox" id="leadConsent" />
        <span>J'accepte le traitement de mes données conformément à la politique
          de confidentialité. <span class="ev-required">*</span></span>
      </label>
      <div class="ev-actions" style="margin-top:14px">
        <button class="ev-btn ev-btn--primary" id="leadSubmit" style="min-width:220px">
          <span id="leadSubmitLabel">Envoyer — recevoir le lien →</span>
        </button>
      </div>
    </div>`;
}

// ─── Rendu étape 2 : en attente de confirmation ───────────────────────────────
function renderStep2(email) {
  return `
    <div class="ev-dark-card" id="leadGateStep2">
      <div class="ev-eyebrow" style="color:#8df6b7">Confirmation requise</div>
      <h3 class="ev-title" style="font-size:20px;color:#fff;margin-bottom:10px">
        Vérifiez votre boîte mail
      </h3>
      <p style="color:rgba(255,255,255,.72);line-height:1.6;margin:0 0 16px">
        Un email de vous sera envoyé à
        <strong style="color:#8df6b7">${email}</strong>.<br>
        N'hésitez pas à nous contacter pour échanger sur votre projet.
      </p>
      <div style="background:rgba(255,255,255,.07);border-radius:12px;padding:14px;font-size:13px;color:rgba(255,255,255,.55);line-height:1.6">
        ⏱ Vous allez recevoir la synthèse par mail <strong style="color:rgba(255,255,255,.8)">d'ici 24 heures</strong>.<br>
        📂 Vérifiez aussi vos spams si vous ne recevez rien.<br>
        ✉️ L'expéditeur est <strong style="color:rgba(255,255,255,.8)">contact@ecovertaconsult.com</strong>
      </div>
      <div class="ev-actions" style="margin-top:14px">
        <button class="ev-btn ev-btn--light" id="leadResend">
          Renvoyer l'email
        </button>
        <button class="ev-btn ev-btn--light" id="leadBack" style="margin-left:8px">
          Modifier l'adresse
        </button>
      </div>
    </div>`;
}

// ─── Rendu étape 3 : confirmation OK → PDF prêt ───────────────────────────────
function renderStep3(contact) {
  return `
    <div class="ev-dark-card" id="leadGateStep3">
      <div class="ev-eyebrow" style="color:#8df6b7">Email vérifié ✓</div>
      <h3 class="ev-title" style="font-size:20px;color:#fff;margin-bottom:10px">
        Accès débloqué — ${contact?.firstName || ''} ${contact?.lastName || ''}
      </h3>
      <p style="color:rgba(255,255,255,.72);line-height:1.6;margin:0 0 16px">
        Votre email a été confirmé. Le rapport PDF est prêt.
      </p>
      <div class="ev-actions">
        <button class="ev-btn ev-btn--primary" id="leadGeneratePdf" style="min-width:220px">
          ↓ Générer et télécharger le PDF
        </button>
      </div>
    </div>`;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
export function createLeadGate({ onSubmit, onConfirmed }) {
  // État interne : 'form' | 'pending' | 'confirmed'
  let gateState  = 'form';
  let pendingEmail = '';

  // Détecter immédiatement si un token de confirmation est dans l'URL
  const urlToken = getConfirmTokenFromUrl();
  if (urlToken) {
    const ok = confirmOptin(urlToken);
    if (ok) {
      gateState = 'confirmed';
      // Nettoyer l'URL sans recharger la page
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  } else if (isOptinConfirmed()) {
    gateState = 'confirmed';
  } else if (getPendingOptin()) {
    const pending = getPendingOptin();
    gateState    = 'pending';
    pendingEmail = pending.contact?.email || '';
  }

  return {
    render() {
      if (gateState === 'confirmed') {
        const data = getPendingOptin();
        return renderStep3(data?.contact);
      }
      if (gateState === 'pending') return renderStep2(pendingEmail);
      return renderStep1();
    },

    bind(container) {
      if (!container) return;

      // ── Étape 3 : PDF déjà confirmé ──────────────────────────────────────
      if (gateState === 'confirmed') {
        container.querySelector('#leadGeneratePdf')?.addEventListener('click', async () => {
          const data = getPendingOptin();
          if (onConfirmed && data) await onConfirmed(data.contact);
        });
        return;
      }

      // ── Étape 2 : en attente de confirmation ──────────────────────────────
      if (gateState === 'pending') {
        container.querySelector('#leadResend')?.addEventListener('click', () => {
          gateState = 'form';
          container.innerHTML = renderStep1();
          this.bind(container);
        });
        container.querySelector('#leadBack')?.addEventListener('click', () => {
          gateState = 'form';
          container.innerHTML = renderStep1();
          this.bind(container);
        });
        return;
      }

      // ── Étape 1 : formulaire ──────────────────────────────────────────────
      const btn         = container.querySelector('#leadSubmit');
      const labelEl     = container.querySelector('#leadSubmitLabel');
      const consentLabel= container.querySelector('#consentLabel');
      if (!btn) return;

      // Validation au blur
      FIELDS.forEach(f => {
        const input = container.querySelector(`#${f.id}`);
        if (!input) return;
        input.addEventListener('blur', () => {
          const { valid, msg } = validateField(f, input.value.trim());
          markField(container, f.id, valid, msg);
        });
      });

      btn.addEventListener('click', async () => {
        let hasError = false;
        const contact = {};

        FIELDS.forEach(f => {
          const val = container.querySelector(`#${f.id}`)?.value.trim() || '';
          contact[f.key] = val;
          const { valid, msg } = validateField(f, val);
          markField(container, f.id, valid, msg);
          if (!valid) hasError = true;
        });

        contact.consent = !!container.querySelector('#leadConsent')?.checked;
        if (!contact.consent) {
          hasError = true;
          consentLabel?.classList.add('ev-check--error');
        } else {
          consentLabel?.classList.remove('ev-check--error');
        }

        if (hasError) {
          toast('Merci de renseigner tous les champs obligatoires (*).', 'error');
          return;
        }

        btn.disabled = true;
        labelEl.textContent = 'Envoi en cours…';

        try {
          // Générer token + lien de confirmation
          const token = createOptinToken(contact, null);
          const confirmLink = buildConfirmationLink(token);

          // Envoyer via Formspree (avec le lien dans le payload)
          await onSubmit(contact, confirmLink);

          // Passer en mode "en attente"
          pendingEmail = contact.email;
          gateState    = 'pending';
          container.innerHTML = renderStep2(contact.email);
          this.bind(container);

        } catch (err) {
          console.error('[LeadGate]', err);
          toast('Une erreur est survenue. Veuillez réessayer.', 'error');
          btn.disabled = false;
          labelEl.textContent = 'Envoyer — recevoir le lien →';
        }
      });
    }
  };
}
