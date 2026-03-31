import { fmtMoney, fmtPct, fmtInt, fmtKg, fmtRoi } from '../core/helpers.js';

function pill(text, color = 'gray') {
  const map = {
    green:'background:#e8f8ee;border:1px solid #bceacb;color:#10351e',
    orange:'background:#fff5dd;border:1px solid #f2dbab;color:#7a5100',
    red:'background:#fdeaea;border:1px solid #f3b8b8;color:#8b1515',
    blue:'background:#eef7ff;border:1px solid #d0e8fd;color:#1e4fa0',
    gray:'background:#f5f5f5;border:1px solid #ddd;color:#555'
  };
  return `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;${map[color]||map.gray}">${text}</span>`;
}

function roiPill(years) {
  if (years === null || !isFinite(years)) return pill('ROI n/d','gray');
  if (years <= 5)  return pill(`ROI fort · ${fmtRoi(years)}`,'green');
  if (years <= 8)  return pill(`ROI correct · ${fmtRoi(years)}`,'orange');
  return pill(`ROI long · ${fmtRoi(years)}`,'red');
}

function classBadge(label, kind = 'energy') {
  const colors = { A:'#00a86b',B:'#4db848',C:'#c4d82e',D:'#f7ad00',E:'#f28c00',F:'#e8501a',G:'#cc0000','-':'#98a39d' };
  const c = colors[label] || '#98a39d';
  const text = kind === 'climate' ? `Climat ${label}` : `Énergie ${label}`;
  return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;background:${c}18;border:1px solid ${c}55;color:${c};">${text}</span>`;
}

function dpeLabel(cls) {
  const colors = { A:'#00a86b',B:'#4db848',C:'#c4d82e',D:'#f7ad00',E:'#f28c00',F:'#e8501a',G:'#cc0000' };
  const c = colors[cls] || '#aaa';
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:${c};color:#fff;font-weight:900;font-size:13px;">${cls}</span>`;
}

function progressBar(pct, color = '#18b45b', h = 9) {
  const w = Math.min(100, Math.max(0, pct || 0));
  return `<div style="height:${h}px;background:#e8ede9;border-radius:99px;overflow:hidden;">
    <div style="width:${w.toFixed(1)}%;height:100%;background:${color};border-radius:99px;"></div></div>`;
}

function kpiCard(label, value, sub = '', dark = false) {
  const bg = dark ? 'background:#182126;border-color:#182126;' : 'background:#f8fbf9;';
  const lc = dark ? 'color:rgba(255,255,255,.55)' : 'color:#557265';
  const vc = dark ? 'color:#fff' : 'color:#163227';
  const sc = dark ? 'color:rgba(255,255,255,.45)' : 'color:#557265';
  return `<div style="${bg}border:1px solid #d9e8df;border-radius:18px;padding:14px;min-width:0;">
    <div style="font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;${lc};margin-bottom:6px;">${label}</div>
    <div style="font-size:18px;font-weight:900;line-height:1.25;word-break:break-word;${vc}">${value}</div>
    ${sub ? `<div style="font-size:11px;margin-top:4px;${sc}">${sub}</div>` : ''}</div>`;
}

