/**
 * crm.js — EcoVerta v7
 * Envoi vers Formspree avec lien de confirmation pour double opt-in.
 *
 * Configuration Formspree requise :
 *  Settings > Emails > Autoresponder :
 *  - Activer l'autoresponder
 *  - Destinataire : champ "email"
 *  - Objet suggéré : "EcoVerta — Confirmez votre accès au rapport"
 *  - Corps : inclure {{confirmationLink}} pour que l'utilisateur reçoive son lien
 */
export async function submitLeadToFormspree(formspreeUrl, project, auditResult, confirmationLink) {
  const payload = {
    // Contact
    firstName         : project.contact.firstName,
    lastName          : project.contact.lastName,
    company           : project.contact.company,
    email             : project.contact.email,
    phone             : project.contact.phone,
    consent           : project.contact.consent,
    // Projet
    projectName       : project.meta.projectName,
    customerType      : project.meta.customerType,
    objective         : project.meta.objective,
    sitesCount        : project.sites.length,
    // Résultats
    portfolioScore    : auditResult?.portfolio?.avgScore,
    portfolioEnergyLabel: auditResult?.portfolio?.energyLabel,
    portfolioClimateLabel: auditResult?.portfolio?.climateLabel,
    savingsEur        : Math.round(auditResult?.portfolio?.savingsEur || 0),
    netCapex          : Math.round(auditResult?.portfolio?.netCapex  || 0),
    // Double opt-in
    confirmationLink  : confirmationLink || null,
    _replyto          : project.contact.email, // Formspree : reply-to automatique
    _subject          : `EcoVerta — Confirmez votre accès au rapport · ${project.contact.company || project.contact.email}`
  };

  const response = await fetch(formspreeUrl, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body   : JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Échec envoi Formspree');
  return response.json();
}
