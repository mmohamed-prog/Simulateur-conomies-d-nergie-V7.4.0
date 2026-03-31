/**
 * pdf.js — EcoVerta v7
 * Export HTML d'impression avec :
 *  - Tableau avant/après par bâtiment (état actuel vs état projeté)
 *  - Comparatif 3 scénarios par site
 *  - Top actions portefeuille agrégées cross-sites
 *  - gainRange [min–max] dans le tableau des postes
 *  - Zone climatique + occupation dans l'en-tête site
 */

const F = {
  eur(x) {
    if (!Number.isFinite(x)) return '—';
    if (Math.abs(x)>=1_000_000) return `${(x/1_000_000).toFixed(1).replace('.',',')} M€`;
    if (Math.abs(x)>=1_000)     return `${Math.round(x/1000)} k€`;
    return `${Math.round(x)} €`;
  },
  kwh(x) {
    if (!Number.isFinite(x)) return '—';
    if (x>=1_000_000) return `${(x/1_000_000).toFixed(2).replace('.',',')} GWh`;
    if (x>=1_000)     return `${Math.round(x/1000)} MWh`;
    return `${Math.round(x)} kWh`;
  },
  co2(x) {
    if (!Number.isFinite(x)) return '—';
    return x>=1000 ? `${(x/1000).toFixed(1).replace('.',',')} tCO2/an` : `${Math.round(x)} kg CO2/an`;
  },
  pct(x)  { return Number.isFinite(x) ? `${Math.round(x*10)/10} %` : '—'; },
  roi(y)  { return Number.isFinite(y)&&y ? `${y.toFixed(1).replace('.',',')} ans` : '—'; },
  surf(x) { return Number.isFinite(x) ? `${Math.round(x).toLocaleString('fr-FR')} m2` : '—'; },
  date()  { return new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}); },
  pctRange(min,max) {
    if (min===max||(!min&&!max)) return `${Math.round((min||0)*100)} %`;
    return `${Math.round(min*100)}–${Math.round(max*100)} %`;
  }
};

function statusOf(score) {
  if (score>=80) return { label:'Conforme',  color:'#18b45b' };
  if (score>=50) return { label:'Attention', color:'#f59e0b' };
  return                { label:'Critique',  color:'#e34b4b' };
}

function dpeColor(cls) {
  return {A:'#1d9e5c',B:'#4db848',C:'#b8d12a',D:'#f7ad00',E:'#f28c00',F:'#e8501a',G:'#cc0000'}[cls]||'#aaa';
}

function roiColor(y) {
  if (!Number.isFinite(y)||!y) return '#666';
  if (y<=5)  return '#18b45b';
  if (y<=10) return '#f59e0b';
  return '#e34b4b';
}

function kpiCard(label, val, sub='', dark=false, accent='#18b45b') {
  const bg = dark ? 'background:#0f2218;border-color:#0f2218' : 'background:#f4faf7';
  const lc = dark ? 'color:#94e8b6' : 'color:#557265';
  const vc = dark ? 'color:#fff' : 'color:#163227';
  const sc = dark ? 'color:rgba(255,255,255,.45)' : 'color:#557265';
  return `<div style="${bg};border:1px solid #d0e8da;border-left:3.5px solid ${accent};border-radius:10px;padding:11px 13px;">
    <div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;${lc};margin-bottom:5px">${label}</div>
    <div style="font-size:15px;font-weight:900;line-height:1.15;${vc}">${val}</div>
    ${sub?`<div style="font-size:7.5px;${sc};margin-top:4px">${sub}</div>`:''}
  </div>`;
}

function progress(pct, label) {
  const w = Math.min(100,Math.max(0,pct||0));
  return `<div style="margin:10px 0">
    <div style="display:flex;justify-content:space-between;font-size:8.5px;font-weight:700;margin-bottom:5px">
      <span>${label}</span><strong style="color:#18b45b">${Math.round(w)} %</strong>
    </div>
    <div style="height:7px;background:#ddeee6;border-radius:99px;overflow:hidden">
      <div style="width:${w}%;height:100%;background:linear-gradient(90deg,#18b45b,#42df74);border-radius:99px"></div>
    </div>
  </div>`;
}

