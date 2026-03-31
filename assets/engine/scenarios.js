import { MEASURES_CATALOG } from '../data/measures-catalog.js';

export function buildScenarios() {
  const quick = MEASURES_CATALOG.filter(m => m.priority === 'quick_win');
  const balanced = MEASURES_CATALOG.filter(m => ['quick_win', 'structurant'].includes(m.priority));
  const ambitious = [...MEASURES_CATALOG];

  return [
    { id: 'rapide', label: 'Scénario rapide', measures: quick },
    { id: 'equilibre', label: 'Scénario équilibré', measures: balanced },
    { id: 'ambitieux', label: 'Scénario ambitieux', measures: ambitious }
  ];
}