// ─── Comparatif 3 scénarios ────────────────────────────────────────────────
function renderScenarioComparison(siteResult) {
  const scenarios = siteResult.scenarios;
  if (!scenarios) return '';

  const keys    = ['sobriete','intermediaire','ambitieux'];
  const active  = siteResult.activeScenario ?? 'intermediaire';
  const maxGain = Math.max(...keys.map(k => scenarios[k]?.gainPctTotal ?? 0), 1);
  const maxSav  = Math.max(...keys.map(k => scenarios[k]?.totalSavedEur ?? 0), 1);
  const maxCapex= Math.max(...keys.map(k => scenarios[k]?.totalNetCapex ?? 0), 1);

  const cards = keys.map(key => {
    const sc = scenarios[key];
    const isActive = key === active;
    const border = isActive ? 'border-color:var(--ev-green);background:var(--ev-green-soft);' : '';
    return `
      <div style="${border}border:1.5px solid #d9e8df;border-radius:16px;padding:14px;background:#f8fbf9;">
        <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#557265;margin-bottom:3px">
          ${isActive ? '● Scénario actif' : 'Scénario'}
        </div>
        <div style="font-size:14px;font-weight:900;margin-bottom:10px">${sc?.scenarioLabel ?? key}</div>
        <!-- Gain -->
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          <span style="font-size:10px;color:#557265;width:80px;flex-shrink:0">Gain énergie</span>
          <div style="flex:1;height:7px;background:#ddeee6;border-radius:99px;overflow:hidden">
            <div style="width:${Math.min(100,((sc?.gainPctTotal??0)/maxGain)*100).toFixed(1)}%;height:100%;background:#18b45b;border-radius:99px"></div>
          </div>
          <span style="font-size:10px;font-weight:800;width:40px;text-align:right">${fmtPct(sc?.gainPctTotal)}</span>
        </div>
        <!-- Économies -->
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          <span style="font-size:10px;color:#557265;width:80px;flex-shrink:0">Économies/an</span>
          <div style="flex:1;height:7px;background:#ddeee6;border-radius:99px;overflow:hidden">
            <div style="width:${Math.min(100,((sc?.totalSavedEur??0)/maxSav)*100).toFixed(1)}%;height:100%;background:#2c7b98;border-radius:99px"></div>
          </div>
          <span style="font-size:10px;font-weight:800;width:60px;text-align:right">${fmtMoney(sc?.totalSavedEur)}</span>
        </div>
        <!-- CAPEX -->
        <div style="display:flex;align-items:center;gap:7px">
          <span style="font-size:10px;color:#557265;width:80px;flex-shrink:0">CAPEX net</span>
          <div style="flex:1;height:7px;background:#ddeee6;border-radius:99px;overflow:hidden">
            <div style="width:${Math.min(100,((sc?.totalNetCapex??0)/maxCapex)*100).toFixed(1)}%;height:100%;background:#f0c040;border-radius:99px"></div>
          </div>
          <span style="font-size:10px;font-weight:800;width:60px;text-align:right">${fmtMoney(sc?.totalNetCapex)}</span>
        </div>
        <div style="margin-top:10px;font-size:11px;color:#557265">${roiPill(sc?.roiGlobal)}</div>
      </div>`;
  }).join('');

  return `
    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:800;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;color:#557265">
        Comparatif des 3 scénarios — ${siteResult.siteName}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${cards}</div>
    </div>`;
}

