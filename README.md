# EcoVerta Audit V5.1 — Starter GitHub

Starter modulaire pour un outil d'audit énergétique EcoVerta avec :
- wizard 5 étapes
- architecture modulaire ES modules
- moteur avant / après prêt à compléter
- logique portefeuille
- capture lead Formspree
- export fichier de base

## Lancer en local

Comme le projet utilise des imports ES modules, ouvre-le via un petit serveur local.

Exemples :

```bash
python -m http.server 8000
```

Puis ouvre :

```text
http://localhost:8000
```

## Déploiement GitHub Pages

1. Crée un repo GitHub
2. Dépose tout le contenu du ZIP à la racine
3. Active GitHub Pages sur la branche principale

## Fichiers clés

- `assets/app.js` : point d'entrée
- `assets/ui/wizard.js` : navigation wizard
- `assets/engine/audit-engine.js` : orchestration calcul
- `assets/engine/envelope.js` : préremplissage période de construction
- `assets/engine/emissions.js` : GES automatiques
- `assets/services/crm.js` : envoi Formspree
- `assets/services/pdf.js` : export de base à remplacer par jsPDF premium

## Important

Le PDF livré dans ce starter est un export minimal `.txt` pour valider le workflow. Remplace `assets/services/pdf.js` par une version jsPDF + AutoTable pour le rendu premium client-ready.

## Prochaine étape recommandée

Passer en V5.1.1 avec :
- vrai PDF premium EcoVerta
- édition multi-sites avancée
- scénarios plus riches
- graphiques UI
- scoring commercial plus fin
