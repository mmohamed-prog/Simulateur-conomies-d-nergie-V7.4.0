import { createEmptyProject } from './core/state.js';
import { STEPS } from './core/constants.js';
import { createWizard } from './ui/wizard.js';
import { createStorageService } from './services/storage.js';
import { runAudit } from './engine/audit-engine.js';
import { createLeadGate } from './ui/lead-gate.js';
import { createPortfolioView } from './ui/portfolio-view.js';
import { createResultsView } from './ui/results-view.js';
import { generatePremiumAuditPdf } from './services/pdf.js';
import { submitLeadToFormspree } from './services/crm.js';
import { clearOptin } from './services/double-optin.js';

const FORMSPREE_URL = 'https://formspree.io/f/mykbelol';

const storage = createStorageService('ecoverta_audit_v5_1');
let project     = storage.load() || createEmptyProject();
let auditResult = null;

const portfolioView = createPortfolioView();
const resultsView   = createResultsView();

const leadGate = createLeadGate({
  // Étape 1 : soumission formulaire → envoie le lead + lien de confirmation
  onSubmit: async (contact, confirmationLink) => {
    project.contact = { ...project.contact, ...contact };
    storage.save(project);
    await submitLeadToFormspree(FORMSPREE_URL, project, auditResult, confirmationLink);
  },

  // Étape 2 : confirmation reçue → génère le PDF
  onConfirmed: async (contact) => {
    project.contact = { ...project.contact, ...contact };
    storage.save(project);
    try {
      await generatePremiumAuditPdf(project, auditResult);
      clearOptin(); // Nettoyage après génération
    } catch (err) {
      console.error('[PDF]', err);
    }
  }
});

const wizard = createWizard({
  steps          : STEPS,
  rootEl         : document.getElementById('wizardPanels'),
  stepsNavEl     : document.getElementById('stepsNav'),
  titleEl        : document.getElementById('wizardTitle'),
  subtitleEl     : document.getElementById('wizardSubtitle'),
  remainEl       : document.getElementById('wizardRemain'),
  progressFillEl : document.getElementById('progressFill'),
  getProject     : () => project,
  setProject     : (nextProject) => { project = nextProject; storage.save(project); },
  onCompute      : () => { auditResult = runAudit(project); return auditResult; },
  portfolioView,
  resultsView,
  leadGate,
  onReset: () => {
    project = createEmptyProject();
    auditResult = null;
    storage.save(project);
  }
});

wizard.init();