// ─── Tableau des postes ────────────────────────────────────────────────────
function renderPostsTable(postResults) {
  if (!postResults?.length) return '';
  const rows = postResults.map(r => {
    const roiColor = !r.roiYears || !isFinite(r.roiYears) ? '#666'
      : r.roiYears <= 5 ? '#10a04a' : r.roiYears <= 10 ? '#d97706' : '#cc0000';
    const [minG, maxG] = r.gainRange ?? [r.gainPctRaw, r.gainPctRaw];
    const gainStr = minG !== maxG
      ? `${Math.round(minG*100)}–${Math.round(maxG*100)} %`
      : fmtPct(r.gainPctRaw * 100);
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px">
        <div style="font-weight:700">${r.label}</div>
        ${r.description ? `<div style="font-size:11px;color:#557265;margin-top:2px;line-height:1.4">${r.description}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:11px;color:#557265;text-align:center">${gainStr}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:right;white-space:nowrap">${fmtMoney(r.netCapex)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:right;white-space:nowrap">${fmtMoney(r.savedEur)}<br><span style="font-size:10px;color:#557265">${fmtInt(r.savedKwh)} kWh</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:right;color:${roiColor};font-weight:900">
        ${r.roiYears !== null && isFinite(r.roiYears) ? fmtRoi(r.roiYears) : '—'}
        ${r.roiTarget ? `<br><span style="font-size:10px;color:#aaa;font-weight:400">${r.roiTarget}</span>` : ''}
      </td>
    </tr>`;
  });
  return `
    <div style="overflow:auto;border:1px solid #d9e8df;border-radius:18px;background:#fff;margin-top:12px">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#557265;font-weight:900;text-align:left">Poste</th>
          <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#557265;font-weight:900;text-align:center">Gain (plage)</th>
          <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#557265;font-weight:900;text-align:right">Coût net</th>
          <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#557265;font-weight:900;text-align:right">Économie/an</th>
          <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#557265;font-weight:900;text-align:right">Retour</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
}

function renderPriorities(priorities) {
  if (!priorities?.length) return '';
  return priorities.map(p => `
    <div style="display:flex;gap:10px;align-items:flex-start;border:1px solid #d9e8df;background:#fff;border-radius:14px;padding:12px;margin-bottom:8px">
      <div style="width:26px;height:26px;border-radius:50%;background:#ebfbf3;color:#10251b;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">${p.rank}</div>
      <div>
        <div style="font-weight:700;font-size:13px;margin-bottom:3px">${p.title}</div>
        <div style="font-size:12px;line-height:1.45;color:#557265">${p.text}</div>
      </div>
    </div>`).join('');
}

// ─── Résultat d'un site (scénario actif) ──────────────────────────────────
function renderSiteResult(siteResult) {
  const r = siteResult;
  const capNote = r.gainPctTotal >= r.capGainPct
    ? `Gains plafonnés à ${r.capGainPct}% (performance initiale du bâtiment). Zone ${r.climateZone ?? 'H2'}.`
    : `Dans le plafond théorique (${r.capGainPct}%). Zone ${r.climateZone ?? 'H2'}.`;
  const occupNote = r.occupancy > 10
    ? ` Boost occupation appliqué (${r.occupancy}h/jour).` : '';

  return `
    <div style="margin-bottom:18px">
      <!-- KPIs 3×3 -->
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px">
        ${kpiCard('Consommation optimisée', `${fmtInt(r.consoOpt)} kWh`, `avant : ${fmtInt(r.currentKwh)} kWh`)}
        ${kpiCard('Dépense optimisée', fmtMoney(r.costOpt), `avant : ${fmtMoney(r.currentCost)}`)}
        ${kpiCard('Économies annuelles', fmtMoney(r.totalSavedEur), r.pvSavedEur > 0 ? `dont PV : ${fmtMoney(r.pvSavedEur)}` : '', true)}
        ${kpiCard('Intensité', `${r.intensityBefore} → ${r.intensityAfter} kWh/m²`)}
        <div style="background:#f8fbf9;border:1px solid #d9e8df;border-radius:18px;padding:14px">
          <div style="font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#557265;margin-bottom:8px">Classe DPE estimée</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${dpeLabel(r.dpeBefore)}<span style="font-size:18px;color:#aaa">→</span>${dpeLabel(r.dpeAfter)}
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            ${classBadge(r.energyLabel,'energy')}
            ${classBadge(r.climateLabel,'climate')}
          </div>
        </div>
        ${kpiCard('CO₂ évité / an', fmtKg(r.co2Saved), `soit ${(r.co2Saved/1000).toFixed(1).replace('.',',')} tCO₂`)}
        ${kpiCard('Investissement brut', fmtMoney(r.totalGrossCapex), `${r.avgRatePerM2 ? Math.round(r.avgRatePerM2) + ' €/m²' : '—'}`)}
        ${kpiCard('Investissement net', fmtMoney(r.totalNetCapex), 'après subventions')}
        <div style="background:#f8fbf9;border:1px solid #d9e8df;border-radius:18px;padding:14px">
          <div style="font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#557265;margin-bottom:6px">ROI global</div>
          ${roiPill(r.roiGlobal)}
        </div>
      </div>
      <!-- Barre -->
      <div style="padding:14px;border:1px solid #d9e8df;border-radius:18px;background:#f8fbf9;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <strong style="font-size:13px">Réduction des consommations</strong>
          <strong style="font-size:15px;color:#18b45b">${fmtPct(r.gainPctTotal)}</strong>
        </div>
        ${progressBar(r.gainPctTotal)}
        <div style="font-size:11px;color:#557265;margin-top:6px">${capNote}${occupNote}</div>
      </div>
      <!-- Comparatif 3 scénarios -->
      ${renderScenarioComparison(r)}
      <!-- Tableau postes -->
      ${renderPostsTable(r.postResults)}
      <!-- Priorités -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
        <div style="border:1px solid #d9e8df;background:#f8fbf9;border-radius:18px;padding:14px">
          <h4 style="font-size:16px;font-weight:900;margin-bottom:10px">Priorités & recommandations</h4>
          ${renderPriorities(r.priorities)}
        </div>
        <div style="border:1px solid #d9e8df;background:#f8fbf9;border-radius:18px;padding:14px">
          <h4 style="font-size:16px;font-weight:900;margin-bottom:10px">Lecture de décision</h4>
          ${renderPriorities([
            { rank:1, title:'ROI global', text: r.roiGlobal !== null && isFinite(r.roiGlobal)
                ? `Retour sur investissement global estimé à ${fmtRoi(r.roiGlobal)} pour ${fmtMoney(r.totalNetCapex)} investis.`
                : "ROI non calculable — vérifiez les données d'entrée." },
            { rank:2, title:'Budget', text:`Investissement net : ${fmtMoney(r.totalNetCapex)} (brut : ${fmtMoney(r.totalGrossCapex)}).` },
            { rank:3, title:'Économies', text:`${fmtMoney(r.totalSavedEur)}/an — scénario ${r.scenarioLabel ?? r.activeScenario}.` },
            { rank:4, title:'Carbone', text:`${fmtKg(r.co2Saved)}/an évités.` }
          ])}
        </div>
      </div>
    </div>`;
}

function renderRanking(ranking) {
  if (!ranking?.length) return '<div style="font-size:12px;color:#557265">Aucun site.</div>';
  return ranking.slice(0,5).map((site,i) => `
    <div style="display:flex;gap:10px;align-items:flex-start;border:1px solid #d9e8df;background:#fff;border-radius:16px;padding:12px;margin-bottom:8px">
      <div style="width:26px;height:26px;border-radius:50%;background:#ebfbf3;color:#10251b;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px">${site.siteName}</div>
        <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap">
          ${pill(`Score ${site.score}/100`,'green')}
          ${classBadge(site.energyLabel,'energy')}
          ${classBadge(site.climateLabel,'climate')}
          ${pill(`Gain ${site.gainPctTotal ?? '—'}%`,'gray')}
          ${roiPill(site.roiGlobal)}
        </div>
      </div>
    </div>`).join('');
}

// ─── Top actions portefeuille (cross-sites) ────────────────────────────────
function renderAggregatedMeasures(measures) {
  if (!measures?.length) return '';
  return `
    <div style="margin-top:14px">
      <h3 style="font-size:18px;font-weight:900;margin-bottom:10px">Top actions portefeuille</h3>
      <div style="overflow:auto;border:1px solid #d9e8df;border-radius:18px;background:#fff">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#557265;font-weight:900;text-align:left">Poste</th>
            <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;color:#557265;font-weight:900;text-align:center">Sites</th>
            <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;color:#557265;font-weight:900;text-align:right">CAPEX net total</th>
            <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;color:#557265;font-weight:900;text-align:right">Éco. total/an</th>
            <th style="padding:10px 12px;background:#f7faf8;font-size:11px;text-transform:uppercase;color:#557265;font-weight:900;text-align:right">ROI portefeuille</th>
          </tr></thead>
          <tbody>${measures.slice(0,6).map((m,i) => {
            const roiColor = !m.roiYears||!isFinite(m.roiYears)?'#666':m.roiYears<=5?'#10a04a':m.roiYears<=10?'#d97706':'#cc0000';
            return `<tr style="background:${i%2===0?'#fff':'#f4faf7'}">
              <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;font-weight:700">${m.label}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:center;color:#557265">${m.count}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:right;white-space:nowrap">${fmtMoney(m.netCapex)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:right;white-space:nowrap">${fmtMoney(m.savedEur)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #edf4f0;font-size:13px;text-align:right;font-weight:900;color:${roiColor}">${m.roiYears !== null&&isFinite(m.roiYears)?fmtRoi(m.roiYears):'—'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

export function createResultsView() {
  return {
    render(auditResult) {
      if (!auditResult) return '<div style="font-size:12px;color:#557265;padding:10px">Aucun résultat disponible.</div>';
      const { sitesResults, portfolio } = auditResult;
      const ranking = portfolio?.ranking ?? sitesResults ?? [];

      if (sitesResults.length === 1) {
        return `<div>
          <h3 style="font-size:20px;font-weight:900;margin-bottom:12px">Résultats — ${sitesResults[0].siteName}</h3>
          ${renderSiteResult(sitesResults[0])}
          ${renderAggregatedMeasures(portfolio?.aggregatedMeasures)}
        </div>`;
      }

      const tabs = sitesResults.map((sr,i) => `
        <div style="margin-bottom:12px;border:1px solid #d9e8df;border-radius:18px;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#f7faf8;cursor:pointer"
               onclick="(function(){var b=document.getElementById('sb${i}');var a=document.getElementById('sa${i}');var o=b.style.display!=='none';b.style.display=o?'none':'block';a.textContent=o?'▸':'▾';})()">
            <div>
              <span style="font-size:14px;font-weight:900">${sr.siteName}</span>
              <span style="font-size:12px;color:#557265;margin-left:10px">${fmtPct(sr.gainPctTotal)} · ${fmtMoney(sr.totalSavedEur)}/an · ${sr.scenarioLabel ?? sr.activeScenario}</span>
            </div>
            <span id="sa${i}" style="font-size:16px;color:#557265">▸</span>
          </div>
          <div id="sb${i}" style="display:none;padding:14px 16px;border-top:1px solid #edf4f0">
            ${renderSiteResult(sr)}
          </div>
        </div>`).join('');

      return `<div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
          <div><h3 style="font-size:18px;font-weight:900;margin-bottom:10px">Sites prioritaires</h3>${renderRanking(ranking)}</div>
          <div><h3 style="font-size:18px;font-weight:900;margin-bottom:10px">Détail par site</h3>${tabs}</div>
        </div>
        ${renderAggregatedMeasures(portfolio?.aggregatedMeasures)}
      </div>`;
    }
  };
}
