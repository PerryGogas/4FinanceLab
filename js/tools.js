/* 4Finance Lab - tool definitions (inputs, calculations, charts, tables, step-by-step formulas) */
(function () {
  'use strict';
  const F = window.FM;
  const { num, money, pct } = F;

  // ---------------- Icons (24x24 stroke) ----------------
  window.FL_ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    xlsx: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><path d="M4 18h2M18 18h2M12 8V6"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    bond: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    barrel: '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
    option: '<path d="M3 20h4l10-16h4"/><path d="M14 20h7"/>',
    bell: '<path d="M2 20c3 0 4-14 10-14s7 14 10 14"/><path d="M7 20V12"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="16" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="8" cy="16" r="1.2"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
    loan: '<path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18"/>',
    pie: '<path d="M12 3v9h9"/><path d="M20.5 15.5A9 9 0 1 1 8.5 3.7"/>',
    sml: '<path d="M3 21V3M3 21h18"/><path d="M5 17l14-10"/><circle cx="13" cy="10" r="1.6"/>',
    lab: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>'
  };

  window.FL_CATS = [
    { id: 'distress', name: 'Credit & Distress' },
    { id: 'fixed', name: 'Fixed Income' },
    { id: 'deriv', name: 'Derivatives' },
    { id: 'risk', name: 'Risk Management' },
    { id: 'corp', name: 'Corporate Finance & Investments' }
  ];

  // ---------------- Chart helpers ----------------
  const pts = (xs, ys) => xs.map((x, i) => ({ x, y: ys[i] }));
  function lineOpts(T, o) {
    const xf = o.xFmt || (v => num(v, 2)), yf = o.yFmt || (v => num(v, 2));
    return {
      parsing: true,
      scales: {
        x: { type: 'linear', title: { display: !!o.xTitle, text: o.xTitle }, ticks: { callback: v => (o.xTick || xf)(v), maxTicksLimit: 10 }, grid: { color: T.grid }, min: o.xMin, max: o.xMax },
        y: { type: 'linear', title: { display: !!o.yTitle, text: o.yTitle }, ticks: { callback: v => (o.yTick || yf)(v) }, grid: { color: T.grid }, min: o.yMin, max: o.yMax, beginAtZero: !!o.beginAtZero, display: o.yDisplay !== false }
      },
      plugins: {
        legend: { display: o.legend !== false, position: 'bottom' },
        tooltip: { callbacks: { title: it => it.length ? (o.xTitle ? o.xTitle + ': ' : '') + xf(it[0].parsed.x) : '', label: c => ' ' + (c.dataset.label || '') + ': ' + (c.dataset.yFmt || yf)(c.parsed.y) } },
        vlines: { lines: o.vlines || [] }
      }
    };
  }
  const ds = (label, data, color, extra) => Object.assign({ label, data, borderColor: color, backgroundColor: color, pointRadius: 0, tension: 0 }, extra || {});
  const marker = (label, x, y, color, extra) => Object.assign({ label, data: [{ x, y }], type: 'scatter', borderColor: color, backgroundColor: color, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'circle', showLine: false }, extra || {});
  const zoneClass = z => z === 'safe' ? 'good' : z === 'grey' ? 'warn' : 'bad';

  function zoneBar(value, lo, hi, min, max, labels) {
    const p = x => Math.max(0, Math.min(100, (x - min) / (max - min) * 100));
    return `<div class="panel"><div class="panel-h"><h3>Where the firm stands</h3></div><div class="panel-b">
      <div class="zonebar-wrap"><div class="zonebar">
        <div style="width:${p(lo)}%;background:var(--bad)"></div>
        <div style="width:${p(hi) - p(lo)}%;background:var(--warn)"></div>
        <div style="flex:1;background:var(--good)"></div>
      </div><span class="mk" style="left:${p(lo)}%">${num(lo, 2)}</span><span class="mk" style="left:${p(hi)}%">${num(hi, 2)}</span><div class="zonebar-pin" style="left:${p(value)}%" title="${num(value, 3)}"></div></div>
      <div class="zonebar-lbl"><span>${labels[0]}</span><span>${labels[1]}</span><span>${labels[2]}</span></div>
      <div class="note" style="margin-top:8px">Marker: score = <b>${num(value, 3)}</b>${value < min || value > max ? ' (outside the displayed range)' : ''}.</div></div></div>`;
  }

  const TOOLS = [];

  /* =====================================================================
     1. ALTMAN Z-SCORE (Z, Z', Z'', EM score, bond-rating equivalent, PD, batch)
     ===================================================================== */
  const ALT = {
    public: { name: 'Z-Score (public manufacturing)', sym: 'Z', c: [1.2, 1.4, 3.3, 0.6, 1.0], k: 0, lo: 1.81, hi: 2.99, eq: 'Market value of equity' },
    private: { name: "Z'-Score (private manufacturing)", sym: "Z'", c: [0.717, 0.847, 3.107, 0.420, 0.998], k: 0, lo: 1.23, hi: 2.90, eq: 'Book value of equity' },
    non_mfg: { name: "Z''-Score (non-manufacturing / services)", sym: "Z''", c: [6.56, 3.26, 6.72, 1.05], k: 0, lo: 1.10, hi: 2.60, eq: 'Book value of equity' },
    em: { name: "EM score (Z'' + 3.25, emerging markets)", sym: 'EM', c: [6.56, 3.26, 6.72, 1.05], k: 3.25, lo: 4.35, hi: 5.85, eq: 'Book value of equity' }
  };
  // Median Z''-scores (with the 3.25 constant) of US firms by S&P rating. Source: Altman, "50 Years of Altman Z-Score" (slide: US Bond Rating Equivalents Based on Z''-Score Model); data Compustat, company filings and S&P.
  const BRE_RATINGS = ['AAA/AA+', 'AA/AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC/D'];
  const BRE_MED = {
    1996: [8.15, 7.16, 6.85, 6.65, 6.40, 6.25, 5.85, 5.65, 5.25, 4.95, 4.75, 4.50, 4.15, 3.75, 3.20, 2.50, 1.75, 0],
    2006: [7.51, 7.78, 7.76, 7.53, 7.10, 6.47, 6.41, 6.36, 6.25, 6.17, 5.65, 5.05, 4.29, 3.68, 2.98, 2.20, 1.62, 0.84],
    2013: [8.80, 8.40, 8.22, 6.94, 6.12, 5.80, 5.75, 5.70, 5.65, 5.52, 5.07, 4.81, 4.03, 3.74, 2.84, 2.57, 1.72, 0.05]
  };
  // S&P Global Ratings, 2023 Annual Global Corporate Default And Rating Transition Study, Table 9: average one-year default rates 1981-2023 (%).
  // Grouped ratings use the average of their members; CCC+/CCC/CCC- use the CCC/C rate; CC/D is in or at default.
  const BRE_PD = [0.00, 0.015, 0.04, 0.04, 0.06, 0.11, 0.20, 0.22, 0.45, 0.65, 1.12, 1.99, 5.35, 8.20, 24.45, 24.45, 24.45, null];
  function breOf(em, year) {
    const med = BRE_MED[year] || BRE_MED[1996];
    let best = 0;
    if (em < med[0]) { let d = Infinity; med.forEach((m, i) => { const di = Math.abs(em - m); if (di < d) { d = di; best = i; } }); }
    return { i: best, rating: BRE_RATINGS[best], median: med[best], pd: BRE_PD[best] };
  }
  const pdTxt = p => p === null ? 'at/near default' : p === 0 ? '< 0.01%' : num(p, p < 0.1 ? 3 : 2) + '%';
  function altmanAll(d) {
    // d: {ta, tl, wc, re, ebit, mve, bve, sales}; returns every model's score
    const X1 = d.wc / d.ta, X2 = d.re / d.ta, X3 = d.ebit / d.ta, X5 = d.sales / d.ta;
    const mX4 = d.mve / d.tl, bX4 = d.bve / d.tl;
    const out = { X1, X2, X3, mX4, bX4, X5 };
    out.Z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * mX4 + 1.0 * X5;
    out.Zp = 0.717 * X1 + 0.847 * X2 + 3.107 * X3 + 0.420 * bX4 + 0.998 * X5;
    out.Zpp = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * bX4;
    out.EM = out.Zpp + 3.25;
    return out;
  }
  const zoneOf = (s, m) => !isFinite(s) ? '' : s > m.hi ? 'Safe' : s < m.lo ? 'Distress' : 'Grey';
  // flexible column matching for uploaded files
  const BATCH_COLS = {
    firm: ['firm', 'company', 'name', 'firmname'], year: ['year', 'period', 'fiscalyear'],
    ta: ['totalassets', 'ta', 'assets'], tl: ['totalliabilities', 'tl', 'liabilities'],
    wc: ['workingcapital', 'wc'], ca: ['currentassets', 'ca'], cl: ['currentliabilities', 'cl'],
    re: ['retainedearnings', 're'], ebit: ['ebit', 'operatingincome'],
    mve: ['marketvalueofequity', 'marketequity', 'mve', 'marketcap', 'marketcapitalization'],
    bve: ['bookvalueofequity', 'bookequity', 'bve', 'equity', 'totalequity', 'shareholdersequity'],
    sales: ['sales', 'revenue', 'revenues', 'totalrevenue', 'turnover']
  };
  function batchRows(raw) {
    if (!Array.isArray(raw) || !raw.length) return [];
    const keys = Object.keys(raw[0]); const map = {};
    const norm = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
    Object.entries(BATCH_COLS).forEach(([k, al]) => { const hit = keys.find(h => al.includes(norm(h))); if (hit) map[k] = hit; });
    const n = x => { if (x === undefined || x === null || x === '') return NaN; return typeof x === 'number' ? x : parseFloat(String(x).replace(/[\s,$€]/g, '')); };
    return raw.map((r, idx) => {
      const g = k => map[k] ? n(r[map[k]]) : NaN;
      let wc = g('wc'); if (!isFinite(wc)) wc = g('ca') - g('cl');
      let mve = g('mve'), bve = g('bve');
      const notes = [];
      if (!isFinite(bve) && isFinite(mve)) { bve = mve; notes.push('book equity missing: market value used'); }
      if (!isFinite(mve) && isFinite(bve)) { mve = bve; notes.push('market equity missing: book value used'); }
      return { firm: map.firm ? String(r[map.firm]) : 'Row ' + (idx + 1), year: map.year ? r[map.year] : '', ta: g('ta'), tl: g('tl'), wc, re: g('re'), ebit: g('ebit'), mve, bve, sales: g('sales'), notes };
    });
  }
  // US GNP implicit price deflator rebased to 1968 = 100 (FRED A001RD3A086NBEA, 2017 = 100; 1968 = 18.246). Ohlson uses the year before the balance sheet.
  const GNP_1968 = { 2020: 577.1, 2021: 603.3, 2022: 646.4, 2023: 670.6, 2024: 687.8, 2025: 705.9 };
  const gnpIndex = date => { const y = Math.min(2025, Math.max(2020, +String(date).slice(0, 4) - 1)); return GNP_1968[y]; };
  const companyInput = map => ({ id: 'company', label: 'Load company data', type: 'company', optional: true, map,
    hint: 'Fills the inputs below from the latest annual statements. You can still edit any value.' });
  function altBatch(out, v, m, year) {
      const B = batchRows(v.batch);
      if (B.length) {
        const res = B.map(r => {
          const ok = r.ta > 0 && r.tl > 0 && [r.wc, r.re, r.ebit, r.mve, r.bve].every(isFinite);
          if (!ok) return { r, err: true };
          const s = altmanAll(r); const b = breOf(s.EM, year);
          return { r, s, b, sel: v.model === 'public' ? s.Z : v.model === 'private' ? s.Zp : v.model === 'non_mfg' ? s.Zpp : s.EM };
        });
        const bad = res.filter(x => x.err).length;
        if (bad) out.warnings.push(`${bad} uploaded row(s) are missing required numbers (total assets, total liabilities, working capital or current assets/liabilities, retained earnings, EBIT, equity) and were skipped.`);
        const noSales = res.some(x => !x.err && !isFinite(x.r.sales));
        if (noSales) out.warnings.push('Some rows have no Sales column, so Z and Z\' are blank for them; Z\'\' and EM do not need sales.');
        const notes = res.filter(x => x.r.notes.length).length;
        if (notes) out.warnings.push(`${notes} row(s) had only one equity value; it was used for both market and book equity.`);
        const good = res.filter(x => !x.err);
        const label = x => x.r.firm + (x.r.year !== '' && x.r.year !== undefined ? ' ' + x.r.year : '');
        out.tables.unshift({
          id: 'batch', title: `Batch results (${good.length} rows from upload)`,
          columns: [{ h: 'Firm', num: false }, { h: 'Year', num: false }, { h: 'Z', fmt: x => num(x, 2) }, { h: 'Z zone', num: false }, { h: "Z'", fmt: x => num(x, 2) }, { h: "Z' zone", num: false }, { h: "Z''", fmt: x => num(x, 2) }, { h: "Z'' zone", num: false }, { h: 'EM', fmt: x => num(x, 2) }, { h: 'Rating equiv.', num: false }, { h: 'PD 1-year', num: false }],
          rows: good.map(x => [x.r.firm, String(x.r.year ?? ''), isFinite(x.s.Z) ? x.s.Z : '', zoneOf(x.s.Z, ALT.public), isFinite(x.s.Zp) ? x.s.Zp : '', zoneOf(x.s.Zp, ALT.private), x.s.Zpp, zoneOf(x.s.Zpp, ALT.non_mfg), x.s.EM, x.b.rating, pdTxt(x.b.pd)]),
          note: 'Every row is scored with all four models. Z uses market equity; Z\', Z\'\' and EM use book equity. Rating equivalents use the ' + year + ' calibration.'
        });
        const zs = good.map(x => x.sel);
        out.charts.unshift({
          id: 'batchChart', title: m.sym + ' score by firm / year (uploaded data)',
          note: 'Bars are coloured by zone; dashed lines are the ' + m.sym + ' cut-offs (' + m.lo + ' and ' + m.hi + ').',
          exportData: () => ({ columns: ['Firm / year', m.sym, 'Zone', 'Rating equivalent', 'PD 1-year (%)'], rows: good.map((x, i) => [label(x), zs[i], zoneOf(zs[i], m), x.b.rating, x.b.pd === null ? 'default' : x.b.pd]) }),
          build: T => ({
            type: 'bar',
            data: { labels: good.map(label), datasets: [
              { label: m.sym, data: zs.map(z => isFinite(z) ? z : null), backgroundColor: zs.map(z => z > m.hi ? T.alpha(T.good, .8) : z < m.lo ? T.alpha(T.bad, .8) : T.alpha(T.warn, .8)), borderRadius: 5, order: 2 },
              { type: 'line', label: 'Safe cut-off ' + m.hi, data: good.map(() => m.hi), borderColor: T.good, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, order: 1 },
              { type: 'line', label: 'Distress cut-off ' + m.lo, data: good.map(() => m.lo), borderColor: T.bad, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, order: 1 }] },
            options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { afterLabel: c => c.datasetIndex === 0 ? ' Rating equiv. ' + good[c.dataIndex].b.rating + ', PD ' + pdTxt(good[c.dataIndex].b.pd) : '' } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: T.grid } } } }
          })
        });
      }
    return out;
  }
  TOOLS.push({
    id: 'altman', cat: 'distress', icon: 'gauge', title: 'Altman Z-Score Analyzer', short: 'Altman Z-Score',
    desc: 'Z, Z\', Z\'\' and EM score with zones, bond-rating equivalent, default probability and Excel/CSV batch upload.',
    long: 'Altman\'s distress models: the original Z for public manufacturers (1968), Z\' for private firms, Z\'\' for non-manufacturing firms and the EM score (Z\'\' + 3.25). Every firm also gets Altman\'s bond-rating equivalent and the historical one-year default rate of that rating. Upload an Excel or CSV file to score many firms or years at once.',
    inputs: [
      companyInput((c, p, v) => ({ ta: c.ta, tl: c.tl, wc: c.wc ?? (c.ca != null && c.cl != null ? c.ca - c.cl : null), re: c.re, ebit: c.ebit, eq: v.model === 'public' ? c.mve : c.bve, beq: c.bve, sales: c.sales })),
      { id: 'model', label: 'Model', type: 'seg', value: 'public', options: [['public', 'Z public'], ['private', "Z' private"], ['non_mfg', "Z'' non-mfg"], ['em', 'EM score']] },
      { id: 'ta', label: 'Total assets', unit: '$', value: 1000000 },
      { id: 'tl', label: 'Total liabilities', unit: '$', value: 600000 },
      { id: 'wc', label: 'Working capital', unit: '$', value: 200000, hint: 'Current assets minus current liabilities' },
      { id: 're', label: 'Retained earnings', unit: '$', value: 300000 },
      { id: 'ebit', label: 'EBIT', unit: '$', value: 150000 },
      { id: 'eq', label: 'Equity value', unit: '$', value: 1200000, hint: 'Market value of equity for Z; book value of equity for Z\', Z\'\' and EM' },
      { id: 'beq', label: 'Book value of equity', unit: '$ (optional)', value: '', optional: true, showIf: v => v.model === 'public', hint: 'Used for the rating equivalent and default probability, which Altman bases on book equity. Leave empty to use the market value above.' },
      { id: 'sales', label: 'Sales (revenue)', unit: '$', value: 1800000, showIf: v => v.model === 'public' || v.model === 'private' },
      { id: 'breYear', label: 'Rating calibration', type: 'select', value: '1996', options: [['1996', 'Altman 1996 medians (classic)'], ['2006', 'Altman 2006 medians'], ['2013', 'Altman 2013 medians (latest)']] },
      { id: 'batch', label: 'Batch: upload Excel or CSV', type: 'file', optional: true, accept: '.xlsx,.xls,.csv', datasetButton: true,
        hint: 'One row per firm or year. Download the template for the column names, or click Built-in companies to score all the included firms (latest year).',
        template: { name: '4FinanceLab_Altman_template.xlsx', columns: ['Firm', 'Year', 'Total Assets', 'Total Liabilities', 'Working Capital', 'Retained Earnings', 'EBIT', 'Market Value of Equity', 'Book Value of Equity', 'Sales'],
          rows: [['Alpha SA', 2023, 1000000, 600000, 200000, 300000, 150000, 1200000, 400000, 1800000], ['Alpha SA', 2024, 1050000, 680000, 150000, 310000, 90000, 900000, 370000, 1700000], ['Beta Ltd', 2024, 500000, 450000, 20000, -40000, 10000, 120000, 50000, 400000]] } }
    ],
    compute(v) {
      const m = ALT[v.model];
      const year = v.breYear || '1996';
      if (v.__singleInvalid || !(v.ta > 0 && v.tl > 0)) {
        const why = v.__singleInvalid || 'Total assets and total liabilities must be positive.';
        if (!(Array.isArray(v.batch) && v.batch.length)) return { error: why };
        return altBatch({ warnings: ['Single-firm inputs: ' + why + ' Batch results are shown below.'], kpis: [], charts: [], tables: [], steps: [] }, v, m, year);
      }
      const X = [v.wc / v.ta, v.re / v.ta, v.ebit / v.ta, v.eq / v.tl, v.sales / v.ta].slice(0, m.c.length);
      const names = ['Working capital / Total assets', 'Retained earnings / Total assets', 'EBIT / Total assets', m.eq + ' / Total liabilities', 'Sales / Total assets'];
      const contrib = X.map((x, i) => x * m.c[i]);
      const Z = m.k + contrib.reduce((a, b) => a + b, 0);
      const zone = Z > m.hi ? 'safe' : Z < m.lo ? 'distress' : 'grey';
      const zoneTxt = { safe: 'SAFE ZONE', grey: 'GREY ZONE', distress: 'DISTRESS ZONE' }[zone];
      const rows = X.map((x, i) => [`X${i + 1}`, names[i], x, m.c[i], contrib[i]]);
      if (m.k) rows.unshift(['', 'Constant', '', '', m.k]);
      rows.push(['', '<b>' + m.sym + ' (sum)</b>', '', '', Z]);
      const warnings = [];
      // EM score for the rating equivalent (book equity)
      const bookEq = v.model === 'public' ? (isFinite(v.beq) ? v.beq : v.eq) : v.eq;
      if (v.model === 'public' && !isFinite(v.beq)) warnings.push('Rating equivalent and default probability use the market value of equity because no book value was entered. Altman\'s calibration uses book equity, so enter it for a closer match.');
      const eX4 = bookEq / v.tl;
      const EM = 3.25 + 6.56 * X[0] + 3.26 * X[1] + 6.72 * X[2] + 1.05 * eX4;
      const bre = breOf(EM, year);
      const ladder = BRE_RATINGS.map((r, i) => [r, BRE_MED[year][i], BRE_PD[i] === null ? 'default' : BRE_PD[i] / 100]);
      const out = {
        warnings,
        kpis: [
          { k: m.sym + ' score', v: num(Z, 3), raw: Z, s: m.name, cls: zoneClass(zone), big: true },
          { k: 'Classification', v: zoneTxt, s: `Distress < ${m.lo} ≤ Grey ≤ ${m.hi} < Safe`, cls: zoneClass(zone) },
          { k: 'Bond-rating equivalent', v: bre.rating, raw: bre.rating, s: `EM score ${num(EM, 2)}; nearest ${year} median ${num(bre.median, 2)}`, cls: bre.i <= 9 ? 'good' : bre.i <= 13 ? 'warn' : 'bad' },
          { k: 'Probability of default (1 year)', v: pdTxt(bre.pd), raw: bre.pd === null ? '' : bre.pd / 100, s: 'S&P average one-year default rate for ' + bre.rating + ', 1981-2023', cls: bre.pd === null || bre.pd >= 5 ? 'bad' : bre.pd >= 0.45 ? 'warn' : 'good' }
        ],
        html: zoneBar(Z, m.lo, m.hi, Math.min(0, m.lo - 1), Math.max(m.hi + 1.5, 4), ['Distress', 'Grey zone', 'Safe']),
        charts: [{
          id: 'contrib', title: 'Contribution of each ratio to ' + m.sym,
          note: 'Bar length = coefficient × ratio' + (m.k ? ' (the 3.25 constant is not shown)' : '') + '. Hover for values.',
          exportData: () => ({ columns: ['Variable', 'Ratio', 'Coefficient', 'Contribution'], rows: X.map((x, i) => ['X' + (i + 1) + ' ' + names[i], x, m.c[i], contrib[i]]) }),
          build: T => ({
            type: 'bar',
            data: { labels: X.map((_, i) => 'X' + (i + 1)), datasets: [{ label: 'Contribution', data: contrib, backgroundColor: contrib.map(c => c >= 0 ? T.c[0] : T.c[4]), borderRadius: 6 }] },
            options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { title: it => names[it[0].dataIndex], label: c => ` ${m.c[c.dataIndex]} × ${num(X[c.dataIndex], 4)} = ${num(c.parsed.x, 4)}` } } }, scales: { x: { grid: { color: T.grid } }, y: { grid: { display: false } } } }
          })
        }],
        tables: [
          { id: 'ratios', title: 'Variable breakdown', columns: [{ h: 'Var', num: false }, { h: 'Description', num: false }, { h: 'Ratio', fmt: x => num(x, 4) }, { h: 'Coefficient', fmt: x => num(x, 3) }, { h: 'Contribution', fmt: x => num(x, 4) }], rows, hl: [rows.length - 1] },
          { id: 'ladder', title: 'Bond-rating equivalents (Altman ' + year + ' medians) and default rates', columns: [{ h: 'Rating', num: false }, { h: 'Median EM score', fmt: x => num(x, 2) }, { h: '1-year default rate', fmt: x => x === 0 ? '< 0.01%' : pct(x, 2) }], rows: ladder, hl: [bre.i],
            note: 'The highlighted row is this firm. Default rates: S&P Global Ratings, average one-year global corporate default rates 1981-2023; grouped ratings use the average of their members and CCC+ to CCC- use the CCC/C rate.' }
        ],
        steps: [
          { h: '1. Compute the ratios', f: X.map((x, i) => `X<sub>${i + 1}</sub> = ${names[i]} = ${num(x, 4)}`) },
          { h: '2. Apply the ' + m.name + ' weights', f: [`${m.sym} = ` + (m.k ? m.k + ' + ' : '') + m.c.map((c, i) => `${c}·X<sub>${i + 1}</sub>`).join(' + ')], calc: `${m.sym} = ` + (m.k ? m.k + ' + ' : '') + m.c.map((c, i) => `${c}×${num(X[i], 4)}`).join(' + ') + ` = ${num(Z, 4)}` },
          { h: '3. Classify', f: [`${m.sym} &lt; ${m.lo}: distress &nbsp;&nbsp; ${m.lo} ≤ ${m.sym} ≤ ${m.hi}: grey zone &nbsp;&nbsp; ${m.sym} &gt; ${m.hi}: safe`], calc: `${num(Z, 3)} ⇒ ${zoneTxt}` },
          { h: '4. Bond-rating equivalent', f: ['EM = 3.25 + 6.56·X<sub>1</sub> + 3.26·X<sub>2</sub> + 6.72·X<sub>3</sub> + 1.05·(Book equity / Total liabilities)', 'Rating = the S&P rating whose median EM score is closest to the firm\'s EM score'], calc: `EM = 3.25 + 6.56×${num(X[0], 4)} + 3.26×${num(X[1], 4)} + 6.72×${num(X[2], 4)} + 1.05×${num(eX4, 4)} = ${num(EM, 4)}\nNearest ${year} median: ${bre.rating} (${num(bre.median, 2)})`, note: 'This is Altman\'s bond-rating-equivalent method: firms with the same score as the median firm of a rating class are treated as having that rating\'s credit quality.' },
          { h: '5. Probability of default', f: ['PD (1 year) = historical average one-year default rate of the equivalent rating'], calc: `${bre.rating} ⇒ ${pdTxt(bre.pd)}`, note: 'A rating-based PD is an average over 1981-2023; actual default risk varies with the credit cycle (higher in recessions).' }
        ],
        refs: 'Altman, E. I. (1968). Financial ratios, discriminant analysis and the prediction of corporate bankruptcy. <i>Journal of Finance</i>, 23(4). Altman, E. I. (2000/2002), revised Z\' and Z\'\' models. Altman, E. I. (2005), An emerging market credit scoring system for corporate bonds, <i>Emerging Markets Review</i>, 6(4). Rating medians: Altman, "50 Years of the Altman Z-Score" (Compustat, company filings, S&P). Default rates: S&P Global Ratings, 2023 Annual Global Corporate Default and Rating Transition Study, Table 9.'
      };
      return altBatch(out, v, m, year);
    }
  });

  /* =====================================================================
     2. BANKRUPTCY RISK (OHLSON O-SCORE + ALTMAN Z)
     ===================================================================== */
  TOOLS.push({
    id: 'bankruptcy', cat: 'distress', icon: 'alert', title: 'Bankruptcy Risk Analyzer', short: 'Ohlson O-Score',
    desc: 'Ohlson (1980) O-Score logit probability of failure, side by side with Altman\'s Z.',
    long: 'Ohlson\'s nine-factor logit model gives a probability of bankruptcy; the Altman public-firm Z-Score is shown alongside for comparison.',
    inputs: [
      companyInput((c, p) => ({ ta: c.ta, tl: c.tl, wc: c.wc ?? (c.ca != null && c.cl != null ? c.ca - c.cl : null), re: c.re, ebit: c.ebit, mve: c.mve, rev: c.sales, ca: c.ca, cl: c.cl, ni: c.ni, nip: p ? p.ni : null, ffo: c.ocf, gnp: gnpIndex(c.date) })),
      { id: 'thr', label: 'Probability threshold', type: 'select', value: '0.5', options: [['0.5', 'Commercial (50%)'], ['0.7', 'Banking (70%)'], ['custom', 'Custom...']] },
      { id: 'cthr', label: 'Custom threshold', unit: '%', value: 50, showIf: v => v.thr === 'custom' },
      { id: 'ta', label: 'Total assets', unit: '$', value: 1000000 },
      { id: 'tl', label: 'Total liabilities', unit: '$', value: 850000 },
      { id: 'wc', label: 'Working capital', unit: '$', value: 50000 },
      { id: 're', label: 'Retained earnings', unit: '$', value: 120000 },
      { id: 'ebit', label: 'EBIT', unit: '$', value: 45000 },
      { id: 'mve', label: 'Market value of equity', unit: '$', value: 1100000 },
      { id: 'rev', label: 'Total revenue', unit: '$', value: 1400000 },
      { id: 'ca', label: 'Current assets', unit: '$', value: 250000 },
      { id: 'cl', label: 'Current liabilities', unit: '$', value: 200000 },
      { id: 'ni', label: 'Net income (year t)', unit: '$', value: 20000 },
      { id: 'nip', label: 'Net income (year t−1)', unit: '$', value: -5000 },
      { id: 'ffo', label: 'Funds from operations', unit: '$', value: 40000, hint: 'Loaded company data uses cash flow from operations as the proxy.' },
      { id: 'gnp', label: 'GNP price-level index', value: 100, hint: 'SIZE = ln(Total assets in currency units / index). Ohlson (1980): US GNP price-level index with 1968 = 100, taken for the year before the balance sheet; about 688 for FY2025 statements. Filled automatically when you load company data.' }
    ],
    compute(v) {
      if (v.ta <= 0 || v.tl <= 0 || v.ca <= 0 || v.gnp <= 0) return { error: 'Total assets, total liabilities, current assets and the price index must be positive.' };
      const thr = v.thr === 'custom' ? v.cthr / 100 : parseFloat(v.thr);
      const den = Math.abs(v.ni) + Math.abs(v.nip);
      const X = [
        ['SIZE', 'ln(Total assets / GNP price index)', Math.log(v.ta / v.gnp), -0.407],
        ['TLTA', 'Total liabilities / Total assets', v.tl / v.ta, 6.03],
        ['WCTA', 'Working capital / Total assets', v.wc / v.ta, -1.43],
        ['CLCA', 'Current liabilities / Current assets', v.cl / v.ca, 0.0757],
        ['OENEG', '1 if Total liabilities > Total assets, else 0', v.tl > v.ta ? 1 : 0, -1.72],
        ['NITA', 'Net income / Total assets', v.ni / v.ta, -2.37],
        ['FUTL', 'Funds from operations / Total liabilities', v.ffo / v.tl, -1.83],
        ['INTWO', '1 if net loss in both of the last two years, else 0', (v.ni < 0 && v.nip < 0) ? 1 : 0, 0.285],
        ['CHIN', '(NI<sub>t</sub> − NI<sub>t−1</sub>) / (|NI<sub>t</sub>| + |NI<sub>t−1</sub>|)', den === 0 ? 0 : (v.ni - v.nip) / den, -0.521]
      ];
      const O = -1.32 + X.reduce((s, x) => s + x[2] * x[3], 0);
      const P = 1 / (1 + Math.exp(-O));
      const oDist = P > thr;
      const A = [v.wc / v.ta, v.re / v.ta, v.ebit / v.ta, v.mve / v.tl, v.rev / v.ta], ac = [1.2, 1.4, 3.3, 0.6, 1.0];
      const Z = A.reduce((s, a, i) => s + a * ac[i], 0);
      const zz = Z > 2.99 ? 'safe' : Z < 1.81 ? 'distress' : 'grey';
      const oRows = [['', 'Intercept', '', '', -1.32]].concat(X.map(x => [x[0], x[1], x[2], x[3], x[2] * x[3]]));
      oRows.push(['', '<b>O-Score</b>', '', '', O]);
      const aNames = ['Working capital / Total assets', 'Retained earnings / Total assets', 'EBIT / Total assets', 'Market value of equity / Total liabilities', 'Sales / Total assets'];
      const aRows = A.map((a, i) => ['X' + (i + 1), aNames[i], a, ac[i], a * ac[i]]); aRows.push(['', '<b>Z-Score</b>', '', '', Z]);
      const cols = [{ h: 'Var', num: false }, { h: 'Definition', num: false }, { h: 'Value', fmt: x => num(x, 4) }, { h: 'Coefficient', fmt: x => num(x, 4) }, { h: 'Contribution', fmt: x => num(x, 4) }];
      const Os = F.linspace(Math.min(-6, O - 1), Math.max(6, O + 1), 121);
      const oThr = Math.log(thr / (1 - thr));
      return {
        kpis: [
          { k: 'Ohlson O-Score', v: num(O, 3), raw: O, s: 'Logit score' },
          { k: 'Probability of bankruptcy', v: pct(P, 2), raw: P, s: 'P = 1 / (1 + e<sup>−O</sup>)', cls: oDist ? 'bad' : 'good', big: true },
          { k: 'Ohlson verdict', v: oDist ? 'DISTRESS' : 'SAFE', s: `Threshold ${pct(thr, 0)}`, cls: oDist ? 'bad' : 'good' },
          { k: 'Altman Z-Score', v: num(Z, 3), raw: Z, s: { safe: 'SAFE ZONE', grey: 'GREY ZONE', distress: 'DISTRESS ZONE' }[zz] + ' (1.81 / 2.99)', cls: zoneClass(zz) }
        ],
        charts: [
          {
            id: 'logit', title: 'Logistic curve: O-Score to probability',
            note: 'The firm sits on the logistic curve; the dashed line marks the score at which P equals the chosen threshold.',
            build: T => ({
              type: 'line',
              data: { datasets: [ds('P(bankruptcy)', pts(Os, Os.map(o => 1 / (1 + Math.exp(-o)))), T.c[2]), marker('This firm', O, P, oDist ? T.bad : T.good)] },
              options: lineOpts(T, { xTitle: 'O-Score', yTitle: 'Probability', yFmt: x => pct(x, 1), xFmt: x => num(x, 2), yMin: 0, yMax: 1, vlines: [{ x: oThr, color: T.c[1], label: 'Threshold ' + pct(thr, 0) }] })
            })
          },
          {
            id: 'ocontrib', title: 'O-Score contributions (coefficient × value)',
            build: T => ({
              type: 'bar',
              data: { labels: ['Intercept'].concat(X.map(x => x[0])), datasets: [{ label: 'Contribution', data: [-1.32].concat(X.map(x => x[2] * x[3])), backgroundColor: [-1.32].concat(X.map(x => x[2] * x[3])).map(c => c >= 0 ? T.c[4] : T.c[0]), borderRadius: 6 }] },
              options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + num(c.parsed.x, 4) + (c.parsed.x >= 0 ? ' (raises risk)' : ' (lowers risk)') } } }, scales: { x: { grid: { color: T.grid } }, y: { grid: { display: false } } } }
            })
          }
        ],
        tables: [
          { id: 'ohlson', title: 'Ohlson O-Score variables', columns: cols, rows: oRows, hl: [oRows.length - 1] },
          { id: 'altman', title: 'Altman Z-Score variables (public model)', columns: cols, rows: aRows, hl: [aRows.length - 1] }
        ],
        steps: [
          { h: '1. Ohlson (1980) model', f: ['O = −1.32 − 0.407·SIZE + 6.03·TLTA − 1.43·WCTA + 0.0757·CLCA − 1.72·OENEG − 2.37·NITA − 1.83·FUTL + 0.285·INTWO − 0.521·CHIN'], calc: 'O = −1.32 ' + X.map(x => (x[3] < 0 ? '− ' : '+ ') + Math.abs(x[3]) + '×' + num(x[2], 4)).join(' ') + ` = ${num(O, 4)}` },
          { h: '2. Convert the score to a probability', f: ['P = 1 / (1 + e<sup>−O</sup>)'], calc: `P = 1 / (1 + e^(${num(-O, 4)})) = ${num(P, 6)} = ${pct(P, 3)}` },
          { h: '3. Ohlson decision rule', f: ['Distress if P &gt; threshold'], calc: `${pct(P, 2)} ${oDist ? '>' : '≤'} ${pct(thr, 1)} ⇒ ${oDist ? 'DISTRESS' : 'SAFE'}`, note: 'Ohlson himself reported 3.8% as the cut-off that minimized total classification errors in his sample; 50% and 70% are more conservative conventions.' },
          { h: '4. Altman Z (public manufacturing)', f: ['Z = 1.2·X<sub>1</sub> + 1.4·X<sub>2</sub> + 3.3·X<sub>3</sub> + 0.6·X<sub>4</sub> + 1.0·X<sub>5</sub>'], calc: 'Z = ' + A.map((a, i) => `${ac[i]}×${num(a, 4)}`).join(' + ') + ` = ${num(Z, 4)}` }
        ],
        refs: 'Ohlson, J. A. (1980). Financial ratios and the probabilistic prediction of bankruptcy. <i>Journal of Accounting Research</i>, 18(1), 109-131. Coefficients from Ohlson\'s Model 1 (one-year horizon).'
      };
    }
  });

  /* =====================================================================
     3. BOND PRICING SOLVER
     ===================================================================== */
  function bondPrice(type, F_, cr, y, n, m) {
    if (type === 'perpetual') return cr * F_ / y;
    const i = y / m, N = n * m;
    if (type === 'zero') return F_ / Math.pow(1 + i, N);
    const c = cr * F_ / m;
    const ann = Math.abs(i) < 1e-12 ? N : (1 - Math.pow(1 + i, -N)) / i;
    return c * ann + F_ * Math.pow(1 + i, -N);
  }
  TOOLS.push({
    id: 'bond', cat: 'fixed', icon: 'bond', title: 'Bond Pricing Engine', short: 'Bond Pricing',
    desc: 'Coupon, zero-coupon and perpetual bonds. Solve for price, YTM, coupon, face value or maturity.',
    long: 'Pick the unknown and fill in the rest. Works for coupon bonds, zero-coupon (discount) bonds and perpetuities, with any compounding frequency.',
    inputs: [
      { id: 'type', label: 'Bond type', type: 'seg', value: 'coupon', options: [['coupon', 'Coupon'], ['zero', 'Zero-coupon'], ['perpetual', 'Perpetual']] },
      { id: 'solve', label: 'Solve for', type: 'select', value: 'price', options: [['price', 'Price (P)'], ['ytm', 'Yield to maturity'], ['cr', 'Coupon rate'], ['face', 'Face value (F)'], ['n', 'Years to maturity']] },
      { id: 'price', label: 'Market price', unit: '$', value: 950, disabledIf: v => v.solve === 'price' },
      { id: 'face', label: 'Face value', unit: '$', value: 1000, disabledIf: v => v.solve === 'face' },
      { id: 'ytm', label: 'Yield to maturity (annual)', unit: '%', value: 5, step: 0.01, disabledIf: v => v.solve === 'ytm' },
      { id: 'cr', label: 'Coupon rate (annual)', unit: '%', value: 4, step: 0.01, showIf: v => v.type !== 'zero', disabledIf: v => v.solve === 'cr' },
      { id: 'n', label: 'Years to maturity', unit: 'years', value: 10, step: 0.5, showIf: v => v.type !== 'perpetual', disabledIf: v => v.solve === 'n' },
      { id: 'm', label: 'Compounding / coupons per year', type: 'select', value: '1', options: [['1', 'Annual (1)'], ['2', 'Semi-annual (2)'], ['4', 'Quarterly (4)'], ['12', 'Monthly (12)']], showIf: v => v.type !== 'perpetual' }
    ],
    compute(v) {
      const type = v.type, m = parseInt(v.m), solve = v.solve;
      if (type === 'zero' && solve === 'cr') return { error: 'A zero-coupon bond has no coupon. Choose another unknown.' };
      if (type === 'perpetual' && solve === 'n') return { error: 'A perpetual bond has no maturity. Choose another unknown.' };
      let P = v.price, Fv = v.face, y = v.ytm / 100, cr = type === 'zero' ? 0 : v.cr / 100, n = v.n;
      const warnings = [];
      const i = () => y / m;
      if (solve !== 'price' && !(P > 0)) return { error: 'Price must be positive.' };
      if (solve !== 'face' && !(Fv > 0)) return { error: 'Face value must be positive.' };
      if (solve !== 'n' && type !== 'perpetual' && !(n > 0)) return { error: 'Years to maturity must be positive.' };
      let how = '';
      if (solve === 'price') { P = bondPrice(type, Fv, cr, y, n, m); how = 'closed form'; }
      else if (solve === 'ytm') {
        if (type === 'perpetual') { y = cr * Fv / P; how = 'y = C / P'; }
        else if (type === 'zero') { y = m * (Math.pow(Fv / P, 1 / (n * m)) - 1); how = 'closed form'; }
        else {
          const f = yy => bondPrice(type, Fv, cr, yy, n, m) - P;
          y = F.brent(f, -0.99 * m, 50 * m, 1e-13);
          how = 'Brent root-finding (iterative)';
          if (!isFinite(y)) return { error: 'No yield reproduces this price. Check the inputs (price must be below the undiscounted sum of cash flows).' };
        }
      } else if (solve === 'cr') {
        const N = n * m, ii = i();
        if (type === 'perpetual') cr = P * y / Fv;
        else { const ann = Math.abs(ii) < 1e-12 ? N : (1 - Math.pow(1 + ii, -N)) / ii; cr = (P - Fv * Math.pow(1 + ii, -N)) / ann * m / Fv; }
        how = 'closed form';
        if (cr < 0) warnings.push('The implied coupon rate is negative: the price is below the PV of the face value alone.');
      } else if (solve === 'face') {
        if (type === 'perpetual') { if (cr <= 0) return { error: 'Coupon rate must be positive.' }; Fv = P * y / cr; }
        else Fv = P / bondPrice(type, 1, cr, y, n, m);
        how = 'closed form';
      } else if (solve === 'n') {
        const ii = i(), c = cr * Fv / m;
        if (ii <= 0) return { error: 'Yield must be positive to solve for maturity.' };
        if (type === 'zero') { if (Fv <= P) return { error: 'For a zero-coupon bond the price must be below face value.' }; n = Math.log(Fv / P) / Math.log(1 + ii) / m; }
        else {
          const ratio = (Fv - c / ii) / (P - c / ii);
          if (Math.abs(c / ii - Fv) < 1e-9) return { error: 'Coupon rate equals yield: the bond is priced at par for every maturity, so maturity cannot be determined.' };
          if (!(ratio > 0) || Math.log(ratio) / Math.log(1 + ii) <= 0) return { error: 'No maturity is consistent with these inputs (a premium bond needs P > F, a discount bond needs P < F, and P must lie between F and C/y).' };
          n = Math.log(ratio) / Math.log(1 + ii) / m;
        }
        how = 'closed form (logarithms)';
      }
      const solved = {}; solved[solve] = solve === 'ytm' ? y * 100 : solve === 'cr' ? cr * 100 : solve === 'face' ? Fv : solve === 'n' ? n : P;
      if (type !== 'perpetual' && Math.abs(n * m - Math.round(n * m)) > 1e-6) warnings.push(`Years × frequency = ${num(n * m, 4)} is not a whole number of periods; the price uses the annuity formula with fractional N and the cash-flow table is rounded to ${Math.max(1, Math.round(n * m))} periods.`);
      const C = cr * Fv; // annual coupon
      const status = Math.abs(P - Fv) / Fv < 1e-6 ? 'At par' : P > Fv ? 'Premium bond' : 'Discount bond';
      // Cash-flow table
      const rows = [];
      if (type === 'perpetual') {
        const ii = y; let cum = 0;
        for (let t = 1; t <= 20; t++) { const df = Math.pow(1 + ii, -t), pv = C * df; cum += pv; rows.push([t, t, C, df, pv, cum]); }
      } else {
        const N = Math.max(1, Math.round(n * m)), ii = y / m, c = cr * Fv / m; let cum = 0;
        for (let t = 1; t <= Math.min(N, 1200); t++) { const cf = c + (t === N ? Fv : 0), df = Math.pow(1 + ii, -t), pv = cf * df; cum += pv; rows.push([t, t / m, cf, df, pv, cum]); }
      }
      // price-yield curve
      const yc = Math.max(y, 0.0001), ys = F.linspace(Math.max(0.0025, yc - 0.06), yc + 0.06, 97);
      const curve = ys.map(yy => bondPrice(type, Fv, cr, yy, n, m));
      const steps = [];
      if (type === 'coupon') steps.push({ h: 'Pricing formula (coupon bond)', f: ['P = C<sub>m</sub> · [1 − (1 + y/m)<sup>−N</sup>] / (y/m) + F / (1 + y/m)<sup>N</sup>', 'C<sub>m</sub> = (coupon rate × F) / m, &nbsp; N = m × years'], calc: `C_m = ${num(cr * 100, 4)}% × ${num(Fv, 2)} / ${m} = ${num(cr * Fv / m, 4)};  y/m = ${num(y * 100 / m, 6)}%;  N = ${num(n * m, 4)}\nP = ${num(cr * Fv / m, 4)} × [1 − (1 + ${num(y / m, 6)})^−${num(n * m, 2)}] / ${num(y / m, 6)} + ${num(Fv, 2)} / (1 + ${num(y / m, 6)})^${num(n * m, 2)} = ${num(P, 4)}` });
      if (type === 'zero') steps.push({ h: 'Pricing formula (zero-coupon bond)', f: ['P = F / (1 + y/m)<sup>N</sup>', 'y = m · [(F / P)<sup>1/N</sup> − 1]'], calc: `P = ${num(Fv, 2)} / (1 + ${num(y / m, 6)})^${num(n * m, 2)} = ${num(P, 4)}` });
      if (type === 'perpetual') steps.push({ h: 'Pricing formula (perpetual bond / consol)', f: ['P = C / y', 'C = coupon rate × F'], calc: `P = ${num(C, 4)} / ${num(y, 6)} = ${num(P, 4)}` });
      steps.push({ h: 'Unknown: ' + ({ price: 'price', ytm: 'yield to maturity', cr: 'coupon rate', face: 'face value', n: 'years to maturity' })[solve], f: [solve === 'n' && type === 'coupon' ? 'N = ln[(F − C<sub>m</sub>/i) / (P − C<sub>m</sub>/i)] / ln(1 + i), &nbsp; i = y/m' : solve === 'ytm' && type === 'coupon' ? 'Find y such that P(y) − P<sub>market</sub> = 0 (no closed form)' : solve === 'cr' && type === 'coupon' ? 'C<sub>m</sub> = [P − F(1+i)<sup>−N</sup>] / a<sub>N</sub>, &nbsp; a<sub>N</sub> = [1 − (1+i)<sup>−N</sup>] / i' : 'Rearrange the pricing formula'], calc: `Method: ${how}. Result = ${solve === 'ytm' || solve === 'cr' ? num(solved[solve], 6) + '%' : num(solved[solve], 6)}` });
      return {
        solved, warnings,
        kpis: [
          { k: 'Price', v: money(P, 2), raw: P, s: status, cls: solve === 'price' ? 'good' : '' },
          { k: 'Yield to maturity', v: pct(y, 4), raw: y, s: type === 'perpetual' ? 'Annual' : `Nominal, compounded ${m}×/yr`, cls: solve === 'ytm' ? 'good' : '' },
          { k: 'Coupon rate', v: type === 'zero' ? 'n/a' : pct(cr, 4), raw: cr, s: type === 'zero' ? 'Zero-coupon' : 'Annual coupon ' + money(C, 2), cls: solve === 'cr' ? 'good' : '' },
          { k: 'Current yield', v: type === 'zero' ? 'n/a' : pct(C / P, 4), raw: C / P, s: 'Annual coupon / price' },
          { k: type === 'perpetual' ? 'Face (notional)' : 'Face / maturity', v: type === 'perpetual' ? money(Fv, 2) : money(Fv, 2) + ' / ' + num(n, 2) + 'y', s: solve === 'face' ? 'Solved' : solve === 'n' ? 'Maturity solved' : '', cls: solve === 'face' || solve === 'n' ? 'good' : '' }
        ],
        charts: [{
          id: 'py', title: 'Price-yield relationship', note: 'The curve is convex: prices rise more when yields fall than they drop when yields rise. Hover to read prices.',
          build: T => ({
            type: 'line',
            data: { datasets: [ds('Price', pts(ys, curve), T.c[0]), ds('Face value', pts([ys[0], ys[ys.length - 1]], [Fv, Fv]), T.muted, { borderDash: [5, 5], borderWidth: 1.5 }), marker('This bond', y, P, T.c[1])] },
            options: lineOpts(T, { xTitle: 'Yield', yTitle: 'Price ($)', xFmt: x => pct(x, 2), yFmt: x => money(x, 2) })
          })
        }],
        tables: [{ id: 'cf', title: type === 'perpetual' ? 'Cash flows (first 20 years of an infinite stream)' : 'Cash-flow schedule', columns: [{ h: 'Period' , fmt: x => num(x, 0)}, { h: 'Time (yrs)', fmt: x => num(x, 2) }, { h: 'Cash flow', fmt: x => money(x, 2) }, { h: 'Discount factor', fmt: x => num(x, 6) }, { h: 'PV', fmt: x => money(x, 2) }, { h: 'Cumulative PV', fmt: x => money(x, 2) }], rows, note: type === 'perpetual' ? `The PV of all remaining payments (year 21 onward) is ${money(P - rows[rows.length - 1][5], 2)}.` : '' }],
        steps
      };
    }
  });

  /* =====================================================================
     4. DURATION & CONVEXITY
     ===================================================================== */
  TOOLS.push({
    id: 'duration', cat: 'fixed', icon: 'timer', title: 'Duration & Convexity', short: 'Duration & Convexity',
    desc: 'Macaulay and modified duration, convexity, DV01 and the price impact of a yield change.',
    long: 'Measures a bond\'s interest-rate sensitivity and compares the duration and duration-plus-convexity approximations with the exact repricing.',
    inputs: [
      { id: 'cr', label: 'Coupon rate (annual)', unit: '%', value: 5, step: 0.1 },
      { id: 'ytm', label: 'Yield to maturity (annual)', unit: '%', value: 6, step: 0.1 },
      { id: 'n', label: 'Years to maturity', unit: 'years', value: 5, step: 0.5 },
      { id: 'm', label: 'Frequency', type: 'select', value: '2', options: [['1', 'Annual'], ['2', 'Semi-annual'], ['4', 'Quarterly'], ['12', 'Monthly']] },
      { id: 'face', label: 'Face value', unit: '$', value: 1000 },
      { id: 'dy', label: 'Yield change to analyse', unit: 'bp', value: 100, step: 10, hint: '100 bp = 1 percentage point. Use negative values for a fall in yields.' }
    ],
    compute(v) {
      const m = parseInt(v.m), Fv = v.face, cr = v.cr / 100, y = v.ytm / 100, dy = v.dy / 10000;
      if (!(v.n > 0) || !(Fv > 0)) return { error: 'Maturity and face value must be positive.' };
      if (y / m <= -1) return { error: 'Yield is too negative.' };
      const N = Math.max(1, Math.round(v.n * m)), warnings = [];
      if (Math.abs(v.n * m - N) > 1e-9) warnings.push(`Years × frequency is not a whole number; using N = ${N} periods (${num(N / m, 3)} years).`);
      const i = y / m, c = cr * Fv / m;
      let P = 0, sT = 0, sC = 0; const rows = [];
      for (let t = 1; t <= N; t++) {
        const cf = c + (t === N ? Fv : 0), df = Math.pow(1 + i, -t), pv = cf * df;
        P += pv; sT += (t / m) * pv; sC += cf * t * (t + 1) * Math.pow(1 + i, -t - 2);
        rows.push([t, t / m, cf, df, pv, 0, 0, cf * t * (t + 1) * Math.pow(1 + i, -t - 2)]);
      }
      rows.forEach(r => { r[5] = r[4] / P; r[6] = r[1] * r[5]; r[7] = r[7] / (P * m * m); });
      const mac = sT / P, mod = mac / (1 + i), conv = sC / (P * m * m), dv01 = mod * P * 0.0001;
      const priceAt = yy => { let s = 0; for (let t = 1; t <= N; t++) s += (c + (t === N ? Fv : 0)) * Math.pow(1 + yy / m, -t); return s; };
      const Pnew = priceAt(y + dy), estD = -mod * dy, estDC = -mod * dy + 0.5 * conv * dy * dy, act = Pnew / P - 1;
      const ys = F.linspace(Math.max(-0.009, y - 0.05), y + 0.05, 101);
      rows.push(['', '', '', '', P, 1, mac, conv]);
      return {
        warnings,
        kpis: [
          { k: 'Bond price', v: money(P, 2), raw: P },
          { k: 'Macaulay duration', v: num(mac, 4) + ' yrs', raw: mac, s: 'PV-weighted average time' },
          { k: 'Modified duration', v: num(mod, 4), raw: mod, s: `≈ ${num(mod, 2)}% price change per 1% yield change`, cls: 'good' },
          { k: 'Convexity', v: num(conv, 4), raw: conv, s: 'In years²' },
          { k: 'DV01', v: money(dv01, 4), raw: dv01, s: 'Price change for 1 bp' },
          { k: `Price impact of ${v.dy > 0 ? '+' : ''}${num(v.dy, 0)} bp`, v: pct(act, 3), raw: act, s: `Duration: ${pct(estD, 3)} | +Convexity: ${pct(estDC, 3)}`, cls: act < 0 ? 'bad' : 'good' }
        ],
        charts: [
          {
            id: 'approx', title: 'Exact price vs duration approximations', tall: true,
            note: 'The straight line is the duration (first-order) estimate; adding convexity bends it toward the true price. The gap grows with the size of the yield change.',
            build: T => ({
              type: 'line',
              data: { datasets: [
                ds('Exact price', pts(ys, ys.map(priceAt)), T.c[0], { borderWidth: 4 }),
                ds('Duration estimate', pts(ys, ys.map(yy => P * (1 - mod * (yy - y)))), T.c[1], { borderDash: [6, 4] }),
                ds('Duration + convexity', pts(ys, ys.map(yy => P * (1 - mod * (yy - y) + 0.5 * conv * (yy - y) ** 2))), T.c[2], { borderDash: [3, 3], borderWidth: 2.5 }),
                marker('Current', y, P, T.text), marker('After shock', y + dy, Pnew, T.c[4])] },
              options: lineOpts(T, { xTitle: 'Yield', yTitle: 'Price ($)', xFmt: x => pct(x, 2), yFmt: x => money(x, 2) })
            })
          },
          {
            id: 'weights', title: 'PV of cash flows and the Macaulay duration "balance point"',
            note: 'Each bar is the present value of a cash flow. Macaulay duration is the point where the bars would balance.',
            build: T => ({
              type: 'bar',
              data: { datasets: [{ label: 'PV of cash flow', data: rows.slice(0, -1).map(r => ({ x: r[1], y: r[4] })), backgroundColor: T.alpha(T.c[0], .75), barPercentage: 1, categoryPercentage: 1, borderRadius: 3 }] },
              options: Object.assign(lineOpts(T, { xTitle: 'Time (years)', yTitle: 'PV ($)', xFmt: x => num(x, 2), yFmt: x => money(x, 2), legend: false, xMin: 0, xMax: (N + 0.6) / m, vlines: [{ x: mac, color: T.c[1], label: 'Macaulay D = ' + num(mac, 3) }] }), {})
            })
          }
        ],
        tables: [{ id: 'dur', title: 'Duration and convexity worksheet', columns: [{ h: 'Period', fmt: x => num(x, 0) }, { h: 'Time t (yrs)', fmt: x => num(x, 3) }, { h: 'Cash flow', fmt: x => money(x, 2) }, { h: 'Discount factor', fmt: x => num(x, 6) }, { h: 'PV', fmt: x => money(x, 2) }, { h: 'Weight w', fmt: x => num(x, 6) }, { h: 't × w', fmt: x => num(x, 6) }, { h: 'Convexity term', fmt: x => num(x, 6) }], rows, hl: [rows.length - 1], note: 'The last row shows the totals: price, sum of weights (1), Macaulay duration and convexity.' }],
        steps: [
          { h: '1. Price and weights', f: ['P = Σ CF<sub>t</sub> / (1 + y/m)<sup>t</sup>, &nbsp; w<sub>t</sub> = PV(CF<sub>t</sub>) / P'], calc: `y/m = ${num(i * 100, 6)}%, N = ${N}, P = ${num(P, 4)}` },
          { h: '2. Macaulay duration', f: ['D<sub>Mac</sub> = Σ (t/m) · w<sub>t</sub>'], calc: `D_Mac = ${num(sT, 4)} / ${num(P, 4)} = ${num(mac, 6)} years` },
          { h: '3. Modified duration', f: ['D<sub>Mod</sub> = D<sub>Mac</sub> / (1 + y/m)'], calc: `D_Mod = ${num(mac, 6)} / ${num(1 + i, 6)} = ${num(mod, 6)}` },
          { h: '4. Convexity', f: ['C = [1 / (P · m²)] · Σ CF<sub>t</sub> · t(t+1) / (1 + y/m)<sup>t+2</sup>'], calc: `C = ${num(conv, 6)}` },
          { h: '5. Price change for Δy = ' + num(v.dy, 0) + ' bp', f: ['ΔP / P ≈ −D<sub>Mod</sub>·Δy + ½·C·(Δy)²'], calc: `Duration only: −${num(mod, 4)} × ${num(dy, 4)} = ${pct(estD, 4)}\nWith convexity: ${pct(estD, 4)} + 0.5 × ${num(conv, 4)} × ${num(dy, 4)}² = ${pct(estDC, 4)}\nExact repricing: ${money(Pnew, 4)} / ${money(P, 4)} − 1 = ${pct(act, 4)}` },
          { h: '6. DV01 (price value of a basis point)', f: ['DV01 = D<sub>Mod</sub> × P × 0.0001'], calc: `DV01 = ${num(mod, 4)} × ${num(P, 2)} × 0.0001 = ${num(dv01, 4)}` }
        ]
      };
    }
  });

  /* =====================================================================
     5. FUTURES PRICING (cost of carry)
     ===================================================================== */
  TOOLS.push({
    id: 'futures', cat: 'deriv', icon: 'barrel', title: 'Futures Pricing (Cost of Carry)', short: 'Futures Pricing',
    desc: 'Theoretical forward/futures price with financing, storage and convenience yield; arbitrage check.',
    long: 'Cost-of-carry model with continuous compounding. Optionally enter a market futures price to see the mispricing and the arbitrage strategy that would exploit it.',
    inputs: [
      { id: 'S', label: 'Spot price S<sub>t</sub>', unit: '$', value: 100, step: 0.01 },
      { id: 'r', label: 'Risk-free rate r', unit: '% p.a.', value: 5, step: 0.1 },
      { id: 'c', label: 'Storage / insurance cost c', unit: '% p.a.', value: 2, step: 0.1 },
      { id: 'y', label: 'Convenience (or dividend) yield y', unit: '% p.a.', value: 1, step: 0.1, hint: 'For stock indices use the dividend yield; for currencies the foreign interest rate.' },
      { id: 'n', label: 'Time to delivery n', unit: 'years', value: 0.5, step: 0.05 },
      { id: 'mkt', label: 'Market futures price', unit: '$ (optional)', value: '', optional: true, hint: 'Leave empty to skip the arbitrage check.' }
    ],
    compute(v) {
      if (!(v.S > 0) || !(v.n >= 0)) return { error: 'Spot price must be positive and time non-negative.' };
      const r = v.r / 100, c = v.c / 100, y = v.y / 100, carry = r + c - y;
      const Fp = v.S * Math.exp(carry * v.n);
      const kpis = [
        { k: 'Theoretical futures price', v: money(Fp, 4), raw: Fp, cls: 'good', big: true },
        { k: 'Basis (S − F)', v: money(v.S - Fp, 4), raw: v.S - Fp, s: Fp > v.S ? 'Contango (F > S)' : Fp < v.S ? 'Backwardation (F < S)' : 'Flat' },
        { k: 'Net cost of carry', v: pct(carry, 2) + ' p.a.', raw: carry, s: 'r + c − y' }
      ];
      const steps = [
        { h: '1. Cost-of-carry model', f: ['F<sub>t,t+n</sub> = S<sub>t</sub> · e<sup>(r + c − y)·n</sup>'], calc: `F = ${num(v.S, 4)} × e^((${num(r, 4)} + ${num(c, 4)} − ${num(y, 4)}) × ${num(v.n, 4)}) = ${num(v.S, 4)} × e^${num(carry * v.n, 6)} = ${num(Fp, 6)}` },
        { h: '2. Interpretation', f: ['F &gt; S ⇒ contango, &nbsp; F &lt; S ⇒ backwardation'], note: 'Carrying the asset costs financing (r) plus storage (c), less the benefit of holding the physical asset (y). Normal backwardation occurs when the convenience yield exceeds r + c.' }
      ];
      const warnings = [];
      if (isFinite(v.mkt)) {
        const diff = v.mkt - Fp;
        kpis.push({ k: 'Mispricing (market − fair)', v: money(diff, 4), raw: diff, s: pct(diff / Fp, 3) + ' of fair value', cls: Math.abs(diff) < 1e-9 ? 'good' : 'warn' });
        steps.push({
          h: '3. Arbitrage check', f: [diff > 0 ? 'Market F &gt; fair F ⇒ cash-and-carry arbitrage' : diff < 0 ? 'Market F &lt; fair F ⇒ reverse cash-and-carry' : 'No arbitrage'],
          calc: diff > 0 ? `Today: borrow ${money(v.S)} at r, buy the asset spot, sell 1 futures at ${money(v.mkt)}.\nAt delivery: deliver the asset, receive ${money(v.mkt)}, repay the loan and carrying costs (${money(Fp)}).\nRiskless profit ≈ ${money(diff, 4)} per unit.` :
            diff < 0 ? `Today: short-sell the asset at ${money(v.S)}, invest the proceeds at r, buy 1 futures at ${money(v.mkt)}.\nAt delivery: pay ${money(v.mkt)}, take delivery, return the asset; the investment has grown to ${money(Fp)}.\nRiskless profit ≈ ${money(-diff, 4)} per unit.` : 'The market price equals the theoretical price.',
          note: diff < 0 ? 'For consumption commodities, short-selling the physical asset is often impossible, which is why convenience yields can keep futures below the cost-of-carry price.' : ''
        });
      }
      const nMax = Math.max(1, v.n * 2), ns = F.linspace(0, nMax, 81);
      const tblN = [0.083333, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5].filter(x => x <= Math.max(5, v.n));
      if (!tblN.some(x => Math.abs(x - v.n) < 1e-9)) tblN.push(v.n); tblN.sort((a, b) => a - b);
      return {
        kpis, warnings,
        charts: [{
          id: 'term', title: 'Futures term structure', note: 'Theoretical futures price for each delivery horizon, with the spot price for reference.',
          build: T => {
            const d = [ds('Theoretical F(n)', pts(ns, ns.map(x => v.S * Math.exp(carry * x))), T.c[0]), ds('Spot', pts([0, nMax], [v.S, v.S]), T.muted, { borderDash: [5, 5], borderWidth: 1.5 }), marker('Selected maturity', v.n, Fp, T.c[1])];
            if (isFinite(v.mkt)) d.push(marker('Market price', v.n, v.mkt, T.c[4], { pointStyle: 'rectRot' }));
            return { type: 'line', data: { datasets: d }, options: lineOpts(T, { xTitle: 'Time to delivery (years)', yTitle: 'Price ($)', xFmt: x => num(x, 2), yFmt: x => money(x, 3) }) };
          }
        }],
        tables: [{ id: 'mat', title: 'Futures prices by maturity', columns: [{ h: 'Maturity (yrs)', fmt: x => num(x, 3) }, { h: 'Futures price', fmt: x => money(x, 4) }, { h: 'Basis S − F', fmt: x => money(x, 4) }, { h: 'F / S − 1', fmt: x => pct(x, 3) }], rows: tblN.map(n => { const f = v.S * Math.exp(carry * n); return [n, f, v.S - f, f / v.S - 1]; }), hl: [tblN.indexOf(v.n)] }],
        steps
      };
    }
  });

  /* =====================================================================
     6. BLACK-SCHOLES-MERTON OPTIONS (new)
     ===================================================================== */
  function bsm(S, K, T, r, s, q) {
    const sq = s * Math.sqrt(T), d1 = (Math.log(S / K) + (r - q + s * s / 2) * T) / sq, d2 = d1 - sq;
    const N = F.normCdf, n = F.normPdf, eq = Math.exp(-q * T), er = Math.exp(-r * T);
    return {
      d1, d2,
      call: S * eq * N(d1) - K * er * N(d2), put: K * er * N(-d2) - S * eq * N(-d1),
      dC: eq * N(d1), dP: eq * (N(d1) - 1), gamma: eq * n(d1) / (S * sq), vega: S * eq * n(d1) * Math.sqrt(T) / 100,
      thC: (-S * eq * n(d1) * s / (2 * Math.sqrt(T)) - r * K * er * N(d2) + q * S * eq * N(d1)),
      thP: (-S * eq * n(d1) * s / (2 * Math.sqrt(T)) + r * K * er * N(-d2) - q * S * eq * N(-d1)),
      rhoC: K * T * er * N(d2) / 100, rhoP: -K * T * er * N(-d2) / 100
    };
  }
  TOOLS.push({
    id: 'options', cat: 'deriv', icon: 'option', title: 'Black-Scholes Option Pricing', short: 'Black-Scholes', isNew: true,
    desc: 'European call and put prices, the Greeks, put-call parity and implied volatility.',
    long: 'Black-Scholes-Merton model for European options on an asset paying a continuous dividend yield. Enter a market price to back out the implied volatility.',
    inputs: [
      { id: 'type', label: 'Option shown in charts', type: 'seg', value: 'call', options: [['call', 'Call'], ['put', 'Put']] },
      { id: 'S', label: 'Underlying price S', unit: '$', value: 100, step: 0.5 },
      { id: 'K', label: 'Strike price K', unit: '$', value: 100, step: 0.5 },
      { id: 'T', label: 'Time to expiry T', unit: 'years', value: 0.5, step: 0.05 },
      { id: 'r', label: 'Risk-free rate r', unit: '% p.a. (cont.)', value: 5, step: 0.1 },
      { id: 'sig', label: 'Volatility σ', unit: '% p.a.', value: 25, step: 0.5 },
      { id: 'q', label: 'Dividend yield q', unit: '% p.a.', value: 0, step: 0.1 },
      { id: 'mkt', label: 'Market option price', unit: '$ (optional)', value: '', optional: true, hint: 'For implied volatility of the option type selected above.' }
    ],
    compute(v) {
      if (!(v.S > 0 && v.K > 0 && v.T > 0 && v.sig > 0)) return { error: 'S, K, T and σ must be positive.' };
      const r = v.r / 100, s = v.sig / 100, q = v.q / 100, b = bsm(v.S, v.K, v.T, r, s, q), isC = v.type === 'call';
      const parityL = b.call - b.put, parityR = v.S * Math.exp(-q * v.T) - v.K * Math.exp(-r * v.T);
      const kpis = [
        { k: 'Call price', v: money(b.call, 4), raw: b.call, cls: isC ? 'good' : '', big: isC },
        { k: 'Put price', v: money(b.put, 4), raw: b.put, cls: !isC ? 'good' : '', big: !isC },
        { k: 'd<sub>1</sub> / d<sub>2</sub>', v: num(b.d1, 4) + ' / ' + num(b.d2, 4), s: `N(d1) = ${num(F.normCdf(b.d1), 4)}, N(d2) = ${num(F.normCdf(b.d2), 4)}` },
        { k: 'Moneyness (' + (isC ? 'call' : 'put') + ')', v: Math.abs(v.S - v.K) < 1e-9 ? 'ATM' : (isC ? v.S > v.K : v.S < v.K) ? 'In the money' : 'Out of the money', s: 'Intrinsic value ' + money(Math.max(0, isC ? v.S - v.K : v.K - v.S), 2) }
      ];
      const steps = [
        { h: '1. d<sub>1</sub> and d<sub>2</sub>', f: ['d<sub>1</sub> = [ln(S/K) + (r − q + σ²/2)T] / (σ√T), &nbsp; d<sub>2</sub> = d<sub>1</sub> − σ√T'], calc: `d1 = [ln(${v.S}/${v.K}) + (${num(r, 4)} − ${num(q, 4)} + ${num(s, 4)}²/2)×${v.T}] / (${num(s, 4)}×√${v.T}) = ${num(b.d1, 6)}\nd2 = ${num(b.d1, 6)} − ${num(s * Math.sqrt(v.T), 6)} = ${num(b.d2, 6)}` },
        { h: '2. Option prices', f: ['C = S e<sup>−qT</sup> N(d<sub>1</sub>) − K e<sup>−rT</sup> N(d<sub>2</sub>)', 'P = K e<sup>−rT</sup> N(−d<sub>2</sub>) − S e<sup>−qT</sup> N(−d<sub>1</sub>)'], calc: `C = ${num(v.S * Math.exp(-q * v.T), 4)}×${num(F.normCdf(b.d1), 6)} − ${num(v.K * Math.exp(-r * v.T), 4)}×${num(F.normCdf(b.d2), 6)} = ${num(b.call, 6)}\nP = ${num(v.K * Math.exp(-r * v.T), 4)}×${num(F.normCdf(-b.d2), 6)} − ${num(v.S * Math.exp(-q * v.T), 4)}×${num(F.normCdf(-b.d1), 6)} = ${num(b.put, 6)}` },
        { h: '3. Put-call parity check', f: ['C − P = S e<sup>−qT</sup> − K e<sup>−rT</sup>'], calc: `${num(parityL, 6)} = ${num(parityR, 6)}  ✔` }
      ];
      if (isFinite(v.mkt)) {
        const f = ss => { const x = bsm(v.S, v.K, v.T, r, ss, q); return (isC ? x.call : x.put) - v.mkt; };
        const iv = F.brent(f, 1e-4, 5);
        kpis.push({ k: 'Implied volatility', v: isFinite(iv) ? pct(iv, 3) : 'none', raw: iv, s: isFinite(iv) ? 'From market ' + (isC ? 'call' : 'put') + ' price ' + money(v.mkt) : 'Price outside no-arbitrage bounds', cls: isFinite(iv) ? 'good' : 'bad' });
        steps.push({ h: '4. Implied volatility', f: ['Find σ such that BSM(σ) = market price'], calc: isFinite(iv) ? `σ_implied = ${pct(iv, 4)} (Brent root-finding)` : 'No volatility between 0.01% and 500% matches this price.' });
      }
      const g = [
        ['Delta', b.dC, b.dP, '∂V/∂S'], ['Gamma', b.gamma, b.gamma, '∂²V/∂S²'], ['Vega (per 1% σ)', b.vega, b.vega, '∂V/∂σ ÷ 100'],
        ['Theta (per year)', b.thC, b.thP, '∂V/∂t'], ['Theta (per day, /365)', b.thC / 365, b.thP / 365, ''], ['Rho (per 1% r)', b.rhoC, b.rhoP, '∂V/∂r ÷ 100']
      ];
      const Ss = F.linspace(Math.max(0.01, v.S * 0.4), v.S * 1.6, 121);
      const val = Ss.map(x => { const z = bsm(x, v.K, v.T, r, s, q); return isC ? z.call : z.put; });
      const pay = Ss.map(x => Math.max(0, isC ? x - v.K : v.K - x));
      const del = Ss.map(x => { const z = bsm(x, v.K, v.T, r, s, q); return isC ? z.dC : z.dP; });
      const gam = Ss.map(x => bsm(x, v.K, v.T, r, s, q).gamma);
      const label = isC ? 'Call' : 'Put';
      const sens = [-0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2].map(k => { const x = v.S * (1 + k), z = bsm(x, v.K, v.T, r, s, q); return [x, z.call, z.put, z.dC, z.dP]; });
      return {
        kpis,
        charts: [
          { id: 'value', title: label + ' value vs underlying price', note: 'Today\'s value lies above the payoff at expiry by the time value. Hover to read values.',
            build: T => ({ type: 'line', data: { datasets: [ds(label + ' value today', pts(Ss, val), T.c[0], { borderWidth: 3 }), ds('Payoff at expiry', pts(Ss, pay), T.c[1], { borderDash: [6, 4] }), marker('Current', v.S, isC ? b.call : b.put, T.c[4])] }, options: lineOpts(T, { xTitle: 'Underlying price S', yTitle: 'Option value ($)', xFmt: x => money(x, 2), yFmt: x => money(x, 3), vlines: [{ x: v.K, color: T.muted, label: 'K = ' + v.K }] }) }) },
          { id: 'greeks', title: 'Delta and gamma vs underlying price',
            build: T => {
              const o = lineOpts(T, { xTitle: 'Underlying price S', yTitle: 'Delta', xFmt: x => money(x, 2), yFmt: x => num(x, 4) });
              o.scales.y2 = { position: 'right', title: { display: true, text: 'Gamma' }, grid: { display: false }, ticks: { callback: x => num(x, 3) } };
              return { type: 'line', data: { datasets: [ds('Delta', pts(Ss, del), T.c[2]), ds('Gamma', pts(Ss, gam), T.c[3], { yAxisID: 'y2' })] }, options: o };
            } }
        ],
        tables: [
          { id: 'greeks', title: 'The Greeks', columns: [{ h: 'Greek', num: false }, { h: 'Call', fmt: x => num(x, 6) }, { h: 'Put', fmt: x => num(x, 6) }, { h: 'Definition', num: false }], rows: g },
          { id: 'sens', title: 'Sensitivity to the underlying price', columns: [{ h: 'S', fmt: x => money(x, 2) }, { h: 'Call', fmt: x => money(x, 4) }, { h: 'Put', fmt: x => money(x, 4) }, { h: 'Call delta', fmt: x => num(x, 4) }, { h: 'Put delta', fmt: x => num(x, 4) }], rows: sens, hl: [3] }
        ],
        steps,
        refs: 'Black, F. &amp; Scholes, M. (1973), <i>Journal of Political Economy</i>, 81(3); Merton, R. C. (1973), <i>Bell Journal of Economics</i>, 4(1). Theta is quoted per year and per calendar day.'
      };
    }
  });

  /* =====================================================================
     7. PARAMETRIC VaR VISUALIZER
     ===================================================================== */
  TOOLS.push({
    id: 'var', cat: 'risk', icon: 'bell', title: 'Value at Risk Visualizer (Parametric)', short: 'Parametric VaR',
    desc: 'Variance-covariance (normal) VaR and Expected Shortfall at any confidence level, with the loss tail drawn.',
    long: 'Delta-normal Value at Risk and Expected Shortfall with square-root-of-time scaling. VaR and ES are reported as positive losses.',
    inputs: [
      { id: 'amt', label: 'Portfolio value', unit: '$', value: 1000000 },
      { id: 'mu', label: 'Expected return per period μ', unit: '%', value: 0, step: 0.01, hint: 'Usually set to 0 for short horizons.' },
      { id: 'vol', label: 'Volatility per period σ', unit: '%', value: 2, step: 0.1 },
      { id: 'h', label: 'Horizon', unit: 'periods', value: 1, step: 1 },
      { id: 'cc', label: 'Custom confidence level', unit: '%', value: 97.5, step: 0.1 }
    ],
    compute(v) {
      if (!(v.vol > 0) || !(v.h > 0)) return { error: 'Volatility and horizon must be positive.' };
      if (!(v.cc > 0 && v.cc < 100)) return { error: 'Confidence level must be between 0 and 100.' };
      const mu = v.mu / 100 * v.h, sd = v.vol / 100 * Math.sqrt(v.h), A = v.amt;
      const calc = c => { const z = F.invNorm(c); const varR = z * sd - mu, esR = sd * F.normPdf(z) / (1 - c) - mu; return { c, z, varR, esR, var$: A * varR, es$: A * esR }; };
      const r95 = calc(0.95), r99 = calc(0.99), rc = calc(v.cc / 100);
      const levels = [0.90, 0.95, 0.975, 0.99, 0.995, 0.999]; if (!levels.some(x => Math.abs(x - v.cc / 100) < 1e-9)) levels.push(v.cc / 100); levels.sort((a, b) => a - b);
      const tbl = levels.map(c => { const x = calc(c); return [pct(c, 1), x.z, x.varR, x.var$, x.esR, x.es$]; });
      const lo = mu - Math.max(4.5 * sd, rc.varR + mu + sd), hi = mu + 4.5 * sd, xs = F.linspace(lo, hi, 241);
      const pdf = x => F.normPdf((x - mu) / sd) / sd;
      return {
        kpis: [
          { k: '95% VaR', v: money(r95.var$, 0), raw: r95.var$, s: pct(r95.varR, 3) + ' of value | ES ' + money(r95.es$, 0), cls: 'warn' },
          { k: '99% VaR', v: money(r99.var$, 0), raw: r99.var$, s: pct(r99.varR, 3) + ' of value | ES ' + money(r99.es$, 0), cls: 'bad' },
          { k: num(v.cc, 1) + '% VaR (custom)', v: money(rc.var$, 0), raw: rc.var$, s: pct(rc.varR, 3) + ' | z = ' + num(rc.z, 4), cls: 'good' },
          { k: num(v.cc, 1) + '% Expected Shortfall', v: money(rc.es$, 0), raw: rc.es$, s: 'Average loss beyond VaR' }
        ],
        charts: [{
          id: 'dist', title: 'Return distribution over the horizon and VaR cut-offs', tall: true,
          note: 'The shaded area is the ' + num(100 - v.cc, 1) + '% left tail beyond the custom VaR. Lines mark the return at each VaR level.',
          exportData: () => ({ columns: ['Return', 'Density'], rows: xs.map(x => [x, pdf(x)]) }),
          build: T => ({
            type: 'line',
            data: { datasets: [
              ds('Tail beyond ' + num(v.cc, 1) + '% VaR', pts(xs, xs.map(x => x <= -rc.varR ? pdf(x) : null)), T.c[4], { fill: 'origin', backgroundColor: T.alpha(T.c[4], .25), borderWidth: 0, spanGaps: false }),
              ds('Density', pts(xs, xs.map(pdf)), T.c[0], { fill: 'origin', backgroundColor: T.alpha(T.c[0], .07) })] },
            options: lineOpts(T, { xTitle: 'Return over horizon', xFmt: x => pct(x, 2), yFmt: x => num(x, 3), yDisplay: false, legend: false, beginAtZero: true,
              vlines: [{ x: -r95.varR, color: T.c[2], label: '95%: ' + money(r95.var$, 0) }, { x: -r99.varR, color: T.c[4], label: '99%: ' + money(r99.var$, 0) }, { x: -rc.varR, color: T.c[5], label: num(v.cc, 1) + '%: ' + money(rc.var$, 0) }] })
          })
        }],
        tables: [{ id: 'levels', title: 'VaR and Expected Shortfall by confidence level', columns: [{ h: 'Confidence', num: false }, { h: 'z', fmt: x => num(x, 4) }, { h: 'VaR (%)', fmt: x => pct(x, 3) }, { h: 'VaR ($)', fmt: x => money(x, 0) }, { h: 'ES (%)', fmt: x => pct(x, 3) }, { h: 'ES ($)', fmt: x => money(x, 0) }], rows: tbl, hl: [levels.indexOf(v.cc / 100)] }],
        steps: [
          { h: '1. Scale to the horizon', f: ['μ<sub>h</sub> = μ · h, &nbsp; σ<sub>h</sub> = σ · √h'], calc: `μ_h = ${pct(mu, 4)},  σ_h = ${num(v.vol, 4)}% × √${v.h} = ${pct(sd, 4)}` },
          { h: '2. Critical value', f: ['z<sub>c</sub> = Φ<sup>−1</sup>(c)'], calc: `z_0.95 = ${num(r95.z, 6)},  z_0.99 = ${num(r99.z, 6)},  z_${num(v.cc / 100, 4)} = ${num(rc.z, 6)}` },
          { h: '3. Value at Risk', f: ['VaR<sub>c</sub> = V · (z<sub>c</sub> σ<sub>h</sub> − μ<sub>h</sub>)'], calc: `VaR_95 = ${num(A, 0)} × (${num(r95.z, 4)} × ${num(sd, 6)} − ${num(mu, 6)}) = ${money(r95.var$, 2)}\nVaR_99 = ${num(A, 0)} × (${num(r99.z, 4)} × ${num(sd, 6)} − ${num(mu, 6)}) = ${money(r99.var$, 2)}` },
          { h: '4. Expected Shortfall (CVaR)', f: ['ES<sub>c</sub> = V · [σ<sub>h</sub> · φ(z<sub>c</sub>) / (1 − c) − μ<sub>h</sub>]'], calc: `ES_${num(v.cc, 1)} = ${num(A, 0)} × (${num(sd, 6)} × ${num(F.normPdf(rc.z), 6)} / ${num(1 - v.cc / 100, 4)} − ${num(mu, 6)}) = ${money(rc.es$, 2)}`, note: 'ES is the average loss given that the loss exceeds VaR; it is the coherent risk measure used under Basel FRTB (97.5%).' }
        ]
      };
    }
  });

  /* =====================================================================
     8. MONTE CARLO VaR
     ===================================================================== */
  TOOLS.push({
    id: 'montecarlo', cat: 'risk', icon: 'dice', title: 'Monte Carlo VaR Simulator', short: 'Monte Carlo VaR', runButton: 'Run simulation',
    desc: 'Simulate portfolio returns (normal or fat-tailed Student-t) and read VaR and ES off the histogram.',
    long: 'Generates random returns, sorts them and reads the 5% and 1% quantiles as VaR. Compare the simulated result with the analytical normal VaR. Use a seed for reproducible classroom results.',
    inputs: [
      { id: 'amt', label: 'Portfolio value', unit: '$', value: 1000000 },
      { id: 'mu', label: 'Expected return per period', unit: '%', value: 0, step: 0.01 },
      { id: 'sd', label: 'Standard deviation per period', unit: '%', value: 1, step: 0.01 },
      { id: 'h', label: 'Horizon', unit: 'periods', value: 1, step: 1, min: 1 },
      { id: 'dist', label: 'Return distribution', type: 'seg', value: 'normal', options: [['normal', 'Normal'], ['t', 'Student-t']] },
      { id: 'df', label: 'Degrees of freedom', value: 5, step: 1, min: 3, showIf: v => v.dist === 't', hint: 'Lower = fatter tails. Scaled to the same standard deviation.' },
      { id: 'reps', label: 'Number of replications', value: 50000, step: 1000, min: 100 },
      { id: 'seed', label: 'Random seed', unit: 'optional', value: 12345, optional: true, hint: 'Same seed = same results. Leave empty for a new random draw each run.' }
    ],
    compute(v) {
      const n = Math.round(v.reps), h = Math.round(v.h), df = Math.round(v.df);
      if (!(n >= 100)) return { error: 'Use at least 100 replications.' };
      if (n * h > 6e6) return { error: 'Replications × horizon is too large (max 6 million draws).' };
      if (!(v.sd > 0)) return { error: 'Standard deviation must be positive.' };
      if (v.dist === 't' && !(df >= 3)) return { error: 'Degrees of freedom must be at least 3.' };
      const seed = isFinite(v.seed) ? Math.round(v.seed) : Math.floor(Math.random() * 1e9);
      const rand = F.rng(seed), z = F.normalGen(rand), mu = v.mu / 100, sd = v.sd / 100;
      const draw = v.dist === 't' ? () => { let c = 0; for (let k = 0; k < df; k++) { const g = z(); c += g * g; } return z() / Math.sqrt(c / df) * Math.sqrt((df - 2) / df); } : z;
      const sims = new Float64Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < h; k++) s += mu + sd * draw(); sims[i] = s; }
      sims.sort();
      const q05 = F.quantileSorted(sims, 0.05), q01 = F.quantileSorted(sims, 0.01);
      const es = q => { let s = 0, c = 0; for (let i = 0; i < n && sims[i] <= q; i++) { s += sims[i]; c++; } return -s / c; };
      const es05 = es(q05), es01 = es(q01);
      let mean = 0; for (const x of sims) mean += x; mean /= n;
      let m2 = 0, m3 = 0, m4 = 0; for (const x of sims) { const d = x - mean; m2 += d * d; m3 += d ** 3; m4 += d ** 4; }
      const sdS = Math.sqrt(m2 / (n - 1)), skew = (m3 / n) / Math.pow(m2 / n, 1.5), kurt = (m4 / n) / Math.pow(m2 / n, 2) - 3;
      const muH = mu * h, sdH = sd * Math.sqrt(h);
      const a95 = F.invNorm(0.95) * sdH - muH, a99 = F.invNorm(0.99) * sdH - muH;
      const A = v.amt;
      // histogram
      const lo = sims[Math.floor(n * 0.0005)], hi = sims[Math.ceil(n * 0.9995) - 1], bins = 60, w = (hi - lo) / bins;
      const counts = new Array(bins).fill(0);
      for (const x of sims) { if (x < lo || x > hi) continue; counts[Math.min(bins - 1, Math.floor((x - lo) / w))]++; }
      const centers = counts.map((_, i) => lo + (i + 0.5) * w);
      const normCurve = centers.map(x => n * w * F.normPdf((x - muH) / sdH) / sdH);
      const qs = [0.001, 0.01, 0.025, 0.05, 0.10, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];
      return {
        kpis: [
          { k: '95% VaR (simulated)', v: money(-q05 * A, 0), raw: -q05 * A, s: `${pct(-q05, 3)} | analytical ${pct(a95, 3)}`, cls: 'warn' },
          { k: '99% VaR (simulated)', v: money(-q01 * A, 0), raw: -q01 * A, s: `${pct(-q01, 3)} | analytical ${pct(a99, 3)}`, cls: 'bad' },
          { k: '95% Expected Shortfall', v: money(es05 * A, 0), raw: es05 * A, s: pct(es05, 3) + ' average tail loss' },
          { k: '99% Expected Shortfall', v: money(es01 * A, 0), raw: es01 * A, s: pct(es01, 3) + ' average tail loss' },
          { k: 'Seed used', v: String(seed), s: num(n, 0) + ' replications' + (h > 1 ? ` × ${h} periods` : '') }
        ],
        charts: [{
          id: 'hist', title: 'Histogram of simulated returns', tall: true,
          note: 'Bars: simulated frequencies. Line: normal distribution with the same mean and standard deviation. ' + (v.dist === 't' ? 'Notice the fatter tails of the Student-t draws.' : ''),
          exportData: () => ({ columns: ['Bin centre (return)', 'Bin from', 'Bin to', 'Frequency', 'Normal expected frequency'], rows: centers.map((c, i) => [c, c - w / 2, c + w / 2, counts[i], normCurve[i]]) }),
          build: T => ({
            type: 'bar',
            data: { datasets: [
              { type: 'line', label: 'Normal reference', data: pts(centers, normCurve), borderColor: T.c[1], backgroundColor: T.c[1], pointRadius: 0, tension: 0.3, order: 0 },
              { label: 'Simulated frequency', data: pts(centers, counts), backgroundColor: centers.map(c => c <= q01 ? T.alpha(T.c[4], .85) : c <= q05 ? T.alpha(T.c[1], .75) : T.alpha(T.c[0], .6)), barPercentage: 1, categoryPercentage: 1, order: 1 }] },
            options: lineOpts(T, { xTitle: 'Return over horizon', yTitle: 'Frequency', xFmt: x => pct(x, 2), yFmt: x => num(x, 0), xMin: lo, xMax: hi,
              vlines: [{ x: q05, color: T.c[2], label: '5%: ' + pct(q05, 2) }, { x: q01, color: T.c[4], label: '1%: ' + pct(q01, 2) }] })
          })
        }],
        tables: [
          { id: 'stats', title: 'Simulation statistics', columns: [{ h: 'Statistic', num: false }, { h: 'Simulated' }, { h: 'Theoretical' }], rows: [
            ['Mean', pct(mean, 4), pct(muH, 4)], ['Standard deviation', pct(sdS, 4), pct(sdH, 4)], ['Skewness', num(skew, 4), num(0, 4)],
            ['Excess kurtosis', num(kurt, 4), v.dist === 't' && h === 1 ? (df > 4 ? num(6 / (df - 4), 4) : '∞') : (v.dist === 't' ? 'n/a' : num(0, 4))],
            ['95% VaR (%)', pct(-q05, 4), pct(a95, 4) + ' (normal)'], ['99% VaR (%)', pct(-q01, 4), pct(a99, 4) + ' (normal)'],
            ['Minimum', pct(sims[0], 4), ''], ['Maximum', pct(sims[n - 1], 4), '']] },
          { id: 'quant', title: 'Quantiles of simulated returns', columns: [{ h: 'Percentile', num: false }, { h: 'Return', fmt: x => pct(x, 4) }, { h: 'P&L ($)', fmt: x => money(x, 0) }], rows: qs.map(p => { const x = F.quantileSorted(sims, p); return [pct(p, 1), x, x * A]; }), hl: [qs.indexOf(0.01), qs.indexOf(0.05)] }
        ],
        steps: [
          { h: '1. Generate random returns', f: [v.dist === 't' ? 'R<sub>i</sub> = μ + σ · t<sub>ν</sub> · √((ν − 2)/ν), &nbsp; t<sub>ν</sub> = Z / √(χ²<sub>ν</sub>/ν)' : 'R<sub>i</sub> = μ + σ · Z<sub>i</sub>, &nbsp; Z<sub>i</sub> ~ N(0,1) via Box-Muller'], calc: `${num(n, 0)} replications${h > 1 ? `, each the sum of ${h} period returns` : ''}; seed ${seed}.` },
          { h: '2. Sort and read the quantiles', f: ['VaR<sub>c</sub> = − Q<sub>1−c</sub>(R) × V'], calc: `5% quantile = ${pct(q05, 4)} ⇒ VaR_95 = ${money(-q05 * A, 2)}\n1% quantile = ${pct(q01, 4)} ⇒ VaR_99 = ${money(-q01 * A, 2)}`, note: 'Quantiles are interpolated between order statistics (Excel PERCENTILE.INC convention).' },
          { h: '3. Expected Shortfall', f: ['ES<sub>c</sub> = − average of returns ≤ Q<sub>1−c</sub>'], calc: `ES_95 = ${pct(es05, 4)},  ES_99 = ${pct(es01, 4)}` },
          { h: '4. Compare with the analytical (normal) VaR', f: ['VaR<sub>c</sub> = z<sub>c</sub>σ√h − μh'], calc: `Analytical 95% = ${pct(a95, 4)},  99% = ${pct(a99, 4)}`, note: 'With normal draws the simulated VaR converges to the analytical value as replications grow; with Student-t draws the 99% VaR is usually larger.' }
        ]
      };
    }
  });

  /* =====================================================================
     9. NPV / IRR CAPITAL BUDGETING (new)
     ===================================================================== */
  TOOLS.push({
    id: 'npv', cat: 'corp', icon: 'cash', title: 'NPV & IRR Capital Budgeting', short: 'NPV & IRR', isNew: true,
    desc: 'NPV, IRR (with multiple-IRR detection), MIRR, profitability index and (discounted) payback.',
    long: 'Enter the project cash flows starting with the initial investment at t = 0. The NPV profile shows how value changes with the discount rate.',
    inputs: [
      { id: 'cfs', label: 'Cash flows (CF<sub>0</sub>, CF<sub>1</sub>, ...)', type: 'textarea', value: '-1000\n300\n400\n400\n300\n200', hint: 'One per line or separated by commas/semicolons. Use a minus sign for outflows.' },
      { id: 'k', label: 'Discount rate (cost of capital)', unit: '%', value: 10, step: 0.25 },
      { id: 'fr', label: 'MIRR finance rate', unit: '%', value: 10, step: 0.25, hint: 'Rate applied to negative cash flows.' },
      { id: 'rr', label: 'MIRR reinvestment rate', unit: '%', value: 10, step: 0.25, hint: 'Rate applied to positive cash flows.' }
    ],
    compute(v) {
      const cfs = String(v.cfs).split(/[\n,;]+/).map(s => s.trim()).filter(s => s !== '').map(s => parseFloat(s.replace(/[$\s]/g, '')));
      if (cfs.length < 2 || cfs.some(x => !isFinite(x))) return { error: 'Enter at least two numeric cash flows.' };
      const k = v.k / 100, n = cfs.length - 1;
      const npvAt = r => cfs.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
      const NPV = npvAt(k);
      const irrs = F.allRoots(npvAt, -0.99, 10, 4000);
      const signChanges = cfs.slice(1).reduce((s, c, i) => { const p = cfs.slice(0, i + 1).filter(x => x !== 0).pop(); return s + (p !== undefined && c !== 0 && Math.sign(c) !== Math.sign(p) ? 1 : 0); }, 0);
      const fr = v.fr / 100, rr = v.rr / 100;
      const pvNeg = cfs.reduce((s, c, t) => s + (c < 0 ? c / Math.pow(1 + fr, t) : 0), 0);
      const fvPos = cfs.reduce((s, c, t) => s + (c > 0 ? c * Math.pow(1 + rr, n - t) : 0), 0);
      const mirr = pvNeg < 0 && fvPos > 0 ? Math.pow(fvPos / -pvNeg, 1 / n) - 1 : NaN;
      const pvIn = cfs.reduce((s, c, t) => s + (t > 0 ? c / Math.pow(1 + k, t) : 0), 0);
      const PI = cfs[0] < 0 ? pvIn / -cfs[0] : NaN;
      const payback = (arr) => { let cum = 0; for (let t = 0; t < arr.length; t++) { const prev = cum; cum += arr[t]; if (t > 0 && prev < 0 && cum >= 0) return t - 1 + (-prev / arr[t]); } return cum >= 0 && arr[0] >= 0 ? 0 : NaN; };
      const disc = cfs.map((c, t) => c / Math.pow(1 + k, t));
      const pb = payback(cfs), dpb = payback(disc);
      const warnings = [];
      if (irrs.length > 1) warnings.push(`This project has ${irrs.length} IRRs (${irrs.map(r => pct(r, 2)).join(', ')}) because its cash flows change sign ${signChanges} times. IRR is unreliable here: use NPV or MIRR.`);
      if (!irrs.length) warnings.push('No IRR exists between −99% and 1000% (the NPV never crosses zero).');
      let cum = 0, cumd = 0;
      const rows = cfs.map((c, t) => { cum += c; cumd += disc[t]; return [t, c, 1 / Math.pow(1 + k, t), disc[t], cum, cumd]; });
      rows.push(['Total', cfs.reduce((a, b) => a + b, 0), '', NPV, '', '']);
      const irr = irrs.length === 1 ? irrs[0] : NaN;
      const rMax = Math.max(0.3, (isFinite(irr) ? irr : 0) * 1.6, k * 2), rates = F.linspace(Math.max(-0.5, -0.05), rMax, 121);
      return {
        warnings,
        kpis: [
          { k: 'Net present value', v: money(NPV, 2), raw: NPV, s: NPV > 0 ? 'Accept: creates value' : NPV < 0 ? 'Reject: destroys value' : 'Indifferent', cls: NPV >= 0 ? 'good' : 'bad', big: true },
          { k: 'IRR', v: irrs.length === 1 ? pct(irr, 3) : irrs.length ? 'multiple' : 'none', raw: irr, s: irrs.length === 1 ? (irr > k ? 'IRR > cost of capital' : 'IRR < cost of capital') : '', cls: irrs.length === 1 ? (irr >= k ? 'good' : 'bad') : 'warn' },
          { k: 'MIRR', v: pct(mirr, 3), raw: mirr, s: `Finance ${num(v.fr, 2)}%, reinvest ${num(v.rr, 2)}%` },
          { k: 'Profitability index', v: num(PI, 4), raw: PI, s: 'PV of inflows / initial outlay' },
          { k: 'Payback period', v: isFinite(pb) ? num(pb, 2) + ' yrs' : 'never', raw: pb, s: 'Discounted: ' + (isFinite(dpb) ? num(dpb, 2) + ' yrs' : 'never') }
        ],
        charts: [
          { id: 'profile', title: 'NPV profile', note: 'NPV as a function of the discount rate. The IRR is where the curve crosses zero.',
            build: T => ({ type: 'line', data: { datasets: [ds('NPV', pts(rates, rates.map(npvAt)), T.c[0], { borderWidth: 3 }), ds('Zero', pts([rates[0], rates[rates.length - 1]], [0, 0]), T.muted, { borderWidth: 1, borderDash: [4, 4] }), marker('NPV at ' + num(v.k, 2) + '%', k, NPV, T.c[1])].concat(irrs.filter(r => r >= rates[0] && r <= rMax).map((r, i) => marker('IRR' + (irrs.length > 1 ? ' ' + (i + 1) : ''), r, 0, T.c[4], { pointStyle: 'rectRot' }))) }, options: lineOpts(T, { xTitle: 'Discount rate', yTitle: 'NPV ($)', xFmt: x => pct(x, 2), yFmt: x => money(x, 2) }) }) },
          { id: 'flows', title: 'Cash flows, present values and cumulative discounted cash flow',
            build: T => ({ type: 'bar', data: { labels: cfs.map((_, t) => 't=' + t), datasets: [
              { label: 'Cash flow', data: cfs, backgroundColor: T.alpha(T.c[2], .55), borderRadius: 4, order: 2 },
              { label: 'Present value', data: disc, backgroundColor: T.alpha(T.c[0], .85), borderRadius: 4, order: 1 },
              { type: 'line', label: 'Cumulative PV', data: rows.slice(0, -1).map(r => r[5]), borderColor: T.c[1], backgroundColor: T.c[1], pointRadius: 3, order: 0 }] },
              options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + money(c.parsed.y, 2) } } }, scales: { y: { ticks: { callback: x => money(x, 0) }, grid: { color: T.grid } }, x: { grid: { display: false } } } } }) }
        ],
        tables: [{ id: 'cf', title: 'Discounted cash-flow table', columns: [{ h: 't', fmt: x => num(x, 0) }, { h: 'Cash flow', fmt: x => money(x, 2) }, { h: 'Discount factor', fmt: x => num(x, 6) }, { h: 'PV', fmt: x => money(x, 2) }, { h: 'Cumulative CF', fmt: x => money(x, 2) }, { h: 'Cumulative PV', fmt: x => money(x, 2) }], rows, hl: [rows.length - 1] }],
        steps: [
          { h: '1. Net present value', f: ['NPV = Σ<sub>t=0..n</sub> CF<sub>t</sub> / (1 + k)<sup>t</sup>'], calc: 'NPV = ' + cfs.map((c, t) => `${num(c, 2)}/${num(1 + k, 4)}^${t}`).join(' + ') + ` = ${num(NPV, 4)}` },
          { h: '2. Internal rate of return', f: ['Find IRR such that Σ CF<sub>t</sub> / (1 + IRR)<sup>t</sup> = 0'], calc: irrs.length ? 'IRR = ' + irrs.map(r => pct(r, 4)).join(', ') + ' (scan + Brent root-finding)' : 'No root found.', note: `Cash-flow sign changes: ${signChanges}. By Descartes\' rule there can be at most that many IRRs.` },
          { h: '3. Modified IRR', f: ['MIRR = [FV(positive CFs at reinvestment rate) / |PV(negative CFs at finance rate)|]<sup>1/n</sup> − 1'], calc: `MIRR = (${num(fvPos, 2)} / ${num(-pvNeg, 2)})^(1/${n}) − 1 = ${pct(mirr, 4)}` },
          { h: '4. Profitability index and payback', f: ['PI = PV(CF<sub>1..n</sub>) / |CF<sub>0</sub>|', 'Payback = year before recovery + unrecovered amount / CF of recovery year'], calc: `PI = ${num(pvIn, 2)} / ${num(-cfs[0], 2)} = ${num(PI, 4)}\nPayback = ${isFinite(pb) ? num(pb, 4) : 'never'};  discounted payback = ${isFinite(dpb) ? num(dpb, 4) : 'never'}` }
        ]
      };
    }
  });

  /* =====================================================================
     10. LOAN AMORTIZATION (new)
     ===================================================================== */
  TOOLS.push({
    id: 'loan', cat: 'corp', icon: 'loan', title: 'Loan & Mortgage Amortization', short: 'Loan Amortization', isNew: true,
    desc: 'Level payment, full amortization schedule, interest vs principal split and the effect of extra payments.',
    long: 'Annuity (level-payment) loan with any payment frequency. Add an extra payment per period to see how much interest and time it saves.',
    inputs: [
      { id: 'P', label: 'Loan amount', unit: '$', value: 200000 },
      { id: 'r', label: 'Annual interest rate (nominal)', unit: '%', value: 4.5, step: 0.05 },
      { id: 'n', label: 'Term', unit: 'years', value: 25, step: 1 },
      { id: 'm', label: 'Payments per year', type: 'select', value: '12', options: [['12', 'Monthly'], ['4', 'Quarterly'], ['2', 'Semi-annual'], ['1', 'Annual']] },
      { id: 'extra', label: 'Extra payment per period', unit: '$', value: 0, step: 50 }
    ],
    compute(v) {
      const m = parseInt(v.m), N = Math.round(v.n * m), i = v.r / 100 / m, P0 = v.P;
      if (!(P0 > 0) || !(N >= 1)) return { error: 'Loan amount and term must be positive.' };
      if (N > 1200) return { error: 'Too many payments (max 1,200).' };
      const pmt = Math.abs(i) < 1e-12 ? P0 / N : P0 * i / (1 - Math.pow(1 + i, -N));
      const extra = Math.max(0, v.extra || 0);
      const sched = []; let bal = P0, totI = 0, t = 0;
      while (bal > 1e-8 && t < N) {
        t++; const int = bal * i; let prin = pmt - int, ex = extra;
        if (prin + ex > bal) { if (prin > bal) { prin = bal; ex = 0; } else ex = bal - prin; }
        bal -= prin + ex; totI += int;
        sched.push([t, t / m, int + prin + ex, int, prin, ex, Math.max(0, bal)]);
      }
      const baseI = pmt * N - P0;
      const years = Math.ceil(t / m), yr = [];
      for (let y = 1; y <= years; y++) {
        const rs = sched.filter(r => Math.ceil(r[0] / m) === y);
        yr.push([y, rs.reduce((s, r) => s + r[3], 0), rs.reduce((s, r) => s + r[4] + r[5], 0), rs.length ? rs[rs.length - 1][6] : 0]);
      }
      return {
        kpis: [
          { k: 'Payment per period', v: money(pmt, 2), raw: pmt, s: extra > 0 ? `+ extra ${money(extra, 2)} = ${money(pmt + extra, 2)}` : `${m}× per year`, cls: 'good', big: true },
          { k: 'Total interest', v: money(totI, 2), raw: totI, s: extra > 0 ? `Saves ${money(baseI - totI, 2)} vs no extra` : `${pct(totI / P0, 1)} of the loan` },
          { k: 'Total paid', v: money(P0 + totI, 2), raw: P0 + totI },
          { k: 'Number of payments', v: num(t, 0), raw: t, s: extra > 0 ? `Paid off ${num((N - t) / m, 2)} years early` : `${num(v.n, 2)} years` }
        ],
        charts: [
          { id: 'split', title: 'Interest vs principal paid each year', note: 'Early payments are mostly interest; the principal share grows over time.',
            build: T => ({ type: 'bar', data: { labels: yr.map(r => 'Y' + r[0]), datasets: [{ label: 'Interest', data: yr.map(r => r[1]), backgroundColor: T.alpha(T.c[1], .85), stack: 's' }, { label: 'Principal (incl. extra)', data: yr.map(r => r[2]), backgroundColor: T.alpha(T.c[0], .85), stack: 's' }] }, options: { plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', callbacks: { label: c => ' ' + c.dataset.label + ': ' + money(c.parsed.y, 2) } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: x => money(x, 0) }, grid: { color: T.grid } } } } }) },
          { id: 'bal', title: 'Outstanding balance',
            build: T => ({ type: 'line', data: { datasets: [ds('Balance', [{ x: 0, y: P0 }].concat(sched.map(r => ({ x: r[1], y: r[6] }))), T.c[2], { fill: 'origin', backgroundColor: T.alpha(T.c[2], .12) })] }, options: lineOpts(T, { xTitle: 'Years', yTitle: 'Balance ($)', xFmt: x => num(x, 2), yFmt: x => money(x, 2), beginAtZero: true, legend: false }) }) }
        ],
        tables: [
          { id: 'yearly', title: 'Yearly summary', columns: [{ h: 'Year', fmt: x => num(x, 0) }, { h: 'Interest', fmt: x => money(x, 2) }, { h: 'Principal', fmt: x => money(x, 2) }, { h: 'End balance', fmt: x => money(x, 2) }], rows: yr },
          { id: 'sched', title: 'Full amortization schedule', columns: [{ h: 'Period', fmt: x => num(x, 0) }, { h: 'Time (yrs)', fmt: x => num(x, 3) }, { h: 'Payment', fmt: x => money(x, 2) }, { h: 'Interest', fmt: x => money(x, 2) }, { h: 'Principal', fmt: x => money(x, 2) }, { h: 'Extra', fmt: x => money(x, 2) }, { h: 'Balance', fmt: x => money(x, 2) }], rows: sched }
        ],
        steps: [
          { h: '1. Periodic rate and number of payments', f: ['i = r / m, &nbsp; N = m × years'], calc: `i = ${num(v.r, 4)}% / ${m} = ${num(i * 100, 6)}%,  N = ${N}` },
          { h: '2. Level payment (annuity formula)', f: ['PMT = L · i / [1 − (1 + i)<sup>−N</sup>]'], calc: `PMT = ${num(P0, 2)} × ${num(i, 8)} / [1 − (1 + ${num(i, 8)})^−${N}] = ${num(pmt, 4)}` },
          { h: '3. Each period', f: ['Interest<sub>t</sub> = i × Balance<sub>t−1</sub>, &nbsp; Principal<sub>t</sub> = PMT − Interest<sub>t</sub>, &nbsp; Balance<sub>t</sub> = Balance<sub>t−1</sub> − Principal<sub>t</sub> − Extra'], calc: sched.length ? `Period 1: interest = ${num(sched[0][3], 2)}, principal = ${num(sched[0][4], 2)}, balance = ${num(sched[0][6], 2)}` : '' }
        ]
      };
    }
  });

  /* =====================================================================
     11. TWO-ASSET PORTFOLIO (new)
     ===================================================================== */
  TOOLS.push({
    id: 'portfolio', cat: 'corp', icon: 'pie', title: 'Two-Asset Portfolio & Efficient Frontier', short: 'Portfolio Frontier', isNew: true,
    desc: 'Diversification, minimum-variance and tangency (max Sharpe) portfolios with the Capital Market Line.',
    long: 'Markowitz mean-variance analysis for two risky assets plus a risk-free asset. Change the correlation to see the diversification effect.',
    inputs: [
      { id: 'e1', label: 'Asset A expected return', unit: '%', value: 8, step: 0.1 },
      { id: 's1', label: 'Asset A standard deviation', unit: '%', value: 12, step: 0.1 },
      { id: 'e2', label: 'Asset B expected return', unit: '%', value: 14, step: 0.1 },
      { id: 's2', label: 'Asset B standard deviation', unit: '%', value: 25, step: 0.1 },
      { id: 'rho', label: 'Correlation ρ', value: 0.2, step: 0.05, min: -1, max: 1 },
      { id: 'rf', label: 'Risk-free rate', unit: '%', value: 3, step: 0.1 },
      { id: 'w', label: 'Your weight in asset A', unit: '%', value: 60, step: 5 },
      { id: 'short', label: 'Short sales', type: 'seg', value: 'no', options: [['no', 'Not allowed'], ['yes', 'Allowed']] }
    ],
    compute(v) {
      if (!(v.s1 > 0 && v.s2 > 0)) return { error: 'Standard deviations must be positive.' };
      if (v.rho < -1 || v.rho > 1) return { error: 'Correlation must be between −1 and 1.' };
      const e1 = v.e1 / 100, e2 = v.e2 / 100, s1 = v.s1 / 100, s2 = v.s2 / 100, r = v.rho, rf = v.rf / 100, allowShort = v.short === 'yes';
      const E = w => w * e1 + (1 - w) * e2, S = w => Math.sqrt(Math.max(0, w * w * s1 * s1 + (1 - w) ** 2 * s2 * s2 + 2 * w * (1 - w) * r * s1 * s2));
      const sh = w => (E(w) - rf) / S(w);
      const clamp = w => allowShort ? w : Math.max(0, Math.min(1, w));
      const den = s1 * s1 + s2 * s2 - 2 * r * s1 * s2;
      const wMin = clamp(den > 0 ? (s2 * s2 - r * s1 * s2) / den : 0.5);
      const x1 = e1 - rf, x2 = e2 - rf, dT = x1 * s2 * s2 + x2 * s1 * s1 - (x1 + x2) * r * s1 * s2;
      let wT = Math.abs(dT) > 1e-14 ? (x1 * s2 * s2 - x2 * r * s1 * s2) / dT : NaN;
      const warnings = [];
      if (!allowShort && isFinite(wT) && (wT < 0 || wT > 1)) { const c = clamp(wT); wT = sh(0) > sh(1) ? 0 : 1; if (sh(c) > sh(wT)) wT = c; warnings.push('The unconstrained tangency portfolio needs a short position; with short sales not allowed the best corner is shown.'); }
      if (isFinite(wT) && E(wT) <= rf) warnings.push('The tangency portfolio does not beat the risk-free rate (negative Sharpe ratio).');
      const w = v.w / 100;
      const range = allowShort ? [-0.5, 1.5] : [0, 1], ws = F.linspace(range[0], range[1], 161);
      const fr = ws.map(x => ({ x: S(x), y: E(x) }));
      const cmlEnd = Math.max(...fr.map(p => p.x)) * 1.05;
      const tbl = F.linspace(0, 1, 11).map(x => [x, 1 - x, E(x), S(x), sh(x)]);
      return {
        warnings,
        kpis: [
          { k: 'Your portfolio', v: `${pct(E(w), 2)} / ${pct(S(w), 2)}`, s: `E(R) / σ with ${num(v.w, 1)}% in A; Sharpe ${num(sh(w), 3)}` },
          { k: 'Minimum-variance portfolio', v: `${pct(wMin, 1)} in A`, raw: wMin, s: `E(R) ${pct(E(wMin), 2)}, σ ${pct(S(wMin), 2)}`, cls: 'good' },
          { k: 'Tangency (max Sharpe)', v: isFinite(wT) ? `${pct(wT, 1)} in A` : 'n/a', raw: wT, s: isFinite(wT) ? `E(R) ${pct(E(wT), 2)}, σ ${pct(S(wT), 2)}, Sharpe ${num(sh(wT), 3)}` : '', cls: 'good' },
          { k: 'Diversification benefit', v: pct(w * s1 + (1 - w) * s2 - S(w), 2), s: 'Weighted-average σ minus portfolio σ' }
        ],
        charts: [{
          id: 'frontier', title: 'Mean-standard deviation frontier and Capital Market Line', tall: true,
          note: 'Every point on the curve is a mix of A and B. The CML runs from the risk-free rate through the tangency portfolio. Hover for details.',
          exportData: () => ({ columns: ['Weight A', 'Weight B', 'Std dev', 'Expected return', 'Sharpe'], rows: ws.map(x => [x, 1 - x, S(x), E(x), sh(x)]) }),
          build: T => {
            const d = [ds('Frontier (A + B)', fr, T.c[0], { borderWidth: 3, tension: 0.2 })];
            if (isFinite(wT)) d.push(ds('Capital Market Line', [{ x: 0, y: rf }, { x: cmlEnd, y: rf + sh(wT) * cmlEnd }], T.c[1], { borderDash: [6, 4] }));
            d.push(marker('Asset A', s1, e1, T.c[2]), marker('Asset B', s2, e2, T.c[3]), marker('Min variance', S(wMin), E(wMin), T.c[5], { pointStyle: 'triangle', pointRadius: 9 }));
            if (isFinite(wT)) d.push(marker('Tangency', S(wT), E(wT), T.c[1], { pointStyle: 'star', pointRadius: 10, borderWidth: 2 }));
            d.push(marker('Your portfolio', S(w), E(w), T.c[4], { pointStyle: 'rectRot', pointRadius: 8 }), marker('Risk-free', 0, rf, T.muted));
            const o = lineOpts(T, { xTitle: 'Standard deviation σ', yTitle: 'Expected return', xFmt: x => pct(x, 2), yFmt: x => pct(x, 2), xMin: 0 });
            return { type: 'line', data: { datasets: d }, options: o };
          }
        }],
        tables: [{ id: 'mix', title: 'Portfolio combinations', columns: [{ h: 'Weight A', fmt: x => pct(x, 0) }, { h: 'Weight B', fmt: x => pct(x, 0) }, { h: 'E(R)', fmt: x => pct(x, 3) }, { h: 'σ', fmt: x => pct(x, 3) }, { h: 'Sharpe', fmt: x => num(x, 4) }], rows: tbl }],
        steps: [
          { h: '1. Portfolio return and risk', f: ['E(R<sub>p</sub>) = w·E(R<sub>A</sub>) + (1−w)·E(R<sub>B</sub>)', 'σ<sub>p</sub>² = w²σ<sub>A</sub>² + (1−w)²σ<sub>B</sub>² + 2w(1−w)ρσ<sub>A</sub>σ<sub>B</sub>'], calc: `w = ${num(w, 4)}: E = ${pct(E(w), 4)},  σ = √(${num(w * w * s1 * s1 + (1 - w) ** 2 * s2 * s2 + 2 * w * (1 - w) * r * s1 * s2, 6)}) = ${pct(S(w), 4)}` },
          { h: '2. Minimum-variance weight', f: ['w<sub>min</sub> = (σ<sub>B</sub>² − ρσ<sub>A</sub>σ<sub>B</sub>) / (σ<sub>A</sub>² + σ<sub>B</sub>² − 2ρσ<sub>A</sub>σ<sub>B</sub>)'], calc: `w_min = ${num(wMin, 6)}${allowShort ? '' : ' (bounded to [0, 1])'}` },
          { h: '3. Tangency (maximum Sharpe ratio) weight', f: ['w<sub>T</sub> = [x<sub>A</sub>σ<sub>B</sub>² − x<sub>B</sub>ρσ<sub>A</sub>σ<sub>B</sub>] / [x<sub>A</sub>σ<sub>B</sub>² + x<sub>B</sub>σ<sub>A</sub>² − (x<sub>A</sub>+x<sub>B</sub>)ρσ<sub>A</sub>σ<sub>B</sub>], &nbsp; x = E(R) − r<sub>f</sub>'], calc: `w_T = ${num(wT, 6)},  Sharpe = (${pct(E(wT), 3)} − ${pct(rf, 3)}) / ${pct(S(wT), 3)} = ${num(sh(wT), 4)}` },
          { h: '4. Capital Market Line', f: ['E(R) = r<sub>f</sub> + [(E(R<sub>T</sub>) − r<sub>f</sub>) / σ<sub>T</sub>] · σ'], calc: `E(R) = ${pct(rf, 2)} + ${num(sh(wT), 4)} × σ` }
        ]
      };
    }
  });

  /* =====================================================================
     12. CAPM & SECURITY MARKET LINE (new)
     ===================================================================== */
  TOOLS.push({
    id: 'capm', cat: 'corp', icon: 'sml', title: 'CAPM & Security Market Line', short: 'CAPM & SML', isNew: true,
    desc: 'Required return from beta, Jensen\'s alpha and the over/under-valuation verdict on the SML.',
    long: 'Capital Asset Pricing Model. Compare up to three securities against the Security Market Line using their betas and your forecast returns.',
    inputs: [
      { id: 'rf', label: 'Risk-free rate', unit: '%', value: 3, step: 0.1 },
      { id: 'rm', label: 'Expected market return', unit: '%', value: 9, step: 0.1 },
      { id: 'b1', label: 'Security 1 beta', value: 1.2, step: 0.05 },
      { id: 'f1', label: 'Security 1 forecast return', unit: '% (optional)', value: 11, step: 0.1, optional: true },
      { id: 'b2', label: 'Security 2 beta', value: 0.7, step: 0.05, optional: true },
      { id: 'f2', label: 'Security 2 forecast return', unit: '% (optional)', value: 6, step: 0.1, optional: true },
      { id: 'b3', label: 'Security 3 beta', value: '', step: 0.05, optional: true },
      { id: 'f3', label: 'Security 3 forecast return', unit: '% (optional)', value: '', step: 0.1, optional: true }
    ],
    compute(v) {
      const rf = v.rf / 100, rm = v.rm / 100, mrp = rm - rf;
      const sec = [1, 2, 3].map(i => ({ i, b: v['b' + i], f: v['f' + i] / 100 })).filter(s => isFinite(s.b));
      if (!sec.length) return { error: 'Enter at least one beta.' };
      sec.forEach(s => { s.req = rf + s.b * mrp; s.alpha = isFinite(s.f) ? s.f - s.req : NaN; });
      const bMax = Math.max(2, ...sec.map(s => s.b + 0.3)), bMin = Math.min(0, ...sec.map(s => s.b - 0.3));
      return {
        kpis: [{ k: 'Market risk premium', v: pct(mrp, 2), raw: mrp, s: 'E(R<sub>m</sub>) − r<sub>f</sub>' }].concat(sec.map(s => ({
          k: 'Security ' + s.i + ' required return', v: pct(s.req, 3), raw: s.req,
          s: isFinite(s.alpha) ? `α = ${pct(s.alpha, 2)} ⇒ ${s.alpha > 0 ? 'undervalued (above SML)' : s.alpha < 0 ? 'overvalued (below SML)' : 'fairly priced'}` : 'β = ' + num(s.b, 2),
          cls: isFinite(s.alpha) ? (s.alpha > 0 ? 'good' : s.alpha < 0 ? 'bad' : '') : ''
        }))),
        charts: [{
          id: 'sml', title: 'Security Market Line', note: 'Securities plotted above the SML offer more return than CAPM requires for their beta (positive alpha).',
          build: T => {
            const d = [ds('SML', [{ x: bMin, y: rf + bMin * mrp }, { x: bMax, y: rf + bMax * mrp }], T.c[0], { borderWidth: 3 }), marker('Market (β = 1)', 1, rm, T.text), marker('Risk-free', 0, rf, T.muted)];
            sec.forEach((s, k) => { d.push(marker('Security ' + s.i + (isFinite(s.f) ? ' (forecast)' : ' (required)'), s.b, isFinite(s.f) ? s.f : s.req, T.c[k + 1], { pointStyle: 'rectRot', pointRadius: 8 })); });
            return { type: 'line', data: { datasets: d }, options: lineOpts(T, { xTitle: 'Beta', yTitle: 'Expected return', xFmt: x => num(x, 2), yFmt: x => pct(x, 2) }) };
          }
        }],
        tables: [{ id: 'sec', title: 'CAPM valuation', columns: [{ h: 'Security', num: false }, { h: 'Beta', fmt: x => num(x, 3) }, { h: 'Required return', fmt: x => pct(x, 3) }, { h: 'Forecast return', fmt: x => pct(x, 3) }, { h: 'Alpha', fmt: x => pct(x, 3) }, { h: 'Verdict', num: false }], rows: sec.map(s => ['Security ' + s.i, s.b, s.req, isFinite(s.f) ? s.f : '', isFinite(s.alpha) ? s.alpha : '', isFinite(s.alpha) ? (s.alpha > 0 ? 'Undervalued' : s.alpha < 0 ? 'Overvalued' : 'Fair') : '']) }],
        steps: [
          { h: '1. CAPM', f: ['E(R<sub>i</sub>) = r<sub>f</sub> + β<sub>i</sub> · [E(R<sub>m</sub>) − r<sub>f</sub>]'], calc: sec.map(s => `Security ${s.i}: ${pct(rf, 2)} + ${num(s.b, 3)} × ${pct(mrp, 2)} = ${pct(s.req, 4)}`).join('\n') },
          { h: '2. Jensen\'s alpha', f: ['α<sub>i</sub> = forecast E(R<sub>i</sub>) − CAPM required return'], calc: sec.filter(s => isFinite(s.alpha)).map(s => `Security ${s.i}: ${pct(s.f, 3)} − ${pct(s.req, 3)} = ${pct(s.alpha, 3)}`).join('\n') || 'Enter forecast returns to compute alpha.' }
        ]
      };
    }
  });

  /* =====================================================================
     13. RE-ESTIMATE DISTRESS MODEL WEIGHTS ON YOUR OWN SAMPLE (LDA + LOGIT)
     ===================================================================== */
  // ---- small numerical helpers ----
  function matInv(A) {
    const n = A.length; const M = A.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => i === j ? 1 : 0)));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (!(Math.abs(M[p][c]) > 1e-10)) return null;
      const tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(r => r.slice(n));
  }
  function lgam(x) {
    const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015;
    for (let j = 0; j < 6; j++) s += g[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x) {
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function betaInc(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  const fPval = (f, d1, d2) => !(f > 0) ? 1 : betaInc(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; } return sum * Math.exp(-x + a * Math.log(x) - lgam(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - lgam(a)) * h;
  }
  const chi2Pval = (x, df) => !(x > 0) ? 1 : 1 - gammaP(df / 2, x / 2);
  const sig = (x, d) => !isFinite(x) ? num(x) : x !== 0 && (Math.abs(x) < 0.01 || Math.abs(x) >= 1e5) ? x.toExponential(Math.max(2, d - 1)).replace('-', '−').replace('e', '×10^').replace(/\^\+?(−?\d+)/, '<sup>$1</sup>') : num(x, d);
  const sigT = (x, d) => sig(x, d).replace(/<sup>(.*?)<\/sup>/, '^$1');
  const pvTxt = p => !isFinite(p) ? '' : p < 0.0001 ? '< 0.0001' : num(p, 4);
  const stars = p => p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '';

  // ---- data preparation ----
  const RE_STATUS = ['status', 'distress', 'distressed', 'failed', 'failure', 'fail', 'bankrupt', 'bankruptcy', 'default', 'defaulted', 'y', 'label', 'group', 'class', 'outcome'];
  const reNorm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const reAutoStatus = cols => cols.find(c => RE_STATUS.includes(reNorm(c))) || '';
  function reStatus(x) {
    if (typeof x === 'number') return x === 1 ? 1 : x === 0 ? 0 : NaN;
    if (typeof x === 'boolean') return x ? 1 : 0;
    const s = reNorm(x);
    if (['1', 'yes', 'y', 'true', 'distressed', 'distress', 'failed', 'fail', 'failure', 'bankrupt', 'default', 'defaulted', 'd', 'b', 'f'].includes(s)) return 1;
    if (['0', 'no', 'n', 'false', 'healthy', 'nondistressed', 'nonfailed', 'nonbankrupt', 'active', 'survivor', 'surviving', 'solvent', 'h', 'nb'].includes(s)) return 0;
    return NaN;
  }
  const reNum = x => {
    if (x === undefined || x === null || x === '') return NaN; if (typeof x === 'number') return x;
    let s = String(x).trim().replace(/[\s$€£%]/g, '').replace(/[−–]/g, '-');
    if (s.includes('.') && s.includes(',')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.includes(',')) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    const n = Number(s); return s === '' ? NaN : n;
  };
  const RE_ITEMS = Object.assign({}, BATCH_COLS, {
    ni: ['netincome', 'ni', 'netprofit', 'profit', 'netincomet'],
    nip: ['netincomeprev', 'netincomeprevious', 'previousnetincome', 'priornetincome', 'netincomeprioryear', 'netincomelastyear', 'niprev', 'nip', 'netincomet1'],
    ffo: ['fundsfromoperations', 'ffo', 'operatingcashflow', 'cashflowfromoperations', 'ocf', 'cfo'],
    gnp: ['gnpindex', 'gnppricelevelindex', 'pricelevelindex', 'gnp', 'deflator']
  });
  const RE_ITEM_NAMES = { ta: 'Total Assets', tl: 'Total Liabilities', wc: 'Working Capital (or Current Assets and Current Liabilities)', ca: 'Current Assets', cl: 'Current Liabilities', re: 'Retained Earnings', ebit: 'EBIT', sales: 'Sales', eq: 'Market or Book Value of Equity', ni: 'Net Income', nip: 'Net Income Prev', ffo: 'Funds from Operations' };
  const both = (a, b, f) => isFinite(a) && isFinite(b) ? f() : NaN;
  const RE_PRESETS = {
    altman: { need: ['ta', 'tl', 'wc', 're', 'ebit', 'sales', 'eq'], vars: [
      ['X1', 'Working capital / Total assets', d => d.wc / d.ta],
      ['X2', 'Retained earnings / Total assets', d => d.re / d.ta],
      ['X3', 'EBIT / Total assets', d => d.ebit / d.ta],
      ['X4', 'Equity / Total liabilities', d => d.eq / d.tl],
      ['X5', 'Sales / Total assets', d => d.sales / d.ta]] },
    ohlson: { need: ['ta', 'tl', 'wc', 'ca', 'cl', 'ni', 'nip', 'ffo'], vars: [
      ['SIZE', 'ln(Total assets / GNP price-level index)', d => Math.log(d.ta / d.gnp)],
      ['TLTA', 'Total liabilities / Total assets', d => d.tl / d.ta],
      ['WCTA', 'Working capital / Total assets', d => d.wc / d.ta],
      ['CLCA', 'Current liabilities / Current assets', d => d.cl / d.ca],
      ['OENEG', '1 if total liabilities > total assets', d => both(d.tl, d.ta, () => d.tl > d.ta ? 1 : 0)],
      ['NITA', 'Net income / Total assets', d => d.ni / d.ta],
      ['FUTL', 'Funds from operations / Total liabilities', d => d.ffo / d.tl],
      ['INTWO', '1 if net income < 0 in both of the last two years', d => both(d.ni, d.nip, () => d.ni < 0 && d.nip < 0 ? 1 : 0)],
      ['CHIN', '(NI<sub>t</sub> − NI<sub>t−1</sub>) / (|NI<sub>t</sub>| + |NI<sub>t−1</sub>|)', d => both(d.ni, d.nip, () => (Math.abs(d.ni) + Math.abs(d.nip)) === 0 ? 0 : (d.ni - d.nip) / (Math.abs(d.ni) + Math.abs(d.nip)))]] }
  };
  const ORIG = {
    market: { name: 'Altman Z (1968)', sym: 'Z', w: [1.2, 1.4, 3.3, 0.6, 1.0], cut: 2.675, cutTxt: '2.675 (Altman 1968)' },
    book: { name: "Altman Z' (private firms)", sym: "Z'", w: [0.717, 0.847, 3.107, 0.420, 0.998], cut: 2.065, cutTxt: '2.065 (midpoint of 1.23 and 2.90)' },
    ohlson: { name: 'Ohlson O-score (1980)', sym: 'O', b0: -1.32, w: [-0.407, 6.03, -1.43, 0.0757, -1.72, -2.37, -1.83, 0.285, -0.521], cut: 0.5, cutTxt: '50% probability' }
  };

  function rePrepare(raw, v) {
    const cols = []; raw.slice(0, 50).forEach(r => Object.keys(r).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
    const ycol = cols.includes(v.ycol) ? v.ycol : reAutoStatus(cols);
    if (!ycol) return { error: 'No status column found. Add a column named Status (1 = distressed, 0 = healthy) or choose it under "Status column".' };
    const map = {}; Object.entries(RE_ITEMS).forEach(([k, al]) => { const hit = cols.find(h => al.includes(reNorm(h))); if (hit) map[k] = hit; });
    const notes = [];
    let names, descs, fx, orig = null;
    if (v.preset === 'custom') {
      const xs = (Array.isArray(v.xcols) ? v.xcols : []).filter(c => cols.includes(c) && c !== ycol);
      if (!xs.length) return { error: 'Tick at least one explanatory variable under "Variables to use".' };
      names = xs; descs = xs.map(() => 'column of your file'); fx = xs.map(c => r => reNum(r[c]));
    } else {
      const P = RE_PRESETS[v.preset];
      const has = k => k === 'wc' ? (map.wc || (map.ca && map.cl)) : k === 'eq' ? (map.mve || map.bve) : map[k];
      const miss = P.need.filter(k => !has(k));
      if (miss.length) return { error: 'Your file needs these columns for this preset: ' + miss.map(k => RE_ITEM_NAMES[k]).join(', ') + '. Download the template for the expected names, or use "Choose columns".' };
      const eqKey = v.x4eq === 'book' ? 'bve' : 'mve', eqAlt = eqKey === 'bve' ? 'mve' : 'bve';
      if (v.preset === 'altman' && !map[eqKey]) notes.push(`No ${eqKey === 'mve' ? 'market' : 'book'} value of equity column: X4 uses the ${eqKey === 'mve' ? 'book' : 'market'} value instead.`);
      let gnpWarn = false;
      fx = P.vars.map(x => x[2]); names = P.vars.map(x => x[0]); descs = P.vars.map(x => x[1]);
      const item = (r, k) => map[k] ? reNum(r[map[k]]) : NaN;
      const toD = r => {
        const d = {}; ['ta', 'tl', 'wc', 'ca', 'cl', 're', 'ebit', 'sales', 'mve', 'bve', 'ni', 'nip', 'ffo', 'gnp'].forEach(k => d[k] = item(r, k));
        if (!isFinite(d.wc)) d.wc = d.ca - d.cl;
        d.eq = isFinite(d[eqKey]) ? d[eqKey] : d[eqAlt];
        if (!isFinite(d.gnp)) { const yr = map.year ? parseInt(r[map.year], 10) : NaN; d.gnp = isFinite(yr) && yr >= 2021 && yr <= 2026 ? gnpIndex(String(yr)) : 100; if (!(isFinite(yr) && yr >= 2021 && yr <= 2026)) gnpWarn = true; }
        return d;
      };
      fx = fx.map(f => r => f(toD(r)));
      if (v.preset === 'ohlson') {
        fx.length && raw.forEach(r => toD(r));
        if (gnpWarn && !map.gnp) notes.push('SIZE: some rows have no GNP Index column and no year between 2021 and 2026, so an index of 100 was used. This only shifts the intercept when all firms share one index, but add a GNP Index column for multi-year samples.');
      }
      orig = v.preset === 'ohlson' ? ORIG.ohlson : ORIG[v.x4eq === 'book' ? 'book' : 'market'];
    }
    const lab = [], unl = []; let dropped = 0, badY = 0;
    raw.forEach((r, i) => {
      const yRaw = r[ycol]; const y = reStatus(yRaw); const x = fx.map(f => f(r));
      const firm = map.firm ? String(r[map.firm]) : 'Row ' + (i + 2); const year = map.year ? String(r[map.year] ?? '') : '';
      if (!x.every(isFinite)) { dropped++; return; }
      if (yRaw === '' || yRaw === null || yRaw === undefined) unl.push({ firm, year, x });
      else if (isNaN(y)) badY++;
      else lab.push({ firm, year, x, y });
    });
    if (dropped) notes.push(`${dropped} row(s) were skipped because a variable is missing or not a number (for example a zero denominator).`);
    if (badY) notes.push(`${badY} row(s) were skipped because the status value is not recognised (use 1 / 0).`);
    // drop constant variables
    let keep = names.map((_, j) => { const vals = lab.map(o => o.x[j]); return vals.length && Math.max(...vals) - Math.min(...vals) > 1e-12; });
    const dropV = names.filter((_, j) => !keep[j]);
    if (dropV.length) notes.push('Dropped because they do not vary in your sample: ' + dropV.join(', ') + '.');
    const sel = a => a.filter((_, j) => keep[j]);
    if (orig && dropV.length) orig = Object.assign({}, orig, { keep });
    lab.forEach(o => { o.xAll = o.x; o.x = sel(o.x); }); unl.forEach(o => { o.xAll = o.x; o.x = sel(o.x); });
    return { ycol, names: sel(names), descs: sel(descs), lab, unl, notes, orig };
  }

  // ---- estimation ----
  function stdz(X) {
    const p = X[0].length, n = X.length, mu = [], sd = [];
    for (let j = 0; j < p; j++) { let m = 0; X.forEach(r => m += r[j]); m /= n; let s = 0; X.forEach(r => s += (r[j] - m) ** 2); mu.push(m); sd.push(Math.sqrt(s / (n - 1)) || 1); }
    const con = sd.map(x => !(x > 1e-12)); con.forEach((c, j) => { if (c) sd[j] = 1; });
    return { mu, sd, con, f: r => r.map((x, j) => (x - mu[j]) / sd[j]) };
  }
  function ldaFit(Xr, y) {
    const S0 = stdz(Xr), X = Xr.map(S0.f), p = X[0].length;
    const g = [0, 1].map(c => X.filter((_, i) => y[i] === c)); const n0 = g[0].length, n1 = g[1].length, n = n0 + n1;
    const mean = G => Array.from({ length: p }, (_, j) => G.reduce((s, r) => s + r[j], 0) / G.length);
    const m0 = mean(g[0]), m1 = mean(g[1]);
    const S = Array.from({ length: p }, () => new Array(p).fill(0));
    [[g[0], m0], [g[1], m1]].forEach(([G, m]) => G.forEach(r => { for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) S[a][b] += (r[a] - m[a]) * (r[b] - m[b]); }));
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) S[a][b] /= (n - 2);
    // variables that are constant in this fit get a zero coefficient
    const act = S0.con.map(c => !c), ai = act.map((a, j) => a ? j : -1).filter(j => j >= 0);
    const Sa = matInv(ai.map(a => ai.map(b => S[a][b]))); if (!Sa) return null;
    const Si = S.map(() => new Array(p).fill(0)); ai.forEach((a, x) => ai.forEach((b, z) => Si[a][b] = Sa[x][z]));
    const d = m0.map((x, j) => act[j] ? x - m1[j] : 0);
    let w = Si.map(row => row.reduce((s, x, j) => s + x * d[j], 0));
    const D2 = d.reduce((s, x, j) => s + x * w[j], 0);
    w = w.map(x => x / Math.sqrt(D2));                      // within-group SD of Z = 1
    const c = w.map((x, j) => x / S0.sd[j]);                 // coefficients on the raw variables (no constant, Altman form)
    const std = w.map((x, j) => x * Math.sqrt(S[j][j]));     // standardized (pooled within-group SD) coefficients
    const Z = r => r.reduce((s, x, j) => s + x * c[j], 0);
    const zs = Xr.map(Z); const zH = zs.filter((_, i) => y[i] === 0), zD = zs.filter((_, i) => y[i] === 1);
    const cH = zH.reduce((a, b) => a + b, 0) / n0, cD = zD.reduce((a, b) => a + b, 0) / n1;
    const T2 = n0 * n1 / n * D2, F = (n - p - 1) / (p * (n - 2)) * T2, wilks = 1 / (1 + T2 / (n - 2));
    return { c, std, Z, zs, cH, cD, mid: (cH + cD) / 2, D2, F, df1: p, df2: n - p - 1, pF: fPval(F, p, n - p - 1), wilks, canon: Math.sqrt(1 - wilks), ziLo: Math.min(...zH), ziHi: Math.max(...zD), n0, n1, S, m0, m1, S0 };
  }
  const log1pexp = e => e > 0 ? e + Math.log1p(Math.exp(-e)) : Math.log1p(Math.exp(e));
  function logitFit(Xr, y, lambda0) {
    const S0 = stdz(Xr), X = Xr.map(r => [1].concat(S0.f(r))), n = X.length, p = X[0].length;
    const run = lambda => {
      const ybar = y.reduce((a, b) => a + b, 0) / n; let b = new Array(p).fill(0); b[0] = Math.log(ybar / (1 - ybar));
      const llf = bb => { let l = 0; X.forEach((r, i) => { const e = r.reduce((s, x, j) => s + x * bb[j], 0); l += y[i] * e - log1pexp(e); }); for (let j = 1; j < p; j++) l -= lambda / 2 * bb[j] * bb[j]; return l; };
      let ll = llf(b), conv = false, H = null, it = 0;
      for (it = 0; it < 100; it++) {
        const g = new Array(p).fill(0); H = Array.from({ length: p }, () => new Array(p).fill(0));
        X.forEach((r, i) => { const e = r.reduce((s, x, j) => s + x * b[j], 0), pi = 1 / (1 + Math.exp(-e)), w = pi * (1 - pi); for (let a = 0; a < p; a++) { g[a] += (y[i] - pi) * r[a]; for (let c = a; c < p; c++) H[a][c] += w * r[a] * r[c]; } });
        for (let a = 0; a < p; a++) for (let c = 0; c < a; c++) H[a][c] = H[c][a];
        for (let j = 1; j < p; j++) { g[j] -= lambda * b[j]; H[j][j] += lambda + (S0.con[j - 1] ? 1 : 0); }
        const Hi = matInv(H); if (!Hi) break;
        const step = Hi.map(row => row.reduce((s, x, j) => s + x * g[j], 0));
        let t = 1, nb, nll;
        do { nb = b.map((x, j) => x + t * step[j]); nll = llf(nb); t /= 2; } while (nll < ll - 1e-12 && t > 1e-6);
        const dl = nll - ll; b = nb; ll = nll;
        if (Math.abs(dl) < 1e-10 && Math.max(...step.map(Math.abs)) < 1e-6) { conv = true; break; }
      }
      return { b, ll, conv, H };
    };
    let fit = run(lambda0 || 0), penalized = !!lambda0;
    const sep = !fit.conv || Math.max(...fit.b.slice(1).map(Math.abs)) > 12;
    if (sep && !lambda0) { fit = run(1); penalized = true; }
    const Cov = matInv(fit.H) || fit.H.map(r => r.map(() => NaN));
    // back to raw-variable coefficients: b_raw = T b, Cov_raw = T Cov T'
    const T = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, c) => a === 0 ? (c === 0 ? 1 : -S0.mu[c - 1] / S0.sd[c - 1]) : (a === c ? 1 / S0.sd[a - 1] : 0)));
    const braw = T.map(row => row.reduce((s, x, j) => s + x * fit.b[j], 0));
    const TC = T.map(row => Cov[0].map((_, c) => row.reduce((s, x, k) => s + x * Cov[k][c], 0)));
    const se = T.map((row, a) => a && S0.con[a - 1] ? NaN : Math.sqrt(row.reduce((s, x, k) => s + TC[a][k] * x, 0)));
    const z = braw.map((x, j) => x / se[j]), pz = z.map(x => 2 * (1 - F.normCdf(Math.abs(x))));
    const P = r => 1 / (1 + Math.exp(-(braw[0] + r.reduce((s, x, j) => s + x * braw[j + 1], 0))));
    const ybar = y.reduce((a, b) => a + b, 0) / n, ll0 = n * (ybar * Math.log(ybar) + (1 - ybar) * Math.log(1 - ybar));
    let ll = 0; Xr.forEach((r, i) => { const pi = Math.min(1 - 1e-15, Math.max(1e-15, P(r))); ll += y[i] * Math.log(pi) + (1 - y[i]) * Math.log(1 - pi); });
    const LR = 2 * (ll - ll0);
    return { b: braw, se, z, pz, std: fit.b.slice(1), P, ll, ll0, LR, pLR: chi2Pval(LR, p - 1), r2: 1 - ll / ll0, aic: -2 * ll + 2 * p, penalized, sep, conv: fit.conv, S0 };
  }

  // ---- evaluation ----
  function auc(s, y) {
    const n1 = y.filter(v => v === 1).length, n0 = y.length - n1; if (!n1 || !n0) return NaN;
    const idx = s.map((_, i) => i).sort((a, b) => s[a] - s[b]); const rank = new Array(s.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && s[idx[j + 1]] === s[idx[i]]) j++; const rr = (i + j) / 2 + 1; for (let k = i; k <= j; k++) rank[idx[k]] = rr; i = j + 1; }
    let R1 = 0; y.forEach((v, i) => { if (v === 1) R1 += rank[i]; });
    return (R1 - n1 * (n1 + 1) / 2) / (n1 * n0);
  }
  function roc(s, y) {
    const n1 = y.filter(v => v === 1).length, n0 = y.length - n1; const idx = s.map((_, i) => i).sort((a, b) => s[b] - s[a]);
    const pts = [{ x: 0, y: 0 }]; let tp = 0, fp = 0;
    for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && s[idx[j]] === s[idx[i]]) { if (y[idx[j]] === 1) tp++; else fp++; j++; } pts.push({ x: fp / n0, y: tp / n1 }); i = j; }
    return pts;
  }
  // s: distress score (higher = more likely distressed). Returns the cut c: classify distressed if s >= c.
  function bestCut(s, y, rule) {
    const n1 = y.filter(v => v === 1).length, n0 = y.length - n1;
    const idx = s.map((_, i) => i).sort((a, b) => s[a] - s[b]);
    let tnBelow = 0, fnBelow = 0, best = -Infinity, cands = [];
    for (let k = 0; k <= idx.length; k++) {
      if (k === 0 || k === idx.length || s[idx[k - 1]] < s[idx[k]]) {
        const c = k === 0 ? s[idx[0]] - 1 : k === idx.length ? s[idx[k - 1]] + 1 : (s[idx[k - 1]] + s[idx[k]]) / 2;
        const tp = n1 - fnBelow, tn = tnBelow;
        const m = rule === 'accuracy' ? (tp + tn) / (n0 + n1) : tp / n1 + tn / n0 - 1;
        if (m > best + 1e-12) { best = m; cands = [c]; } else if (Math.abs(m - best) <= 1e-12) cands.push(c);
      }
      if (k < idx.length) { if (y[idx[k]] === 1) fnBelow++; else tnBelow++; }
    }
    return cands[Math.floor((cands.length - 1) / 2)];
  }
  function evalAt(s, y, c) {
    let tp = 0, fn = 0, fp = 0, tn = 0; s.forEach((v, i) => { const pd = v >= c; if (y[i] === 1) { if (pd) tp++; else fn++; } else { if (pd) fp++; else tn++; } });
    const n1 = tp + fn, n0 = fp + tn;
    return { tp, fn, fp, tn, n: n0 + n1, acc: (tp + tn) / (n0 + n1), t1: n1 ? fn / n1 : NaN, t2: n0 ? fp / n0 : NaN, auc: auc(s, y) };
  }
  // fit both models on (X, y) and choose cut-offs on the same data
  function fitBoth(X, y, rule) {
    const L = ldaFit(X, y); if (!L) return { error: 'The variables are perfectly collinear in this sample (the covariance matrix cannot be inverted). Remove one of the variables that duplicates another.' };
    const G = logitFit(X, y);
    const sL = X.map(r => -L.Z(r)), sG = X.map(G.P);
    L.cutS = rule === 'conventional' ? -L.mid : bestCut(sL, y, rule); L.cut = -L.cutS;
    G.cut = rule === 'conventional' ? 0.5 : bestCut(sG, y, rule);
    return { L, G };
  }
  function reSplit(y, frac, k, seed) {
    const rnd = F.rng(seed), set = y.map(() => 'train'), fold = y.map(() => 0); let ctr = 0;
    [1, 0].forEach(c => {
      const idx = y.map((v, i) => v === c ? i : -1).filter(i => i >= 0);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      const nt = frac > 0 ? Math.min(idx.length - 2, Math.max(1, Math.round(idx.length * frac))) : 0;
      idx.forEach((ii, pos) => { if (pos < nt) set[ii] = 'test'; else if (k >= 2) fold[ii] = (ctr++ % k) + 1; });
    });
    return { set, fold };
  }
  // ---- machine learning: random forest and XGBoost-style gradient boosting (trees on the raw ratios) ----
  // tree node: leaf {v, n} or split {f, t, l, r, v, n}; n = training samples reaching the node (cover, used by TreeSHAP)
  function growTree(X, idx, opt, rnd, leafVal, gainOf) {
    const p = X[0].length;
    const node = (ids, depth) => {
      const nd = { n: ids.length, v: leafVal(ids) };
      if (depth >= opt.maxDepth || ids.length < 2 * opt.minLeaf) return nd;
      let feats = Array.from({ length: p }, (_, j) => j);
      if (opt.mtry && opt.mtry < p) { for (let i = p - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = feats[i]; feats[i] = feats[j]; feats[j] = t; } feats = feats.slice(0, opt.mtry); }
      let best = null;
      for (const f of feats) {
        const s = ids.slice().sort((a, b) => X[a][f] - X[b][f]);
        const g = gainOf(s);
        for (let k = 1; k < opt.minLeaf; k++) g.add(s[k - 1]);
        for (let k = opt.minLeaf; k <= s.length - opt.minLeaf; k++) {
          const lo = X[s[k - 1]][f], hi = X[s[k]][f];
          g.add(s[k - 1]);
          if (hi <= lo) continue;
          const gain = g.gain(); if (gain === null) continue;
          if (!best || gain > best.gain + 1e-12) best = { gain, f, t: (lo + hi) / 2, k, s };
        }
      }
      if (!best || !(best.gain > 1e-12)) return nd;
      nd.f = best.f; nd.t = best.t;
      nd.l = node(best.s.slice(0, best.k), depth + 1); nd.r = node(best.s.slice(best.k), depth + 1);
      return nd;
    };
    return node(idx, 0);
  }
  const treeVal = (nd, x) => { while (nd.l) nd = x[nd.f] <= nd.t ? nd.l : nd.r; return nd.v; };
  function rfFit(X, y, seed, rule) {
    const n = X.length, p = X[0].length, rnd = F.rng(seed * 7919 + 17), T = 200;
    const opt = { maxDepth: 12, minLeaf: 2, mtry: Math.max(1, Math.round(Math.sqrt(p))) };
    const leafVal = ids => ids.reduce((s, i) => s + y[i], 0) / ids.length;
    const gini = s => { let n1 = s.reduce((a, i) => a + y[i], 0), N = s.length, l = 0, l1 = 0; const base = N - (n1 * n1 + (N - n1) * (N - n1)) / N;
      return { add: i => { l++; l1 += y[i]; }, gain: () => { const r = N - l, r1 = n1 - l1; const wl = l - (l1 * l1 + (l - l1) * (l - l1)) / l, wr = r - (r1 * r1 + (r - r1) * (r - r1)) / r; return base - wl - wr; } }; };
    const trees = [], oobSum = new Array(n).fill(0), oobCnt = new Array(n).fill(0);
    for (let t = 0; t < T; t++) {
      const idx = Array.from({ length: n }, () => Math.floor(rnd() * n)), inb = new Uint8Array(n); idx.forEach(i => inb[i] = 1);
      const tree = growTree(X, idx, opt, rnd, leafVal, gini); trees.push(tree);
      for (let i = 0; i < n; i++) if (!inb[i]) { oobSum[i] += treeVal(tree, X[i]); oobCnt[i]++; }
    }
    const P = x => trees.reduce((s, tr) => s + treeVal(tr, x), 0) / T;
    // the cut-off is chosen on out-of-bag probabilities (in-sample forest probabilities are overfitted)
    const oob = X.map((x, i) => oobCnt[i] ? oobSum[i] / oobCnt[i] : P(x));
    return { trees, P, cut: rule === 'conventional' ? 0.5 : bestCut(oob, y, rule), T, opt, space: 'probability' };
  }
  function gbCore(X, y, seed) {
    const n = X.length, rnd = F.rng(seed * 104729 + 3), R = 150, lr = 0.1, lambda = 1, mcw = 1;
    const opt = { maxDepth: 3, minLeaf: 2, mtry: 0 };
    const ybar = Math.min(0.99, Math.max(0.01, y.reduce((a, b) => a + b, 0) / n)), f0 = Math.log(ybar / (1 - ybar));
    const Fx = new Array(n).fill(f0), trees = [];
    for (let m = 0; m < R; m++) {
      const g = new Array(n), h = new Array(n);
      for (let i = 0; i < n; i++) { const pi = 1 / (1 + Math.exp(-Fx[i])); g[i] = pi - y[i]; h[i] = Math.max(pi * (1 - pi), 1e-6); }
      const idx = []; for (let i = 0; i < n; i++) if (rnd() < 0.8) idx.push(i);
      const leafVal = ids => { let G = 0, H = 0; ids.forEach(i => { G += g[i]; H += h[i]; }); return -lr * G / (H + lambda); };
      const xgain = s => { let G = 0, H = 0; s.forEach(i => { G += g[i]; H += h[i]; }); const base = G * G / (H + lambda); let GL = 0, HL = 0;
        return { add: i => { GL += g[i]; HL += h[i]; }, gain: () => { const GR = G - GL, HR = H - HL; if (HL < mcw || HR < mcw) return null; return 0.5 * (GL * GL / (HL + lambda) + GR * GR / (HR + lambda) - base); } }; };
      const tree = growTree(X, idx, opt, rnd, leafVal, xgain); trees.push(tree);
      for (let i = 0; i < n; i++) Fx[i] += treeVal(tree, X[i]);
    }
    const margin = x => trees.reduce((s, tr) => s + treeVal(tr, x), f0);
    return { trees, f0, margin, P: x => 1 / (1 + Math.exp(-margin(x))), R, lr, lambda, opt };
  }
  function gbFit(X, y, seed, rule) {
    const B = gbCore(X, y, seed);
    B.space = 'log-odds';
    if (rule === 'conventional') { B.cut = 0.5; return B; }
    // the cut-off is chosen on out-of-fold probabilities from an inner 3-fold split of the same data
    const sp = reSplit(y, 0, 3, seed + 101), oof = new Array(y.length);
    for (let f = 1; f <= 3; f++) {
      const tri = y.map((_, i) => i).filter(i => sp.fold[i] !== f), vai = y.map((_, i) => i).filter(i => sp.fold[i] === f);
      const Bf = gbCore(tri.map(i => X[i]), tri.map(i => y[i]), seed + f);
      vai.forEach(i => oof[i] = Bf.P(X[i]));
    }
    B.cut = bestCut(oof, y, rule);
    return B;
  }
  // ---- TreeSHAP (Lundberg, Erion and Lee 2018, path-dependent algorithm): exact Shapley values for one tree ----
  function treeShap(root, x, phi, scale) {
    const extend = (m, pz, po, pi) => {
      const l = m.length; m = m.map(e => e.slice()); m.push([pi, pz, po, l === 0 ? 1 : 0]);
      for (let i = l - 1; i >= 0; i--) { m[i + 1][3] += po * m[i][3] * (i + 1) / (l + 1); m[i][3] = pz * m[i][3] * (l - i) / (l + 1); }
      return m;
    };
    const unwind = (m, i) => {
      m = m.map(e => e.slice()); const l = m.length - 1, o = m[i][2], z = m[i][1]; let nn = m[l][3];
      for (let j = l - 1; j >= 0; j--) {
        if (o !== 0) { const t = m[j][3]; m[j][3] = nn * (l + 1) / ((j + 1) * o); nn = t - m[j][3] * z * (l - j) / (l + 1); }
        else m[j][3] = m[j][3] * (l + 1) / (z * (l - j));
      }
      for (let j = i; j < l; j++) { m[j][0] = m[j + 1][0]; m[j][1] = m[j + 1][1]; m[j][2] = m[j + 1][2]; }
      m.pop(); return m;
    };
    const rec = (nd, m, pz, po, pi) => {
      m = extend(m, pz, po, pi);
      if (!nd.l) {
        for (let i = 1; i < m.length; i++) { const w = unwind(m, i).reduce((s, e) => s + e[3], 0); phi[m[i][0]] += scale * w * (m[i][2] - m[i][1]) * nd.v; }
        return;
      }
      const hot = x[nd.f] <= nd.t ? nd.l : nd.r, cold = hot === nd.l ? nd.r : nd.l;
      let iz = 1, io = 1; const k = m.findIndex((e, j) => j > 0 && e[0] === nd.f);
      if (k > 0) { iz = m[k][1]; io = m[k][2]; m = unwind(m, k); }
      rec(hot, m, iz * hot.n / nd.n, io, nd.f);
      rec(cold, m, iz * cold.n / nd.n, 0, nd.f);
    };
    rec(root, [], 1, 1, -1);
  }
  const treeMean = nd => !nd.l ? nd.v : (nd.l.n * treeMean(nd.l) + nd.r.n * treeMean(nd.r)) / nd.n;
  // SHAP values of every row: RF in probability units, gradient boosting in log-odds units; base + sum(phi) = model output
  function shapRF(R, X) { const p = X[0].length; return { base: R.trees.reduce((s, t) => s + treeMean(t), 0) / R.T, phi: X.map(x => { const phi = new Array(p).fill(0); R.trees.forEach(t => treeShap(t, x, phi, 1 / R.T)); return phi; }) }; }
  function shapGB(B, X) { const p = X[0].length; return { base: B.trees.reduce((s, t) => s + treeMean(t), B.f0), phi: X.map(x => { const phi = new Array(p).fill(0); B.trees.forEach(t => treeShap(t, x, phi, 1)); return phi; }) }; }

  // simulated demo sample (deterministic)
  let reDemoCache = null;
  function reDemo() {
    if (reDemoCache) return reDemoCache;
    const rnd = F.rng(2026), N = F.normalGen(rnd), cl = (x, a, b) => Math.min(b, Math.max(a, x)), rows = [];
    const make = (i, d, status) => {
      const ta = Math.exp((d ? Math.log(55e6) : Math.log(160e6)) + (d ? 1.1 : 1.2) * N());
      const bl = d ? Math.exp(Math.log(0.42) + 0.75 * N()) - 0.12 : Math.exp(Math.log(0.9) + 0.65 * N());
      const tl = ta / (1 + Math.max(-0.6, bl));
      const caR = cl(0.45 + 0.13 * N(), 0.1, 0.9), wcR = d ? 0.01 + 0.16 * N() : 0.11 + 0.14 * N();
      const ca = caR * ta, cLiab = Math.max(0.03 * ta, ca - wcR * ta);
      const reR = d ? -0.09 + 0.22 * N() : 0.07 + 0.16 * N();
      const ebitR = d ? 0.012 + 0.06 * N() : 0.055 + 0.05 * N();
      const sales = ta * cl((d ? 0.68 : 0.74) + 0.33 * N(), 0.05, 2.5);
      const mve = tl * Math.exp((d ? Math.log(0.25) : Math.log(0.7)) + 0.8 * N());
      const ebit = ebitR * ta, pre = ebit - 0.045 * tl, ni = pre > 0 ? 0.76 * pre : pre;
      const nip = ta * (d ? -0.01 + 0.055 * N() : 0.03 + 0.045 * N());
      const ffo = ni + ta * (0.03 + 0.012 * N());
      const r = x => Math.round(x);
      rows.push({ 'Firm': (status === '' ? 'New firm ' : 'Firm GR-') + String(i).padStart(3, '0'), 'Year': 2021 + Math.floor(rnd() * 5), 'Status': status, 'Total Assets': r(ta), 'Total Liabilities': r(tl), 'Current Assets': r(ca), 'Current Liabilities': r(cLiab), 'Retained Earnings': r(reR * ta), 'EBIT': r(ebit), 'Sales': r(sales), 'Market Value of Equity': r(mve), 'Book Value of Equity': r(ta - tl), 'Net Income': r(ni), 'Net Income Prev': r(nip), 'Funds from Operations': r(ffo) });
    };
    for (let i = 1; i <= 150; i++) { const d = i % 3 === 0; make(i, d, d ? 1 : 0); }
    for (let i = 1; i <= 6; i++) make(i, i % 2 === 0, '');
    reDemoCache = rows; return rows;
  }

  TOOLS.push({
    id: 'reestimate', cat: 'distress', icon: 'lab', title: 'Re-estimate Distress Models on Your Sample', short: 'Re-estimate Weights', isNew: true,
    desc: 'Estimate country-specific Altman-type (discriminant) and Ohlson-type (logit) weights on your own firms, compare them with random forest and gradient boosting, and explain the models with SHAP.',
    long: 'Altman\'s weights come from US manufacturers of 1946-1965 and Ohlson\'s from US firms of 1970-1976. Here you estimate the weights on your own sample (for example Greek listed firms): linear discriminant analysis (Altman style) and logit (Ohlson style), compared with two machine learning models, random forest and XGBoost-style gradient boosting, explained with SHAP values. The sample is split into a training set, with k-fold cross-validation for model selection, and a hold-out test set that is used once at the end. Compare the results with the original weights.',
    inputs: [
      { id: 'data', label: 'Estimation sample (Excel or CSV)', type: 'file', optional: true, accept: '.xlsx,.xls,.csv',
        hint: 'One row per firm (or firm-year) with a Status column: 1 = distressed / failed, 0 = healthy. Rows with an empty Status are scored with the estimated models. Amounts in currency units (not millions). Without a file the simulated demo sample is used.',
        demo: { label: 'Demo sample', name: 'Simulated demo sample (150 firms + 6 unlabeled, not real data)', rows: reDemo, auto: true },
        template: { name: '4FinanceLab_Reestimation_template.xlsx', columns: ['Firm', 'Year', 'Status', 'Total Assets', 'Total Liabilities', 'Current Assets', 'Current Liabilities', 'Retained Earnings', 'EBIT', 'Sales', 'Market Value of Equity', 'Book Value of Equity', 'Net Income', 'Net Income Prev', 'Funds from Operations', 'GNP Index'],
          rows: [['Alpha SA', 2024, 0, 1000000, 600000, 450000, 250000, 300000, 150000, 1800000, 1200000, 400000, 90000, 80000, 120000, ''], ['Beta SA', 2024, 1, 500000, 520000, 150000, 210000, -140000, -15000, 400000, 30000, -20000, -45000, -30000, -10000, ''], ['Gamma SA', 2025, '', 800000, 500000, 300000, 200000, 120000, 40000, 900000, 350000, 300000, 20000, 15000, 60000, '']] } },
      { id: 'ycol', label: 'Status column', type: 'colpick', from: 'data', auto: reAutoStatus, value: '', hint: '1 = distressed, 0 = healthy (also yes / no, failed / healthy). Detected automatically when the column is called Status, Failed, Default, Bankrupt or Distress.' },
      { id: 'preset', label: 'Variables', type: 'seg', value: 'altman', options: [['altman', "Altman's 5 ratios"], ['ohlson', "Ohlson's 9"], ['custom', 'Choose columns']] },
      { id: 'x4eq', label: 'Equity in X4', type: 'select', value: 'market', options: [['market', 'Market value (as in Z, listed firms)'], ['book', "Book value (as in Z', private firms)"]], showIf: v => v.preset === 'altman' },
      { id: 'xcols', label: 'Variables to use', type: 'colpick', multi: true, from: 'data', value: '[]', showIf: v => v.preset === 'custom', hint: 'Ticked columns are used as they are, so compute the ratios in Excel first.' },
      { id: 'rule', label: 'Cut-off rule', type: 'select', value: 'youden', options: [['youden', 'Balanced: max sensitivity + specificity (Youden)'], ['accuracy', 'Max overall accuracy'], ['conventional', 'Conventional: LDA midpoint, logit 50%']], hint: 'The cut-off is chosen on the data each model is fitted on, never on the validation fold or the test set.' },
      { id: 'ml', label: 'Models', type: 'select', value: 'on', options: [['on', 'LDA, logit, random forest and gradient boosting'], ['off', 'LDA and logit only (faster)']], hint: 'Random forest and gradient boosting (XGBoost-style) predict distress without coefficients; SHAP values show which ratios drive them.' },
      { id: 'testPct', label: 'Hold-out test set', unit: '% of sample', value: 20, step: 5, min: 0, max: 50, hint: 'Stratified by status. 0 = no test set.' },
      { id: 'k', label: 'Cross-validation folds k', unit: 'training set', value: 4, step: 1, min: 0, max: 10, hint: '0 = no cross-validation.' },
      { id: 'seed', label: 'Random seed', value: 42, step: 1, hint: 'Same seed = same split and folds.' }
    ],
    compute(v) {
      const warnings = [];
      let raw = v.data;
      if (!(Array.isArray(raw) && raw.length)) { raw = reDemo(); warnings.push('Using the <b>simulated demo sample</b> (150 firms, one third distressed, plus 6 unlabeled firms; not real data). Upload your own Excel or CSV file to estimate the weights for your firms; download the template for the column names.'); }
      const D = rePrepare(raw, v); if (D.error) return { error: D.error };
      warnings.push(...D.notes);
      const lab = D.lab, p = D.names.length, ml = v.ml !== 'off';
      const nD = lab.filter(o => o.y === 1).length, nH = lab.length - nD;
      if (!p) return { error: 'No usable variables left.' };
      if (nD < 5 || nH < 5) return { error: `Too few firms: ${nD} distressed and ${nH} healthy with complete data. You need at least 5 of each (and ideally 30 or more).` };
      const frac = Math.min(0.5, Math.max(0, (isFinite(v.testPct) ? v.testPct : 20) / 100));
      let k = Math.round(isFinite(v.k) ? v.k : 4); if (k < 2) k = 0; k = Math.min(10, k);
      const seed = Math.round(v.seed) || 1;
      const yAll = lab.map(o => o.y); const sp = reSplit(yAll, frac, k, seed);
      lab.forEach((o, i) => { o.set = sp.set[i]; o.fold = sp.fold[i]; });
      const tr = lab.filter(o => o.set === 'train'), te = lab.filter(o => o.set === 'test');
      const trD = tr.filter(o => o.y === 1).length, trH = tr.length - trD;
      if (k && Math.min(trD, trH) < 2 * k) { const k2 = Math.max(0, Math.min(k, Math.floor(Math.min(trD, trH) / 2))); warnings.push(`Only ${Math.min(trD, trH)} firms in the smaller group of the training set, so k was reduced from ${k} to ${k2 < 2 ? 'no cross-validation' : k2}.`); k = k2 < 2 ? 0 : k2; const sp2 = reSplit(yAll, frac, k, seed); lab.forEach((o, i) => { o.fold = sp2.fold[i]; }); }
      if (tr.length <= p + 2) return { error: `The training set (${tr.length} firms) must have more firms than variables (${p}) plus 2. Lower the test share or use fewer variables.` };
      if (p > Math.min(trD, trH) / 3) warnings.push(`With ${p} variables and only ${Math.min(trD, trH)} firms in the smaller group, the estimates may overfit. A common rule of thumb is at least 10 firms per variable in the smaller group.`);

      // the models: distress score s(x) (higher = more likely distressed) and its cut-off cutS
      const MODELS = [
        { key: 'lda', name: 'Discriminant (LDA)', short: 'LDA', col: 0 },
        { key: 'logit', name: 'Logit', short: 'Logit', col: 1 }
      ].concat(ml ? [{ key: 'rf', name: 'Random forest', short: 'RF', col: 2 }, { key: 'gb', name: 'Gradient boosting (XGBoost-style)', short: 'GB', col: 3 }] : []);
      const fitAll = (X, y, s) => {
        const M = fitBoth(X, y, rule); if (M.error) return M;
        const out = { lda: { m: M.L, s: x => -M.L.Z(x), cutS: M.L.cutS }, logit: { m: M.G, s: M.G.P, cutS: M.G.cut } };
        if (ml) { const R = rfFit(X, y, s, rule), B = gbFit(X, y, s, rule); out.rf = { m: R, s: R.P, cutS: R.cut }; out.gb = { m: B, s: B.P, cutS: B.cut }; }
        return out;
      };

      // ---- k-fold cross-validation on the training set ----
      const rule = v.rule || 'youden', cv = [];
      for (let f = 1; f <= k; f++) {
        const fit = tr.filter(o => o.fold !== f), val = tr.filter(o => o.fold === f);
        const M = fitAll(fit.map(o => o.x), fit.map(o => o.y), seed + f); if (M.error) return { error: M.error };
        const yv = val.map(o => o.y), e = {};
        MODELS.forEach(md => { e[md.key] = evalAt(val.map(o => M[md.key].s(o.x)), yv, M[md.key].cutS); });
        cv.push({ f, n: val.length, nD: yv.filter(x => x === 1).length, e });
      }
      const avg = a => { const b = a.filter(isFinite); return b.length ? b.reduce((s, x) => s + x, 0) / b.length : NaN; };
      const cvS = {}; MODELS.forEach(md => { cvS[md.key] = { auc: avg(cv.map(c => c.e[md.key].auc)), acc: avg(cv.map(c => c.e[md.key].acc)) }; });
      let pick = null;
      if (k) MODELS.forEach(md => { const a = cvS[md.key], b = pick && cvS[pick]; if (!b || a.auc > b.auc + 1e-12 || (Math.abs(a.auc - b.auc) <= 1e-12 && a.acc > b.acc)) pick = md.key; });
      const nameOf = key => MODELS.find(md => md.key === key).name;

      // ---- final fit on the whole training set ----
      const FM = fitAll(tr.map(o => o.x), tr.map(o => o.y), seed); if (FM.error) return { error: FM.error };
      const L = FM.lda.m, G = FM.logit.m;
      if (G.penalized) warnings.push('Logit: the groups are (almost) perfectly separated, so maximum-likelihood coefficients do not exist (they tend to infinity). The logit shown uses a small ridge penalty (λ = 1 on standardized variables); standard errors and p-values are omitted. Try fewer variables or a larger sample.');
      const O = D.orig;
      const origScore = O ? (o => { const x = o.xAll; return O.sym === 'O' ? 1 / (1 + Math.exp(-(O.b0 + x.reduce((s, xi, j) => s + xi * O.w[j], 0)))) : -x.reduce((s, xi, j) => s + xi * O.w[j], 0); }) : null;
      const origCutS = O ? (O.sym === 'O' ? O.cut : -O.cut) : null;
      const evalSet = te.length ? te : tr, evalName = te.length ? 'hold-out test set' : 'training set (in-sample, optimistic)';
      if (!te.length) warnings.push('No hold-out test set: the results below are in-sample and overstate how well the models classify new firms' + (ml ? ' (random forest and gradient boosting fit the training set almost perfectly)' : '') + '.');
      const yE = evalSet.map(o => o.y), sE = {}, E = {};
      MODELS.forEach(md => { sE[md.key] = evalSet.map(o => FM[md.key].s(o.x)); E[md.key] = evalAt(sE[md.key], yE, FM[md.key].cutS); });
      const sOE = O ? evalSet.map(origScore) : null, eO = O ? evalAt(sOE, yE, origCutS) : null;
      const eL = E.lda, eG = E.logit, selE = pick ? E[pick] : null, selName = pick ? nameOf(pick) : '';

      // ---- SHAP: what drives each model's predictions on the evaluation set ----
      const Xe = evalSet.map(o => o.x), trMean = D.names.map((_, j) => tr.reduce((s, o) => s + o.x[j], 0) / tr.length);
      const SH = {
        lda: Xe.map(x => x.map((xi, j) => L.c[j] * (xi - trMean[j]))),
        logit: Xe.map(x => x.map((xi, j) => G.b[j + 1] * (xi - trMean[j])))
      };
      if (ml) { SH.rf = shapRF(FM.rf.m, Xe).phi; SH.gb = shapGB(FM.gb.m, Xe).phi; }
      const imp = {}; MODELS.forEach(md => { const mabs = D.names.map((_, j) => SH[md.key].reduce((s, r) => s + Math.abs(r[j]), 0) / Xe.length), tot = mabs.reduce((a, b) => a + b, 0) || 1; imp[md.key] = { mabs, share: mabs.map(x => x / tot) }; });
      const rankOf = arr => arr.map(x => 1 + arr.filter(y => y > x + 1e-15).length);

      // ---- univariate statistics (training set) ----
      const univ = D.names.map((nm, j) => {
        const a = tr.filter(o => o.y === 0).map(o => o.x[j]), b = tr.filter(o => o.y === 1).map(o => o.x[j]);
        const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
        const ss = a.reduce((s, x) => s + (x - ma) ** 2, 0) + b.reduce((s, x) => s + (x - mb) ** 2, 0), sp2 = ss / (a.length + b.length - 2);
        const Fv = (ma - mb) ** 2 / (sp2 * (1 / a.length + 1 / b.length));
        return [nm, D.descs[j], ma, mb, Fv, fPval(Fv, 1, a.length + b.length - 2)];
      });

      // ---- tables ----
      const ow = O ? (O.keep ? O.w.filter((_, j) => O.keep[j]) : O.w) : null;
      const ldaRows = D.names.map((nm, j) => [nm, D.descs[j], L.c[j], L.std[j]].concat(O && O.sym !== 'O' ? [ow[j]] : []));
      const ldaCols = [{ h: 'Var', num: false }, { h: 'Description', num: false }, { h: 'Coefficient (your sample)', fmt: x => sigT(x, 4) }, { h: 'Standardized', fmt: x => num(x, 3) }].concat(O && O.sym !== 'O' ? [{ h: 'Original ' + O.sym + ' weight', fmt: x => num(x, 3) }] : []);
      const blank = O && O.sym !== 'O' ? [''] : [];
      ldaRows.push(['', '<b>Cut-off</b> (Z below = distressed)', L.cut, ''].concat(O && O.sym !== 'O' ? [O.cut] : []));
      ldaRows.push(['', 'Group centroid: healthy', L.cH, ''].concat(blank), ['', 'Group centroid: distressed', L.cD, ''].concat(blank));
      ldaRows.push(['', 'Zone of ignorance (training set)', L.ziLo < L.ziHi ? `${num(L.ziLo, 3)} to ${num(L.ziHi, 3)}` : 'none (groups separated)', ''].concat(blank));
      const gRows = [['Intercept', 'Constant']].concat(D.names.map((nm, j) => [nm, D.descs[j]])).map((r, j) => r.concat([G.b[j], G.penalized ? '' : G.se[j], G.penalized ? '' : G.z[j], G.penalized ? '' : pvTxt(G.pz[j]) + ' ' + stars(G.pz[j]), j ? Math.exp(G.b[j]) : '', j ? G.std[j - 1] : '']).concat(O && O.sym === 'O' ? [j ? ow[j - 1] : O.b0] : []));
      const gCols = [{ h: 'Var', num: false }, { h: 'Description', num: false }, { h: 'Coefficient', fmt: x => sigT(x, 4) }, { h: 'Std. error', fmt: x => sigT(x, 4) }, { h: 'z', fmt: x => num(x, 3) }, { h: 'p-value', num: false }, { h: 'Odds ratio', fmt: x => sigT(x, 4) }, { h: 'Standardized', fmt: x => num(x, 3) }].concat(O && O.sym === 'O' ? [{ h: 'Original Ohlson', fmt: x => num(x, 4) }] : []);
      const fmtE = e => [e.acc, e.t1, e.t2, e.auc];
      const cutTxt = md => md.key === 'lda' ? 'Z < ' + num(L.cut, 3) : 'P ≥ ' + pct(FM[md.key].cutS, 1);
      const perfRows = MODELS.map(md => [md.name, cutTxt(md)].concat(fmtE(E[md.key])));
      if (O) perfRows.push(['Original ' + O.name, (O.sym === 'O' ? 'P ≥ ' : O.sym + ' < ') + O.cutTxt].concat(fmtE(eO)));
      const pc = x => pct(x, 1);
      const perfCols = [{ h: 'Model', num: false }, { h: 'Cut-off', num: false }, { h: 'Accuracy', fmt: pc }, { h: 'Type I error', fmt: pc }, { h: 'Type II error', fmt: pc }, { h: 'AUC', fmt: x => num(x, 3) }];
      const conf = MODELS.map(md => [md.name, E[md.key].tp, E[md.key].fn, E[md.key].fp, E[md.key].tn]);
      if (O) conf.push(['Original ' + O.name, eO.tp, eO.fn, eO.fp, eO.tn]);
      const nDE = eL.tp + eL.fn, nHE = eL.fp + eL.tn, c0 = x => num(x, 0);
      const confCols = [{ h: 'Model', num: false }, { h: `Distressed caught (of ${nDE})`, fmt: c0 }, { h: 'Distressed missed (Type I)', fmt: c0 }, { h: `Healthy flagged (Type II, of ${nHE})`, fmt: c0 }, { h: 'Healthy correct', fmt: c0 }];
      const cvRows = MODELS.map(md => [md.name].concat(cv.map(c => c.e[md.key].auc), [cvS[md.key].auc, cvS[md.key].acc]));
      const cvCols = [{ h: 'Model', num: false }].concat(cv.map(c => ({ h: `Fold ${c.f} AUC`, fmt: x => num(x, 3) })), [{ h: '<b>CV AUC</b>', fmt: x => num(x, 3) }, { h: 'CV accuracy', fmt: pc }]);
      const cls = (pd) => pd ? 'Distressed' : 'Healthy';
      const scored = lab.map(o => ({ o, set: o.set === 'test' ? 'Test' : 'Training', fold: o.set === 'test' ? '' : (o.fold ? String(o.fold) : ''), st: o.y ? '1' : '0' })).concat(D.unl.map(o => ({ o, set: 'Unlabeled', fold: '', st: '' })));
      const scRows = scored.map(({ o, set, fold, st }) => { const z = L.Z(o.x), pr = G.P(o.x); const row = [o.firm, o.year, st, set, fold, z, cls(z < L.cut), pr, cls(pr >= G.cut)];
        if (ml) { const pf = FM.rf.s(o.x), pb = FM.gb.s(o.x); row.push(pf, cls(pf >= FM.rf.cutS), pb, cls(pb >= FM.gb.cutS)); }
        return row.concat(O ? [O.sym === 'O' ? origScore(o) : -origScore(o)] : []); });
      const scCols = [{ h: 'Firm', num: false }, { h: 'Year', num: false }, { h: 'Status', num: false }, { h: 'Set', num: false }, { h: 'Fold', num: false }, { h: 'LDA Z', fmt: x => num(x, 3) }, { h: 'LDA class', num: false }, { h: 'Logit P(distress)', fmt: x => pct(x, 1) }, { h: 'Logit class', num: false }]
        .concat(ml ? [{ h: 'RF P(distress)', fmt: x => pct(x, 1) }, { h: 'RF class', num: false }, { h: 'GB P(distress)', fmt: x => pct(x, 1) }, { h: 'GB class', num: false }] : [])
        .concat(O ? [{ h: 'Original ' + O.sym, fmt: x => O.sym === 'O' ? pct(x, 1) : num(x, 3) }] : []);
      const unlN = D.unl.length;
      const impRows = D.names.map((nm, j) => [nm, D.descs[j]].concat(...MODELS.map(md => [imp[md.key].share[j], rankOf(imp[md.key].share)[j]])));
      const impCols = [{ h: 'Var', num: false }, { h: 'Description', num: false }].concat(...MODELS.map(md => [{ h: md.short + ' share', fmt: x => pct(x, 1) }, { h: md.short + ' rank', fmt: x => num(x, 0) }]));

      const sumTxt = `${lab.length} firms: ${nD} distressed, ${nH} healthy`;
      const kpis = [
        { k: 'Sample', v: `${lab.length} firms`, s: `${nD} distressed, ${nH} healthy · training ${tr.length}, test ${te.length}${unlN ? ', unlabeled ' + unlN : ''}` },
        k ? { k: 'CV score (AUC)', v: MODELS.map(md => num(cvS[md.key].auc, 3)).join(' / '), s: MODELS.map(md => md.short).join(' / ') + `, average of ${k} validation folds` } : { k: 'Cross-validation', v: 'off', s: 'Set k ≥ 2 to compare the models by CV score' },
        k ? { k: 'Selected model', v: selName, s: 'Highest CV score (AUC), refitted on the whole training set', cls: 'good' } : null,
        { k: (te.length ? 'Hold-out test' : 'In-sample') + (selE ? ': ' + MODELS.find(md => md.key === pick).short : ''), v: selE ? `${pct(selE.acc, 1)} accuracy` : MODELS.map(md => pct(E[md.key].acc, 0)).join(' / '), s: selE ? `AUC ${num(selE.auc, 3)} · Type I ${pct(selE.t1, 1)} · Type II ${pct(selE.t2, 1)}` : 'accuracy, ' + MODELS.map(md => md.short).join(' / ') },
        O ? { k: 'Original ' + O.sym + ' on the same firms', v: `${pct(eO.acc, 1)} accuracy`, s: `AUC ${num(eO.auc, 3)} · Type I ${pct(eO.t1, 1)} · cut-off ${O.cutTxt}`, cls: selE ? (eO.acc + 1e-9 < selE.acc ? 'warn' : 'good') : '' } : null
      ].filter(Boolean);

      const eqTxt = 'Z = ' + D.names.map((nm, j) => (j ? (L.c[j] < 0 ? ' − ' : ' + ') : (L.c[j] < 0 ? '−' : '')) + sig(Math.abs(L.c[j]), 3) + '·' + nm).join('');
      const pTxt = 'P(distress) = 1 / (1 + e<sup>−y</sup>), &nbsp;y = ' + sig(G.b[0], 3) + D.names.map((nm, j) => (G.b[j + 1] < 0 ? ' − ' : ' + ') + sig(Math.abs(G.b[j + 1]), 3) + '·' + nm).join('');
      const html = `<div class="panel"><div class="panel-h"><h3>Estimated models (training set, ${tr.length} firms)</h3></div><div class="panel-b">
        <div class="formula">${eqTxt} &nbsp;&nbsp;→ distressed if Z &lt; ${num(L.cut, 3)}</div>
        <div class="formula" style="margin-top:8px">${pTxt} &nbsp;&nbsp;→ distressed if P ≥ ${pct(G.cut, 1)}</div>
        <div class="note" style="margin-top:8px">Like Altman's Z, a higher LDA score means a healthier firm. The logit gives the probability of distress, like Ohlson's O-score.${ml ? ` Random forest (${FM.rf.m.T} trees) and gradient boosting (${FM.gb.m.R} trees) have no equation: they give a probability of distress (cut-offs ${pct(FM.rf.cutS, 1)} and ${pct(FM.gb.cutS, 1)}), and the SHAP chart below shows which ratios drive them.` : ''}</div></div></div>`;

      // ---- charts ----
      const charts = [{
        id: 'roc', title: 'ROC curves on the ' + evalName,
        note: 'Each curve shows the share of distressed firms caught (true positive rate) against the share of healthy firms flagged (false positive rate) over all cut-offs. AUC = area under the curve (0.5 = coin flip, 1 = perfect).',
        build: T => ({ type: 'line', data: { datasets: MODELS.map(md => ds(md.short + ' (AUC ' + num(E[md.key].auc, 3) + ')', roc(sE[md.key], yE), T.c[md.col], { borderWidth: 2.5 }))
          .concat(O ? [ds('Original ' + O.sym + ' (AUC ' + num(eO.auc, 3) + ')', roc(sOE, yE), T.c[4], { borderWidth: 2, borderDash: [5, 4] })] : []).concat([ds('Random (0.5)', [{ x: 0, y: 0 }, { x: 1, y: 1 }], T.muted, { borderWidth: 1, borderDash: [3, 3] })]) },
          options: lineOpts(T, { xTitle: 'False positive rate (1 − specificity)', yTitle: 'True positive rate (sensitivity)', xMin: 0, xMax: 1, yMin: 0, yMax: 1, xFmt: x => num(x, 2), yFmt: x => num(x, 2) }) })
      }];
      if (k) charts.push({
        id: 'cvfolds', title: 'Cross-validation: AUC on each validation fold',
        note: 'Each model is fitted on k − 1 folds of the training set and scored on the held-out validation fold. CV score (average): ' + MODELS.map(md => md.short + ' ' + num(cvS[md.key].auc, 3)).join(', ') + '.',
        exportData: () => ({ columns: ['Validation fold', 'Firms'].concat(MODELS.map(md => md.short + ' AUC')), rows: cv.map(c => [c.f, c.n].concat(MODELS.map(md => c.e[md.key].auc))) }),
        build: T => ({ type: 'bar', data: { labels: cv.map(c => 'Fold ' + c.f), datasets: MODELS.map(md => ({ label: md.short, data: cv.map(c => c.e[md.key].auc), backgroundColor: T.alpha(T.c[md.col], .85), borderRadius: 5 })) },
          options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': AUC ' + num(c.parsed.y, 3) } } }, scales: { x: { grid: { display: false } }, y: { min: Math.max(0, Math.floor(Math.min(...cv.flatMap(c => MODELS.map(md => c.e[md.key].auc)).filter(isFinite)) * 10 - 1) / 10), max: 1, grid: { color: T.grid } } } } })
      });
      charts.push({
        id: 'shap', title: 'What drives the predictions: share of mean |SHAP| by variable (' + evalName + ')',
        note: 'SHAP splits each firm\'s prediction into the contribution of every ratio. Bars = each variable\'s share of the average absolute contribution, so the models are comparable even though their scores are on different scales. ' + (ml ? 'Random forest and gradient boosting use exact TreeSHAP; ' : '') + 'LDA and logit use the linear SHAP value coefficient × (value − training mean).',
        exportData: () => ({ columns: ['Variable'].concat(MODELS.map(md => md.short + ' share of mean |SHAP|')), rows: D.names.map((nm, j) => [nm].concat(MODELS.map(md => imp[md.key].share[j]))) }),
        build: T => ({ type: 'bar', data: { labels: D.names, datasets: MODELS.map(md => ({ label: md.short, data: imp[md.key].share, backgroundColor: T.alpha(T.c[md.col], .85), borderRadius: 4 })) },
          options: { indexAxis: 'y', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + pct(c.parsed.x, 1) } } }, scales: { x: { grid: { color: T.grid }, ticks: { callback: x => pct(x, 0) } }, y: { grid: { display: false } } } } })
      });
      const zTr = tr.map(o => L.Z(o.x)); const zSorted = zTr.slice().sort((a, b) => a - b);
      const lo = F.quantileSorted(zSorted, 0.01), hi = F.quantileSorted(zSorted, 0.99), nb = 24, bw = (hi - lo) / nb || 1;
      const bins = Array.from({ length: nb }, (_, i) => lo + (i + 0.5) * bw);
      const cnt = c => bins.map((_, i) => tr.filter((o, k2) => o.y === c && Math.min(nb - 1, Math.max(0, Math.floor((zTr[k2] - lo) / bw))) === i).length);
      const hH = cnt(0), hD = cnt(1);
      charts.push({
        id: 'zdist', title: 'LDA score distribution by group (training set)',
        note: 'Healthy firms should sit to the right of the cut-off and distressed firms to the left. The overlap is the zone where misclassification happens (scores beyond the 1st and 99th percentiles are put in the end bins).',
        exportData: () => ({ columns: ['Bin centre (Z)', 'Healthy', 'Distressed'], rows: bins.map((b, i) => [b, hH[i], hD[i]]) }),
        build: T => ({ type: 'bar', data: { datasets: [{ label: 'Healthy', data: bins.map((b, i) => ({ x: b, y: hH[i] })), backgroundColor: T.alpha(T.good, .7), barPercentage: 1, categoryPercentage: 1, grouped: false }, { label: 'Distressed', data: bins.map((b, i) => ({ x: b, y: hD[i] })), backgroundColor: T.alpha(T.bad, .6), barPercentage: 1, categoryPercentage: 1, grouped: false }] },
          options: { parsing: true, scales: { x: { type: 'linear', offset: false, min: lo, max: hi, title: { display: true, text: 'LDA score Z' }, grid: { color: T.grid }, ticks: { callback: x => num(x, 1) } }, y: { beginAtZero: true, title: { display: true, text: 'Firms' }, grid: { color: T.grid }, ticks: { precision: 0 } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { title: it => 'Z ≈ ' + num(it[0].parsed.x, 2), label: c => ' ' + c.dataset.label + ': ' + c.parsed.y } }, vlines: { lines: [{ x: L.cut, color: T.text, label: 'cut-off ' + num(L.cut, 2) }] } } } })
      });
      charts.push({
        id: 'stdcoef', title: 'LDA and logit: standardized coefficients',
        note: 'Coefficients per one standard deviation of each variable, so they are comparable across variables. LDA: positive = healthier. Logit: positive = more likely distressed (opposite sign convention).',
        exportData: () => ({ columns: ['Variable', 'LDA standardized', 'Logit standardized'], rows: D.names.map((nm, j) => [nm, L.std[j], G.std[j]]) }),
        build: T => ({ type: 'bar', data: { labels: D.names, datasets: [{ label: 'LDA (+ = healthier)', data: L.std, backgroundColor: T.alpha(T.c[0], .85), borderRadius: 5 }, { label: 'Logit (+ = more distress)', data: G.std, backgroundColor: T.alpha(T.c[1], .85), borderRadius: 5 }] },
          options: { indexAxis: 'y', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + num(c.parsed.x, 3) } } }, scales: { x: { grid: { color: T.grid } }, y: { grid: { display: false } } } } })
      });

      const tables = [
        { id: 'perf', title: 'Classification results on the ' + evalName + ` (${evalSet.length} firms)`, columns: perfCols, rows: perfRows, hl: pick ? [MODELS.findIndex(md => md.key === pick)] : [],
          note: 'Type I error: a distressed firm classified as healthy (the costly mistake for a lender). Type II error: a healthy firm classified as distressed. ' + (te.length ? 'The test set was not used for estimation, cut-offs or model selection.' : '') + (O ? ' The original model uses its published weights and cut-off, with no re-estimation.' : '') },
        { id: 'confusion', title: 'Confusion matrices (' + evalName + ')', columns: confCols, rows: conf },
        { id: 'shapimp', title: 'Variable importance: share of mean |SHAP| and rank', columns: impCols, rows: impRows, note: 'Rank 1 = the variable that moves that model\'s predictions most. If the rankings agree across models, the evidence on which ratios matter is robust; if the trees rank a variable much higher than LDA or logit, its effect is probably non-linear or works through interactions.' },
        { id: 'lda', title: 'Discriminant function (LDA), estimated on the training set', columns: ldaCols, rows: ldaRows, hl: [p],
          note: `Wilks' Λ = ${num(L.wilks, 4)}, F(${L.df1}, ${L.df2}) = ${num(L.F, 3)}, p ${L.pF < 0.0001 ? '< 0.0001' : '= ' + num(L.pF, 4)}; canonical correlation ${num(L.canon, 3)}; Mahalanobis D² = ${num(L.D2, 3)}. Coefficients are scaled so that the within-group standard deviation of Z is 1 (no constant, as in Altman's Z).` },
        { id: 'logit', title: 'Logit model, estimated on the training set', columns: gCols, rows: gRows,
          note: `Log-likelihood ${num(G.ll, 3)} (null ${num(G.ll0, 3)}); LR χ²(${p}) = ${num(G.LR, 3)}, p ${G.pLR < 0.0001 ? '< 0.0001' : '= ' + num(G.pLR, 4)}; McFadden R² = ${num(G.r2, 3)}; AIC = ${num(G.aic, 2)}. *** p &lt; 0.01, ** p &lt; 0.05, * p &lt; 0.1. Odds ratio = change in the odds of distress for a one-unit increase in the variable.` + (G.penalized ? ' Ridge-penalized estimates (separation).' : '') },
        { id: 'univ', title: 'Variable means by group and univariate F-tests (training set)', columns: [{ h: 'Var', num: false }, { h: 'Description', num: false }, { h: 'Mean healthy', fmt: x => num(x, 4) }, { h: 'Mean distressed', fmt: x => num(x, 4) }, { h: 'F(1, n−2)', fmt: x => num(x, 2) }, { h: 'p-value', fmt: pvTxt }], rows: univ,
          note: 'As in Altman (1968, Table 1): a large F means the variable separates the two groups well on its own.' }
      ];
      if (k) tables.splice(2, 0, { id: 'cv', title: `${k}-fold cross-validation on the training set`, columns: cvCols, rows: cvRows, hl: pick ? [MODELS.findIndex(md => md.key === pick)] : [], note: 'Each validation fold is scored by models fitted on the other ' + (k - 1) + ' folds (cut-offs chosen on those folds). CV score = the average over the validation folds; the model with the highest CV AUC (highlighted) is selected and then refitted on the whole training set.' });
      tables.push({ id: 'scored', title: `Scored firms (${scRows.length}${unlN ? ', including ' + unlN + ' unlabeled' : ''})`, columns: scCols, rows: scRows,
        note: 'Scores from the final models fitted on the training set. Fold = the validation fold the firm belonged to in cross-validation. Unlabeled firms (empty Status) are classified with the estimated cut-offs.' });

      let sn = 0; const S = () => ++sn + '. ';
      const steps = [
        { h: S() + 'Sample and split', f: [`Hold-out test set: ${pct(frac, 0)} of the firms, drawn at random within each group (stratified), seed ${seed}. It is used once, at the end.`, `Training set: the remaining ${tr.length} firms` + (k ? `, split into ${k} folds (stratified).` : '.')], calc: `${sumTxt}\nTraining: ${tr.length} (${trD} distressed) · Test: ${te.length} (${te.filter(o => o.y === 1).length} distressed)${unlN ? ' · Unlabeled: ' + unlN : ''}` },
        { h: S() + 'Discriminant analysis (Fisher LDA, Altman style)', f: ['c = S<sub>W</sub><sup>−1</sup> (x̄<sub>healthy</sub> − x̄<sub>distressed</sub>), scaled so that the within-group SD of Z is 1', 'Z = c<sub>1</sub>X<sub>1</sub> + … + c<sub>p</sub>X<sub>p</sub>; conventional cut-off = midpoint of the two group centroids'], calc: eqTxt.replace(/<sup>(.*?)<\/sup>/g, '^$1') + `\nCentroids: healthy ${num(L.cH, 3)}, distressed ${num(L.cD, 3)} → midpoint ${num(L.mid, 3)}; cut-off used ${num(L.cut, 3)}`, note: 'S<sub>W</sub> is the pooled within-group covariance matrix of the variables.' },
        { h: S() + 'Logit (maximum likelihood, Ohlson style)', f: ['P(distress) = 1 / (1 + e<sup>−(b<sub>0</sub> + b<sub>1</sub>X<sub>1</sub> + … + b<sub>p</sub>X<sub>p</sub>)</sup>)', 'b maximizes ln L = Σ [y<sub>i</sub> ln P<sub>i</sub> + (1 − y<sub>i</sub>) ln(1 − P<sub>i</sub>)] (Newton-Raphson)'], calc: pTxt.replace(/&nbsp;/g, ' ').replace(/<sup>(.*?)<\/sup>/g, '^($1)').replace(/<[^>]+>/g, '') + `\nCut-off used ${pct(G.cut, 2)}` },
        ml ? { h: S() + 'Machine learning: random forest and gradient boosting', f: [`Random forest: ${FM.rf.m.T} classification trees, each grown on a bootstrap sample with ${FM.rf.m.opt.mtry} randomly chosen variables tried at each split (Gini), at most ${FM.rf.m.opt.maxDepth} levels, at least ${FM.rf.m.opt.minLeaf} firms per leaf; P(distress) = average of the trees`, `Gradient boosting (XGBoost-style): ${FM.gb.m.R} trees of depth ${FM.gb.m.opt.maxDepth} added one at a time, each fitted to the gradient and Hessian of the log-loss, learning rate ${FM.gb.m.lr}, L2 leaf penalty λ = ${FM.gb.m.lambda}, 80% row subsampling; P(distress) = 1 / (1 + e<sup>−(sum of trees)</sup>)`], calc: `Cut-offs: RF ${pct(FM.rf.cutS, 2)} (chosen on out-of-bag probabilities), GB ${pct(FM.gb.cutS, 2)} (chosen on inner 3-fold out-of-fold probabilities)`, note: 'Trees use the ratios as they are (no scaling) and can capture thresholds and interactions that a linear score cannot. They have no coefficients; SHAP values explain them. Gradient boosting here follows the XGBoost algorithm but is implemented in the browser, so results are close to, not identical with, the xgboost library.' } : null,
        { h: S() + 'Cut-off rule', f: [rule === 'youden' ? 'Choose the cut-off that maximizes sensitivity + specificity − 1 (Youden J), on the data the model was fitted on' : rule === 'accuracy' ? 'Choose the cut-off that maximizes overall accuracy on the data the model was fitted on' : 'LDA: midpoint of the group centroids (equal priors and costs). Logit' + (ml ? ', RF and GB' : '') + ': P = 50%.'], note: 'With unequal group sizes the balanced (Youden) rule avoids a cut-off that simply labels every firm healthy.' },
        k ? { h: S() + 'k-fold cross-validation (training set only)', f: ['For each fold j = 1…k: fit on the other k − 1 folds, score validation fold j', 'CV score = average of the k validation-fold scores; select the model with the highest CV AUC; refit it on the whole training set'], calc: MODELS.map(md => `${md.name}: CV AUC ${num(cvS[md.key].auc, 4)}, CV accuracy ${pct(cvS[md.key].acc, 2)}`).join('\n') + `\nSelected: ${selName}` } : null,
        { h: S() + 'Final evaluation on the ' + evalName, f: ['Accuracy = (TP + TN) / n; Type I error = FN / distressed; Type II error = FP / healthy', 'AUC = P(score of a random distressed firm > score of a random healthy firm)'], calc: MODELS.map(md => `${md.name}: accuracy ${pct(E[md.key].acc, 2)}, Type I ${pct(E[md.key].t1, 2)}, Type II ${pct(E[md.key].t2, 2)}, AUC ${num(E[md.key].auc, 4)}`).join('\n') + (O ? `\nOriginal ${O.sym}: accuracy ${pct(eO.acc, 2)}, Type I ${pct(eO.t1, 2)}, Type II ${pct(eO.t2, 2)}, AUC ${num(eO.auc, 4)}` : '') },
        { h: S() + 'Explaining the models with SHAP', f: ['f(x) = base value + φ<sub>1</sub> + … + φ<sub>p</sub>: each φ<sub>j</sub> is the Shapley value of variable j, its fair share of the gap between this firm\'s prediction and the average', 'Importance of variable j = average |φ<sub>j</sub>| over the ' + evalName + ', shown as a share of the total'], note: 'Trees: exact TreeSHAP (Lundberg et al.). LDA and logit: φ<sub>j</sub> = coefficient × (x<sub>j</sub> − training mean). SHAP shows what the model relies on, not what causes distress.' }
      ].filter(Boolean);
      return { warnings, kpis, html, charts, tables, steps,
        refs: 'Fisher, R. A. (1936). The use of multiple measurements in taxonomic problems. <i>Annals of Eugenics</i>, 7(2). Altman, E. I. (1968). Financial ratios, discriminant analysis and the prediction of corporate bankruptcy. <i>Journal of Finance</i>, 23(4). Ohlson, J. A. (1980). Financial ratios and the probabilistic prediction of bankruptcy. <i>Journal of Accounting Research</i>, 18(1). Altman, E. I., Iwanicz-Drozdowska, M., Laitinen, E. K. and Suvas, A. (2017). Financial distress prediction in an international context: a review and empirical analysis of Altman\'s Z-score model. <i>Journal of International Financial Management &amp; Accounting</i>, 28(2). Breiman, L. (2001). Random forests. <i>Machine Learning</i>, 45(1). Chen, T. and Guestrin, C. (2016). XGBoost: a scalable tree boosting system. <i>Proceedings of KDD 2016</i>. Lundberg, S. M., Erion, G. G. and Lee, S.-I. (2018). Consistent individualized feature attribution for tree ensembles. arXiv:1802.03888. Hanley, J. A. and McNeil, B. J. (1982). The meaning and use of the area under a ROC curve. <i>Radiology</i>, 143(1).' };
    }
  });

  window.FL_TOOLS = TOOLS;
  window.FL_LIB = { bondPrice, bsm };
})();
