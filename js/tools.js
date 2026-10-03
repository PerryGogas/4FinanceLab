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
    sml: '<path d="M3 21V3M3 21h18"/><path d="M5 17l14-10"/><circle cx="13" cy="10" r="1.6"/>'
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
     1. ALTMAN Z-SCORE
     ===================================================================== */
  const ALT = {
    public: { name: 'Z-Score (public manufacturing)', sym: 'Z', c: [1.2, 1.4, 3.3, 0.6, 1.0], lo: 1.81, hi: 2.99, eq: 'Market value of equity' },
    private: { name: "Z'-Score (private manufacturing)", sym: "Z'", c: [0.717, 0.847, 3.107, 0.420, 0.998], lo: 1.23, hi: 2.90, eq: 'Book value of equity' },
    non_mfg: { name: "Z''-Score (non-manufacturing / services)", sym: "Z''", c: [6.56, 3.26, 6.72, 1.05], lo: 1.10, hi: 2.60, eq: 'Book value of equity' }
  };
  TOOLS.push({
    id: 'altman', cat: 'distress', icon: 'gauge', title: 'Altman Z-Score Analyzer', short: 'Altman Z-Score',
    desc: 'Public (Z), private (Z\') and non-manufacturing (Z\'\') models with zone classification.',
    long: 'Altman\'s discriminant models for corporate distress: the original Z for public manufacturers (1968), Z\' for private firms and Z\'\' for non-manufacturing and service firms.',
    inputs: [
      { id: 'model', label: 'Model', type: 'seg', value: 'public', options: [['public', 'Z public'], ['private', "Z' private"], ['non_mfg', "Z'' non-mfg"]] },
      { id: 'ta', label: 'Total assets', unit: '$', value: 1000000 },
      { id: 'tl', label: 'Total liabilities', unit: '$', value: 600000 },
      { id: 'wc', label: 'Working capital', unit: '$', value: 200000, hint: 'Current assets minus current liabilities' },
      { id: 're', label: 'Retained earnings', unit: '$', value: 300000 },
      { id: 'ebit', label: 'EBIT', unit: '$', value: 150000 },
      { id: 'eq', label: 'Equity value', unit: '$', value: 1200000, hint: 'Market value of equity for Z; book value of equity for Z\' and Z\'\'' },
      { id: 'sales', label: 'Sales (revenue)', unit: '$', value: 1800000, showIf: v => v.model !== 'non_mfg' }
    ],
    compute(v) {
      if (v.ta <= 0 || v.tl <= 0) return { error: 'Total assets and total liabilities must be positive.' };
      const m = ALT[v.model];
      const X = [v.wc / v.ta, v.re / v.ta, v.ebit / v.ta, v.eq / v.tl, v.sales / v.ta].slice(0, m.c.length);
      const names = ['Working capital / Total assets', 'Retained earnings / Total assets', 'EBIT / Total assets', m.eq + ' / Total liabilities', 'Sales / Total assets'];
      const contrib = X.map((x, i) => x * m.c[i]);
      const Z = contrib.reduce((a, b) => a + b, 0);
      const zone = Z > m.hi ? 'safe' : Z < m.lo ? 'distress' : 'grey';
      const zoneTxt = { safe: 'SAFE ZONE', grey: 'GREY ZONE', distress: 'DISTRESS ZONE' }[zone];
      const rows = X.map((x, i) => [`X${i + 1}`, names[i], x, m.c[i], contrib[i]]);
      rows.push(['', '<b>' + m.sym + ' (sum)</b>', '', '', Z]);
      return {
        kpis: [
          { k: m.sym + ' score', v: num(Z, 3), raw: Z, s: m.name, cls: zoneClass(zone), big: true },
          { k: 'Classification', v: zoneTxt, s: `Distress < ${m.lo} ≤ Grey ≤ ${m.hi} < Safe`, cls: zoneClass(zone) },
          { k: 'Largest contributor', v: 'X' + (contrib.indexOf(Math.max(...contrib)) + 1), s: names[contrib.indexOf(Math.max(...contrib))] }
        ],
        html: zoneBar(Z, m.lo, m.hi, Math.min(0, m.lo - 1), Math.max(m.hi + 1.5, 4), ['Distress', 'Grey zone', 'Safe']),
        charts: [{
          id: 'contrib', title: 'Contribution of each ratio to ' + m.sym,
          note: 'Bar length = coefficient × ratio. Hover for values.',
          exportData: () => ({ columns: ['Variable', 'Ratio', 'Coefficient', 'Contribution'], rows: X.map((x, i) => ['X' + (i + 1) + ' ' + names[i], x, m.c[i], contrib[i]]) }),
          build: T => ({
            type: 'bar',
            data: { labels: X.map((_, i) => 'X' + (i + 1)), datasets: [{ label: 'Contribution', data: contrib, backgroundColor: contrib.map(c => c >= 0 ? T.c[0] : T.c[4]), borderRadius: 6 }] },
            options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { title: it => names[it[0].dataIndex], label: c => ` ${m.c[c.dataIndex]} × ${num(X[c.dataIndex], 4)} = ${num(c.parsed.x, 4)}` } } }, scales: { x: { grid: { color: T.grid } }, y: { grid: { display: false } } } }
          })
        }],
        tables: [{ id: 'ratios', title: 'Variable breakdown', columns: [{ h: 'Var', num: false }, { h: 'Description', num: false }, { h: 'Ratio', fmt: x => num(x, 4) }, { h: 'Coefficient', fmt: x => num(x, 3) }, { h: 'Contribution', fmt: x => num(x, 4) }], rows, hl: [rows.length - 1] }],
        steps: [
          { h: '1. Compute the ratios', f: X.map((x, i) => `X<sub>${i + 1}</sub> = ${names[i]} = ${num(x, 4)}`) },
          { h: '2. Apply the ' + m.name + ' weights', f: [`${m.sym} = ` + m.c.map((c, i) => `${c}·X<sub>${i + 1}</sub>`).join(' + ')], calc: `${m.sym} = ` + m.c.map((c, i) => `${c}×${num(X[i], 4)}`).join(' + ') + ` = ${num(Z, 4)}` },
          { h: '3. Classify', f: [`${m.sym} &lt; ${m.lo}: distress &nbsp;&nbsp; ${m.lo} ≤ ${m.sym} ≤ ${m.hi}: grey zone &nbsp;&nbsp; ${m.sym} &gt; ${m.hi}: safe`], calc: `${num(Z, 3)} ⇒ ${zoneTxt}` }
        ],
        refs: 'Altman, E. I. (1968). Financial ratios, discriminant analysis and the prediction of corporate bankruptcy. <i>Journal of Finance</i>, 23(4). Altman, E. I. (2000/2002), revised Z\' and Z\'\' models. Note: in the emerging-markets version of Z\'\' a constant of 3.25 is added (zones 4.35 / 5.85); this tool uses the original Z\'\' without the constant.'
      };
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
      { id: 'ffo', label: 'Funds from operations', unit: '$', value: 40000 },
      { id: 'gnp', label: 'GNP price-level index', value: 100, hint: 'SIZE = ln(Total assets / index). Ohlson used a 1968 = 100 base.' }
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

  window.FL_TOOLS = TOOLS;
  window.FL_LIB = { bondPrice, bsm };
})();
