export function fmtInt(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('fr-FR') : '—';
}

export function fmtPct(value) {
  return Number.isFinite(value) ? `${Math.round(value)} %` : '—';
}

export function fmtMoney(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
    : '—';
}

export function fmtKg(value) {
  if (!Number.isFinite(value)) return '—';
  return value >= 1000
    ? `${(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t CO₂`
    : `${Math.round(value).toLocaleString('fr-FR')} kg CO₂`;
}

export function fmtRoi(years) {
  if (!Number.isFinite(years) || years <= 0) return '—';
  return `${years.toFixed(1).replace('.', ',')} ans`;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Affiche un toast non-bloquant (remplace alert) */
export function toast(message, type = 'success', duration = 4000) {
  let el = document.getElementById('ev-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ev-toast';
    el.className = 'ev-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add('is-visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-visible'), duration);
}
