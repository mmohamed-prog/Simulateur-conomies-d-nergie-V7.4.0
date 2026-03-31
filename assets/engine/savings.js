export function computeSavings(currentKwh, projectedKwh, priceEurPerKwh) {
  const savedKwh = Math.max(0, currentKwh - projectedKwh);
  const savingsEur = savedKwh * priceEurPerKwh;
  return { savedKwh, savingsEur };
}
