import { fmtInt, fmtMoney, fmtPct, fmtKg, fmtRoi } from '../core/helpers.js';

function progressBar(before, after, labelBefore, labelAfter, color = '#18b45b') {
  const afterPct = before > 0 ? Math.min((after / before) * 100, 100) : 100;
  return `
    <div style="margin-top:10px;">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
        <span style="font-size:11px;color:rgba(255,255,255,.55);width:42px;">Avant</span>
        <div style="flex:1;height:9px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;">
          <div style="width:100%;height:100%;background:#e0574f;border-radius:99px;"></div>
        </div>
        <span style="font-size:11px;color:rgba(255,255,255,.55);width:80px;text-align:right;">${labelBefore}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="font-size:11px;color:rgba(255,255,255,.55);width:42px;">Après</span>
        <div style="flex:1;height:9px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;">
          <div style="width:${afterPct.toFixed(1)}%;height:100%;background:${color};border-radius:99px;"></div>
        </div>
        <span style="font-size:11px;color:rgba(255,255,255,.55);width:80px;text-align:right;">${labelAfter}</span>
      </div>
    </div>
  `;
}

export function createPortfolioView() {
  return {
    render(project, auditResult) {
      const p = auditResult?.portfolio;
      if (!p) return '<div style="font-size:12px;color:#557265;padding:10px;">Lancez un calcul pour afficher la synthèse portefeuille.</div>';

      const scorePct = Math.min(Math.max(p.avgScore, 0), 100);

      return `
        <div style="display:grid;grid-template-columns:260px 1fr;gap:14px;align-items:start;">

          <!-- Score + synthèse gauche -->
          <div style="background:linear-gradient(145deg,#182126,#10251b);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:18px;color:#fff;box-shadow:0 14px 36px rgba(0,0,0,.22);">
            <!-- Score donut -->
            <div style="width:140px;height:140px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(closest-side,#10251b 74%,transparent 75% 100%),conic-gradient(#42df74 0 ${scorePct}%, rgba(255,255,255,.12) 0);margin:0 auto 12px;">
              <div style="text-align:center;color:#fff;">
                <div style="font-size:42px;font-weight:900;line-height:1;">${p.avgScore}</div>
                <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6);">Score</div>
              </div>
            </div>
            <div style="text-align:center;margin-bottom:14px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
              <span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:11px;font-weight:800;color:#fff;">Énergie ${p.energyLabel || '-'}<\/span>
              <span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:11px;font-weight:800;color:#fff;">Climat ${p.climateLabel || '-'}<\/span>
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,.4);text-align:center;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;">
              ${project.sites.length} site${project.sites.length > 1 ? 's' : ''}
            </div>

            <!-- Avant / après kWh -->
            <div style="padding:10px;background:rgba(255,255,255,.05);border-radius:12px;">
              <div style="font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:8px;">Réduction consommations</div>
              ${progressBar(p.kwhBefore, p.kwhAfter, fmtInt(p.kwhBefore) + ' kWh', fmtInt(p.kwhAfter) + ' kWh')}
            </div>
          </div>

          <!-- KPIs droite -->
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">
            ${kpi('Gain énergie',   fmtPct(p.gainPct))}
            ${kpi('Économies/an',   fmtMoney(p.savedEur))}
            ${kpi('CAPEX net',      fmtMoney(p.netCapex))}
            ${kpi('ROI estimé',     fmtRoi(p.roiYears))}
            ${kpi('kWh avant',      fmtInt(p.kwhBefore) + ' kWh')}
            ${kpi('kWh après',      fmtInt(p.kwhAfter)  + ' kWh')}
            ${kpi('GES évités/an',  fmtKg(p.co2Saved ?? p.avoidedEmissions), 'grid-column:span 2')}
          </div>

        </div>
      `;

      function kpi(label, value, extraStyle = '') {
        return `
          <div style="padding:14px;border:1px solid #d9e8df;border-radius:18px;background:#f8fbf9;${extraStyle}">
            <div style="font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#557265;margin-bottom:6px;">${label}</div>
            <div style="font-size:18px;font-weight:900;line-height:1.2;">${value}</div>
          </div>
        `;
      }
    }
  };
}
