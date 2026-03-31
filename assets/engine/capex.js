export function computeCapex(surface, measures, subsidiesPct = 0) {
  const grossCapex = measures.reduce((sum, measure) => sum + (measure.capexPerM2 * surface), 0);
  const netCapex = grossCapex * (1 - subsidiesPct / 100);
  return { grossCapex, netCapex };
}