function section(text, sub='') {
  return `<div style="margin:22px 0 12px;border-bottom:2px solid #18b45b;padding-bottom:6px">
    <h2 style="font-size:13px;font-weight:900;color:#0f2218;margin:0">${text}</h2>
    ${sub?`<p style="font-size:8.5px;color:#557265;margin:3px 0 0">${sub}</p>`:''}
  </div>`;
}

function tableWrap(html) {
  return `<div style="border:1px solid #d0e8da;border-radius:10px;overflow:hidden;margin-bottom:12px">${html}</div>`;
}

function th(t, align='l') {
  return `<th style="background:#1e4233;color:#fff;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:8px 9px;text-align:${align==='r'?'right':align==='c'?'center':'left'};border-bottom:1.5px solid #18b45b">${t}</th>`;
}

function td(t, align='l', style='') {
  return `<td style="padding:8px 9px;border-bottom:1px solid #d0e8da;font-size:9px;vertical-align:middle;text-align:${align==='r'?'right':align==='c'?'center':'left'};${style}">${t}</td>`;
}

function buildHtml(project, auditResult) {
  const p   = project;
  const ar  = auditResult;
  const pf  = ar?.portfolio ?? {};
  const sr  = ar?.sitesResults ?? [];
  const ct  = p.contact ?? {};
  const totalSurf = p.sites?.reduce((s,site)=>s+(site.identity?.surface||0),0)??0;
  const st  = statusOf(pf.avgScore??0);

  // ── CSS ──────────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter','Helvetica Neue',Arial,sans-serif;font-size:9.5px;color:#163227;background:#fff;line-height:1.5}

    .hero{background:linear-gradient(135deg,#0f2218 0%,#16352a 55%,#0a1a10 100%);padding:22px 24px 18px;color:#fff;position:relative;overflow:hidden;border-radius:0 0 14px 14px;margin-bottom:22px}
    .hero::before{content:'';position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(66,223,116,.1) 0%,transparent 70%)}
    .hero__bar{position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(to bottom,#18b45b,#42df74)}
    .hero__badge{display:inline-flex;align-items:center;gap:6px;background:rgba(24,180,91,.13);border:1px solid rgba(24,180,91,.28);border-radius:99px;padding:4px 12px;font-size:8px;font-weight:700;color:#8df6b7;margin-bottom:10px}
    .hero h1{font-size:20px;font-weight:900;letter-spacing:-.03em;line-height:1.05;margin-bottom:4px}
    .hero__sub{font-size:9px;color:#94e8b6;margin-bottom:3px}
    .hero__sep{border:none;border-top:1px solid rgba(255,255,255,.1);margin:8px 0}
    .hero__contact{font-size:8.5px;color:rgba(255,255,255,.5)}
    .hero__kpis{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;margin-top:14px}
    .hero__kpi{padding:10px 12px;background:rgba(255,255,255,.04);border-right:1px solid rgba(255,255,255,.08)}
    .hero__kpi:last-child{border-right:none}
    .hero__kpi .lbl{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.45);margin-bottom:4px}
    .hero__kpi .val{font-size:14px;font-weight:900}

    .body{padding:0 24px 24px}
    table{width:100%;border-collapse:collapse;font-size:9px}
    tr:nth-child(even) td{background:#f4faf7}
    tr:last-child td{border-bottom:none}

    .dpe{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;color:#fff;font-weight:900;font-size:9px}
    .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}

    .kpi-row{display:grid;gap:8px;margin-bottom:10px}
    .kpi-row--5{grid-template-columns:repeat(5,1fr)}
    .kpi-row--4{grid-template-columns:repeat(4,1fr)}
    .kpi-row--3{grid-template-columns:repeat(3,1fr)}

    /* Avant/après table */
    .state-table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:12px}
    .state-table th{background:#1e4233;color:#fff;font-size:7.5px;font-weight:700;text-transform:uppercase;padding:8px 10px;border-bottom:1.5px solid #18b45b}
    .state-table .col-label{font-weight:700;color:#163227}
    .state-table .col-before{color:#e34b4b}
    .state-table .col-after{color:#18b45b;font-weight:700}
    .state-table td{padding:7px 10px;border-bottom:1px solid #d0e8da}

    /* Comparatif scénarios */
    .scenario-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
    .scenario-card{border:1.5px solid #d0e8da;border-radius:10px;padding:12px;background:#f4faf7}
    .scenario-card.active{border-color:#18b45b;background:#ebfbf3}
    .scenario-card h4{font-size:11px;font-weight:900;margin-bottom:3px}
    .scenario-card .sc-sub{font-size:7.5px;color:#557265;margin-bottom:8px}
    .sc-bar-row{display:flex;align-items:center;gap:6px;margin-bottom:5px}
    .sc-bar-lbl{font-size:8px;color:#557265;width:75px;flex-shrink:0}
    .sc-bar-track{flex:1;height:6px;background:#ddeee6;border-radius:99px;overflow:hidden}
    .sc-bar-fill{height:100%;border-radius:99px}
    .sc-bar-val{font-size:8px;font-weight:800;width:55px;text-align:right}

    .site-header{display:flex;align-items:center;justify-content:space-between;background:#edf7f2;border:1.5px solid #18b45b;border-left:5px solid #18b45b;border-radius:10px;padding:11px 14px;margin:16px 0 10px}
    .site-header h3{font-size:13px;font-weight:900;margin:0}
    .site-header .meta{font-size:8.5px;color:#557265;margin-top:2px}

    .doc-footer{border-top:1px solid #d0e8da;margin-top:20px;padding-top:8px;font-size:8px;color:#557265;display:flex;justify-content:space-between}
    .doc-footer .brand{font-weight:900;color:#18b45b}

    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .hero{border-radius:0}
      .pb{page-break-before:always}
      .no-break{page-break-inside:avoid}
      @page{margin:13mm 15mm 17mm}
    }
  `;

  // ── Hero ─────────────────────────────────────────────────────────────────
  const heroKpis = [
    { lbl:'Sites analysés', val: p.sites?.length ?? '—' },
    { lbl:'Surface totale', val: F.surf(totalSurf) },
    { lbl:'Gain estimé',    val: F.pct(pf.gainPct) },
    { lbl:'Economies / an', val: F.eur(pf.savedEur) },
    { lbl:'CAPEX total',    val: F.eur(pf.netCapex) },
  ].map(k=>`<div class="hero__kpi"><div class="lbl">${k.lbl}</div><div class="val">${k.val}</div></div>`).join('');

  const HERO = `<div class="hero">
    <div class="hero__bar"></div>
    <div class="hero__badge">● EcoVerta Audit · Rapport Décret Tertiaire</div>
    <h1>${p.meta?.projectName||'Rapport Audit Energétique'}</h1>
    <div class="hero__sub">Horizon ${p.meta?.horizon||'2030'} · Généré le ${F.date()}</div>
    <hr class="hero__sep">
    <div class="hero__contact">${[ct.firstName+' '+ct.lastName,ct.company,ct.email].filter(Boolean).join(' · ')}</div>
    <div class="hero__kpis">${heroKpis}</div>
  </div>`;

  // ── Synthèse portefeuille ─────────────────────────────────────────────────
  const SYNTH = `
    ${section('Synthese Portefeuille','Vue consolidée — tous sites confondus')}
    <div class="kpi-row kpi-row--5">
      ${kpiCard('Score conformite', `${pf.avgScore??'—'}/100`, `priorité : ${pf.avgPriorityIndex??'—'}/100`, true, '#18b45b')}
      ${kpiCard('Statut portefeuille', `<span class="badge" style="background:${st.color}22;color:${st.color};border:1px solid ${st.color}44">${st.label}</span>`, '')}
      ${kpiCard('CO2 evite / an', F.co2(pf.co2Saved??pf.avoidedEmissions), 'facteurs ADEME 2024')}
      ${kpiCard('Economies / an', F.eur(pf.savedEur), '', true, '#18b45b')}
      ${kpiCard('CAPEX net total', F.eur(pf.netCapex), `brut : ${F.eur(pf.grossCapex)}`)}
    </div>
    <div class="kpi-row kpi-row--3">
      ${kpiCard('kWh avant travaux', F.kwh(pf.kwhBefore), 'consommation totale')}
      ${kpiCard('kWh apres travaux', F.kwh(pf.kwhAfter), `reduction : ${F.pct(pf.gainPct)}`, false, '#18b45b')}
      ${kpiCard('ROI global estime', F.roi(pf.roiYears))}
    </div>
    ${progress(pf.gainPct??0,'Progression globale de reduction des consommations')}`;

  // ── Top 3 actions ─────────────────────────────────────────────────────────
  const top3 = sr.flatMap(site =>
    (site.postResults??[]).map(r=>({...r,siteName:site.siteName}))
  ).filter(r=>r.roiYears!==null&&Number.isFinite(r.roiYears))
   .sort((a,b)=>a.roiYears-b.roiYears).slice(0,3);

  const TOP3 = top3.length ? `
    ${section('Top 3 Actions Recommandees','Classées par temps de retour')}
    ${tableWrap(`<table>
      <thead><tr>${[['N°','c'],['Action','l'],['Site','l'],['CAPEX net','r'],['Economies/an','r'],['Retour','r']].map(([h,a])=>th(h,a)).join('')}</tr></thead>
      <tbody>${top3.map((r,i)=>`<tr>
        ${td(`<b>#${i+1}</b>`,'c')}
        ${td(`<b>${r.label}</b>${r.description?`<br><span style="color:#557265;font-size:7.5px">${r.description}</span>`:''}`)}
        ${td(r.siteName)}
        ${td(F.eur(r.netCapex),'r')}
        ${td(F.eur(r.savedEur),'r')}
        ${td(`<b style="color:${roiColor(r.roiYears)}">${F.roi(r.roiYears)}</b>`,'r')}
      </tr>`).join('')}</tbody>
    </table>`)}` : '';

  // ── Récap sites ───────────────────────────────────────────────────────────
  const RECAP = sr.length ? `
    ${section('Recapitulatif des Sites')}
    ${tableWrap(`<table>
      <thead><tr>${[['Site','l'],['Usage','l'],['Surface','r'],['Conso act.','r'],['Gain','r'],['DPE','c'],['Statut','c'],['CAPEX','r'],['Eco./an','r'],['ROI','r']].map(([h,a])=>th(h,a)).join('')}</tr></thead>
      <tbody>${sr.map(site=>{
        const siteData=p.sites?.find(s=>s.id===site.siteId)??{};
        const sc=statusOf(site.score);
        return `<tr>
          ${td(`<b>${site.siteName}</b>`)}
          ${td(siteData.identity?.usage??'—')}
          ${td(F.surf(siteData.identity?.surface),'r')}
          ${td(`${site.intensityBefore??'—'} kWh/m2`,'r')}
          ${td(`<b style="color:#18b45b">${site.gainPctTotal??'—'} %</b>`,'r')}
          ${td(`<span class="dpe" style="background:${dpeColor(site.dpeBefore)}">${site.dpeBefore}</span> → <span class="dpe" style="background:${dpeColor(site.dpeAfter)}">${site.dpeAfter}</span>`,'c')}
          ${td(`<span class="badge" style="background:${sc.color}22;color:${sc.color};border:1px solid ${sc.color}44">${sc.label}</span>`,'c')}
          ${td(F.eur(site.totalNetCapex),'r')}
          ${td(F.eur(site.totalSavedEur),'r')}
          ${td(`<b style="color:${roiColor(site.roiGlobal)}">${F.roi(site.roiGlobal)}</b>`,'r')}
        </tr>`;
      }).join('')}</tbody>
    </table>`)}` : '';

  // ── Top actions agrégées portefeuille ─────────────────────────────────────
  const aggMeasures = pf.aggregatedMeasures ?? [];
  const AGG = aggMeasures.length ? `
    ${section("Top actions portefeuille","Consolidation cross-sites — même poste sur plusieurs bâtiments")}
    ${tableWrap(`<table>
      <thead><tr>${[['Poste','l'],['Sites','c'],['CAPEX net total','r'],['Eco. total/an','r'],['kWh économisés','r'],['ROI portefeuille','r']].map(([h,a])=>th(h,a)).join('')}</tr></thead>
      <tbody>${aggMeasures.slice(0,8).map((m,i)=>`<tr>
        ${td(`<b>${m.label}</b>${m.description?`<br><span style="color:#557265;font-size:7.5px">${m.description}</span>`:''}`)}
        ${td(String(m.count),'c')}
        ${td(F.eur(m.netCapex),'r')}
        ${td(F.eur(m.savedEur),'r')}
        ${td(F.kwh(m.savedKwh),'r')}
        ${td(`<b style="color:${roiColor(m.roiYears)}">${F.roi(m.roiYears)}</b>`,'r')}
      </tr>`).join('')}</tbody>
    </table>`)}` : '';

  // ── Détail par site ───────────────────────────────────────────────────────
  const DETAIL = sr.map((site, si) => {
    const siteData = p.sites?.find(s=>s.id===site.siteId)??{};
    const sc = statusOf(site.score);
    const posts = site.postResults??[];
    const scenarios = site.scenarios ?? {};
    const activeKey = site.activeScenario ?? 'intermediaire';
    const keys = ['sobriete','intermediaire','ambitieux'];

    // Tableau avant / après bâtiment
    const beforeAfterRows = [
      ['Consommation annuelle', F.kwh(site.currentKwh), F.kwh(site.consoOpt)],
      ['Intensité (kWh/m2)', `${site.intensityBefore} kWh/m2`, `${site.intensityAfter} kWh/m2`],
      ['Dépense annuelle', F.eur(site.currentCost), F.eur(site.costOpt)],
      ['Classe DPE', `<span class="dpe" style="background:${dpeColor(site.dpeBefore)}">${site.dpeBefore}</span> ${site.dpeBefore}`, `<span class="dpe" style="background:${dpeColor(site.dpeAfter)}">${site.dpeAfter}</span> ${site.dpeAfter}`],
      ['Emissions CO2', F.co2(site.currentEmissions), F.co2(site.projectedEmissions)],
      ['Economie annuelle', '—', `<b style="color:#18b45b">${F.eur(site.totalSavedEur)}</b>`],
    ].map(([label,before,after])=>`<tr>
      <td class="col-label" style="padding:7px 10px;border-bottom:1px solid #d0e8da;font-size:9px;font-weight:700;width:35%">${label}</td>
      <td class="col-before" style="padding:7px 10px;border-bottom:1px solid #d0e8da;font-size:9px;color:#e34b4b;width:32.5%">${before}</td>
      <td class="col-after" style="padding:7px 10px;border-bottom:1px solid #d0e8da;font-size:9px;color:#18b45b;font-weight:700;width:32.5%">${after}</td>
    </tr>`).join('');

    // Comparatif 3 scénarios
    const maxGain  = Math.max(...keys.map(k=>scenarios[k]?.gainPctTotal??0),1);
    const maxSav   = Math.max(...keys.map(k=>scenarios[k]?.totalSavedEur??0),1);
    const maxCapex = Math.max(...keys.map(k=>scenarios[k]?.totalNetCapex??0),1);
    const scenarioCards = keys.map(key => {
      const sc2 = scenarios[key];
      const isAct = key===activeKey;
      return `<div class="scenario-card ${isAct?'active':''}">
        <h4>${sc2?.scenarioLabel??key}</h4>
        <div class="sc-sub">${isAct?'Scénario sélectionné':'Scénario alternatif'}</div>
        <div class="sc-bar-row">
          <span class="sc-bar-lbl">Gain énergie</span>
          <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${Math.min(100,((sc2?.gainPctTotal??0)/maxGain)*100).toFixed(1)}%;background:#18b45b"></div></div>
          <span class="sc-bar-val">${F.pct(sc2?.gainPctTotal)}</span>
        </div>
        <div class="sc-bar-row">
          <span class="sc-bar-lbl">Economies/an</span>
          <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${Math.min(100,((sc2?.totalSavedEur??0)/maxSav)*100).toFixed(1)}%;background:#2c7b98"></div></div>
          <span class="sc-bar-val">${F.eur(sc2?.totalSavedEur)}</span>
        </div>
        <div class="sc-bar-row">
          <span class="sc-bar-lbl">CAPEX net</span>
          <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${Math.min(100,((sc2?.totalNetCapex??0)/maxCapex)*100).toFixed(1)}%;background:#f0c040"></div></div>
          <span class="sc-bar-val">${F.eur(sc2?.totalNetCapex)}</span>
        </div>
        <div style="margin-top:8px;font-size:8px;color:${roiColor(sc2?.roiGlobal)};font-weight:800">ROI : ${F.roi(sc2?.roiGlobal)}</div>
      </div>`;
    }).join('');

    // Postes tableau
    const postsRows = posts.map((r,i)=>{
      const [minG,maxG]=r.gainRange??[r.gainPctRaw,r.gainPctRaw];
      return `<tr>
        ${td(`<b>${r.label}</b>${r.description?`<br><span style="color:#557265;font-size:7.5px">${r.description}</span>`:''}`)}
        ${td(F.pctRange(minG,maxG),'c','color:#557265;font-style:italic')}
        ${td(F.eur(r.netCapex),'r')}
        ${td(F.eur(r.savedEur),'r')}
        ${td(`<b style="color:${roiColor(r.roiYears)}">${F.roi(r.roiYears)}</b>${r.roiTarget?`<br><span style="font-size:7px;color:#aaa">${r.roiTarget}</span>`:''}`,'r')}
      </tr>`;
    }).join('');

    return `<div class="${si>0?'pb':''}">
      ${si===0?section("Plan d'Actions Détaillé","État actuel → état projeté, comparatif 3 scénarios"):''}
      <div class="site-header">
        <div>
          <h3>${site.siteName}</h3>
          <div class="meta">
            ${[siteData.identity?.usage,
               F.surf(siteData.identity?.surface),
               site.climateZone?`Zone ${site.climateZone}`:'',
               site.occupancy?`${site.occupancy}h/jour`:'',
               `${site.intensityBefore??'—'} kWh/m2 actuellement`
              ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="dpe" style="background:${dpeColor(site.dpeBefore)}">${site.dpeBefore}</span>
          <span style="color:#aaa;font-size:13px">→</span>
          <span class="dpe" style="background:${dpeColor(site.dpeAfter)}">${site.dpeAfter}</span>
          <span class="badge" style="background:${sc.color}22;color:${sc.color};border:1px solid ${sc.color}44">Score ${site.score}/100</span>
        </div>
      </div>

      <!-- KPIs site actif -->
      <div class="kpi-row kpi-row--4">
        ${kpiCard('Gain estime',`${site.gainPctTotal??'—'} %`,`plafond : ${site.capGainPct??'—'} %`,true,'#18b45b')}
        ${kpiCard('Economies / an',F.eur(site.totalSavedEur),site.pvSavedEur?`dont PV : ${F.eur(site.pvSavedEur)}`:'')}
        ${kpiCard('Investissement net',F.eur(site.totalNetCapex),`brut : ${F.eur(site.totalGrossCapex)}`)}
        ${kpiCard('ROI estime',F.roi(site.roiGlobal),'',false,roiColor(site.roiGlobal))}
      </div>
      ${progress(site.gainPctTotal??0,'Reduction des consommations')}

      <!-- Avant / Après -->
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#557265;margin:12px 0 6px">
        État actuel → État projeté (scénario ${site.scenarioLabel??site.activeScenario})
      </div>
      ${tableWrap(`<table class="state-table">
        <thead><tr>
          ${th('Indicateur')}${th('Avant travaux','l')}${th('Après travaux','l')}
        </tr></thead>
        <tbody>${beforeAfterRows}</tbody>
      </table>`)}

      <!-- Comparatif 3 scénarios -->
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#557265;margin:12px 0 6px">
        Comparatif 3 scénarios
      </div>
      <div class="scenario-row">${scenarioCards}</div>

      <!-- Tableau postes -->
      ${posts.length?tableWrap(`<table>
        <thead><tr>${[['Poste','l'],['Gain (plage)','c'],['CAPEX net','r'],['Eco./an','r'],['Retour','r']].map(([h,a])=>th(h,a)).join('')}</tr></thead>
        <tbody>${postsRows}</tbody>
      </table>`):''}
    </div>`;
  }).join('');

  const FOOTER = `<div class="doc-footer">
    <div><span class="brand">EcoVerta</span> · contact@ecovertaconsult.com · www.ecovertaconsult.com</div>
    <div>Document indicatif — non contractuel · ${F.date()}</div>
  </div>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>EcoVerta — ${p.meta?.projectName||'Rapport'}</title>
    <style>${CSS}</style></head><body>
    ${HERO}<div class="body">
    ${SYNTH}${TOP3}${RECAP}${AGG}${DETAIL}${FOOTER}
    </div></body></html>`;
}

export async function generatePremiumAuditPdf(project, auditResult) {
  const html = buildHtml(project, auditResult);
  const win  = window.open('', '_blank', 'width=960,height=800');
  if (!win) {
    const blob = new Blob([html],{type:'text/html;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),{href:url,download:`ecoverta-${(project.meta?.projectName||'rapport').replace(/\s+/g,'-')}.html`});
    a.click(); URL.revokeObjectURL(url); return;
  }
  win.document.write(html);
  win.document.close();
  win.addEventListener('load',()=>{ setTimeout(()=>{ win.focus(); win.print(); },700); });
}
