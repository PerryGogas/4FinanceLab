/* 4Finance Lab - application shell: menu, routing, rendering, charts, export, print */
(function () {
  'use strict';
  const TOOLS = window.FL_TOOLS, CATS = window.FL_CATS, ICONS = window.FL_ICONS;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  let current = null;           // current tool object
  let values = {};              // current input values
  let lastResult = null;        // last compute() result
  const charts = {};            // id -> Chart instance

  // ---------------- Theme ----------------
  function theme() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    return {
      dark: document.documentElement.getAttribute('data-theme') === 'dark',
      c: [g('--c1'), g('--c2'), g('--c3'), g('--c4'), g('--c5'), g('--c6')],
      grid: g('--grid'), text: g('--text'), muted: g('--muted'), surface: g('--surface'),
      good: g('--good'), warn: g('--warn'), bad: g('--bad'), accent: g('--accent'),
      alpha: (hex, a) => {
        const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
      }
    };
  }
  function setThemeIcon() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('#themeBtn').innerHTML = dark ? svg('sun') : svg('moon');
  }
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('4fl-theme', next); } catch (e) {}
    setThemeIcon();
    if (current) renderResults(true);
  });

  // ---------------- Chart.js global setup ----------------
  // Background fill (so PNG exports are not transparent)
  Chart.register({
    id: 'bgfill',
    beforeDraw(chart) {
      const ctx = chart.ctx; ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = theme().surface || '#fff';
      ctx.fillRect(0, 0, chart.width, chart.height); ctx.restore();
    }
  });
  // Vertical reference lines: options.plugins.vlines = [{x, color, label, dash}]
  Chart.register({
    id: 'vlines',
    afterDatasetsDraw(chart, args, opts) {
      const lines = (opts && opts.lines) || []; if (!lines.length) return;
      const { ctx, chartArea: a, scales: { x } } = chart;
      lines.forEach((l, i) => {
        const px = x.getPixelForValue(l.x); if (px < a.left - 1 || px > a.right + 1) return;
        ctx.save(); ctx.strokeStyle = l.color; ctx.lineWidth = 2; ctx.setLineDash(l.dash || [6, 4]);
        ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke(); ctx.setLineDash([]);
        if (l.label) {
          ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
          const w = ctx.measureText(l.label).width + 10, y = a.top + 4 + (i % 3) * 20;
          let lx = px + 4; if (lx + w > a.right) lx = px - w - 4;
          ctx.fillStyle = l.color; ctx.fillRect(lx, y, w, 17);
          ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(l.label, lx + 5, y + 9);
        }
        ctx.restore();
      });
    }
  });

  function chartDefaults(T) {
    Chart.defaults.color = T.muted;
    Chart.defaults.borderColor = T.grid;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.animation = false;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = T.dark ? '#e6edf6' : '#0f1b2d';
    Chart.defaults.plugins.tooltip.titleColor = T.dark ? '#0f1b2d' : '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = T.dark ? '#0f1b2d' : '#fff';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.interaction.mode = 'nearest';
    Chart.defaults.interaction.intersect = false;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.elements.line.borderWidth = 2.2;
  }

  // ---------------- Navigation ----------------
  function buildNav() {
    let h = `<button class="nav-item" data-go="home">${svg('home')}<span>Home</span></button>`;
    CATS.forEach(c => {
      h += `<div class="nav-cat">${esc(c.name)}</div>`;
      TOOLS.filter(t => t.cat === c.id).forEach(t => {
        h += `<button class="nav-item" data-go="${t.id}">${svg(t.icon)}<span>${esc(t.short || t.title)}</span></button>`;
      });
    });
    $('#nav').innerHTML = h;
    $('#nav').addEventListener('click', e => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      location.hash = b.dataset.go === 'home' ? '#home' : '#/' + b.dataset.go;
      document.body.classList.remove('nav-open');
    });
    $('#menuBtn').addEventListener('click', () => document.body.classList.add('nav-open'));
    $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  }
  function markNav(id) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.go === id));
  }

  function route() {
    const m = location.hash.match(/^#\/([\w-]+)/);
    const t = m && TOOLS.find(x => x.id === m[1]);
    Object.values(charts).forEach(c => c.destroy()); for (const k in charts) delete charts[k];
    if (t) openTool(t); else renderHome();
    window.scrollTo(0, 0);
  }

  // ---------------- Home ----------------
  function renderHome() {
    current = null; markNav('home');
    $('#crumb').innerHTML = 'Home';
    document.title = '4Finance Lab | Financial Analysis Suite by Perry Gogas';
    let h = `<section id="home">
      <div class="hero">
        <svg class="deco" viewBox="0 0 360 200" fill="none" stroke="#fff" stroke-width="3">
          <polyline points="0,170 50,140 90,150 140,95 190,110 240,60 290,72 350,20"/>
          <g stroke-width="2"><line x1="60" y1="90" x2="60" y2="160"/><rect x="52" y="105" width="16" height="35"/>
          <line x1="120" y1="60" x2="120" y2="140"/><rect x="112" y="72" width="16" height="45"/>
          <line x1="180" y1="40" x2="180" y2="120"/><rect x="172" y="55" width="16" height="40"/>
          <line x1="250" y1="10" x2="250" y2="90"/><rect x="242" y="25" width="16" height="45"/></g>
        </svg>
        <h1>4Finance Lab</h1>
        <p>Interactive tools and calculators for corporate finance, fixed income, derivatives and risk management. Every tool shows its formulas step by step, draws interactive charts, and exports to Excel and PNG.</p>
        <div class="chips"><span>${TOOLS.length} tools</span><span>Step-by-step formulas</span><span>Excel &amp; PNG export</span><span>Works offline</span><span>by Prof. Periklis Gogas</span></div>
      </div>`;
    CATS.forEach(c => {
      h += `<div class="home-cat">${esc(c.name)}</div><div class="card-grid">`;
      TOOLS.filter(t => t.cat === c.id).forEach(t => {
        h += `<button class="tool-card" data-go="${t.id}">
          <div class="ic">${svg(t.icon)}</div>
          ${t.isNew ? '<span class="new">NEW</span>' : ''}
          <h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p></button>`;
      });
      h += `</div>`;
    });
    h += `</section>`;
    $('#content').innerHTML = h;
    $('#content').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => location.hash = '#/' + b.dataset.go));
  }

  // ---------------- Tool view ----------------
  function colsOf(t, i) {
    const src = t.inputs.find(x => x.id === i.from), f = fileOf(t.id, i.from);
    const rows = f ? f.rows : (src && src.demo && src.demo.auto ? src.demo.rows() : []);
    const cols = []; rows.slice(0, 50).forEach(r => Object.keys(r).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
    return cols;
  }
  function defaults(t) { const v = {}; t.inputs.forEach(i => { if (i.type !== 'file' && i.type !== 'company') v[i.id] = i.value; }); return v; }

  // ---------------- Company data: built-in snapshot + optional live relay ----------------
  const RELAY_URL = (window.FL_RELAY_URL || '').replace(/\/$/, '');
  const DATA_ASOF = 'Yahoo Finance snapshot, 1 Nov 2026';
  const CO_FIELDS = ['date', 'ta', 'tl', 'wc', 'ca', 'cl', 're', 'ebit', 'bve', 'sales', 'ni', 'ocf', 'mve'];
  const companyState = {};
  let companyDB = null;
  async function loadDB() {
    if (companyDB) return companyDB;
    try { companyDB = await fetch('data/companies.json?v=2.4.1').then(r => r.json()); } catch (e) { companyDB = []; }
    return companyDB;
  }
  const coRow = a => { const o = {}; CO_FIELDS.forEach((f, k) => { o[f] = k === 0 ? a[0] : (a[k] == null ? null : a[k] * 1e6); }); return o; };
  const marketName = d => d.m === 'GR' ? 'Athens' : d.x;
  async function fetchCompany(q) {
    const sym = String(q).trim().split(/\s/)[0].toUpperCase();
    if (!sym) return null;
    if (RELAY_URL) {
      try {
        const r = await fetch(RELAY_URL + '/company?symbol=' + encodeURIComponent(sym));
        if (r.ok) { const d = await r.json(); if (d && d.y && d.y.length) return { d, source: 'live Yahoo Finance' }; }
      } catch (e) { /* fall back to built-in */ }
    }
    const db = await loadDB();
    const local = db.find(d => d.s.toUpperCase() === sym);
    return local ? { d: local, source: DATA_ASOF } : null;
  }
  function applyCompany(t, i) {
    const st = companyState[t.id]; const rows = st.d.y.slice().sort((a, b) => a[0] < b[0] ? -1 : 1);
    const k = rows.findIndex(r => r[0] === st.year);
    const cur = coRow(rows[k]), prev = k > 0 ? coRow(rows[k - 1]) : null;
    const filled = i.map(cur, prev, parsed(), st.d);
    st.missing = [];
    Object.entries(filled).forEach(([key, val]) => {
      if (val === null || val === undefined || (typeof val === 'number' && !isFinite(val))) { values[key] = ''; st.missing.push((t.inputs.find(x => x.id === key) || {}).label || key); }
      else values[key] = typeof val === 'number' ? String(+val.toPrecision(12)) : val;
    });
    store.set('4fl-in-' + t.id, values);
    renderInputs(); recompute();
  }
  async function datasetRows() {
    const db = await loadDB();
    return db.map(d => { const r = coRow(d.y.slice().sort((a, b) => a[0] < b[0] ? -1 : 1).pop()); return { 'Firm': d.s, 'Year': r.date.slice(0, 4), 'Total Assets': r.ta, 'Total Liabilities': r.tl, 'Working Capital': r.wc, 'Current Assets': r.ca, 'Current Liabilities': r.cl, 'Retained Earnings': r.re, 'EBIT': r.ebit, 'Market Value of Equity': r.mve, 'Book Value of Equity': r.bve, 'Sales': r.sales }; });
  }
  const files = {};   // uploaded files per tool (kept in memory only)
  const fileOf = (tid, iid) => (files[tid] || {})[iid];

  function openTool(t) {
    current = t; markNav(t.id);
    const cat = CATS.find(c => c.id === t.cat);
    $('#crumb').innerHTML = `<span>${esc(cat ? cat.name : '')} /</span> ${esc(t.title)}`;
    document.title = t.title + ' | 4Finance Lab';
    values = Object.assign(defaults(t), store.get('4fl-in-' + t.id) || {});
    // drop stale keys
    Object.keys(values).forEach(k => { if (!t.inputs.some(i => i.id === k)) delete values[k]; });

    $('#content').innerHTML = `
      <div class="print-head"><span><b>4Finance Lab</b> &middot; ${esc(t.title)}</span><span>Prof. Periklis Gogas &middot; ${new Date().toLocaleString()}</span></div>
      <div class="tool-head">
        <div class="ic">${svg(t.icon)}</div>
        <div class="grow"><h1>${esc(t.title)}</h1><p>${esc(t.long || t.desc)}</p></div>
        <div class="tool-actions">
          <button class="btn" id="xlsxAll" title="Export inputs, results, tables and chart data to Excel">${svg('xlsx')}<span class="lbl">Excel</span></button>
          <button class="btn" id="printBtn" title="Print or save as PDF">${svg('print')}<span class="lbl">Print / PDF</span></button>
        </div>
      </div>
      <div class="tool-body">
        <section class="panel inputs">
          <div class="panel-h"><h2>Inputs</h2><button class="reset-link" id="resetBtn">Reset defaults</button></div>
          <div class="panel-b" id="inputs"></div>
        </section>
        <section class="results" id="results"></section>
      </div>`;
    renderInputs();
    $('#resetBtn').addEventListener('click', () => { values = defaults(t); store.set('4fl-in-' + t.id, null); renderInputs(); recompute(); });
    $('#xlsxAll').addEventListener('click', exportAllXlsx);
    $('#printBtn').addEventListener('click', () => window.print());
    recompute();
  }

  function renderInputs() {
    const t = current; let h = '';
    t.inputs.forEach(i => {
      const val = values[i.id];
      const lab = `<label for="in_${i.id}"><span>${i.label}</span>${i.unit ? `<em>${esc(i.unit)}</em>` : ''}</label>`;
      let ctl = '';
      if (i.type === 'select') ctl = `<select id="in_${i.id}">${i.options.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(val) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      else if (i.type === 'seg') ctl = `<div class="seg" id="in_${i.id}">${i.options.map(o => `<button type="button" data-v="${esc(o[0])}" class="${String(o[0]) === String(val) ? 'on' : ''}">${esc(o[1])}</button>`).join('')}</div>`;
      else if (i.type === 'textarea') ctl = `<textarea id="in_${i.id}" spellcheck="false">${esc(val ?? '')}</textarea>`;
      else if (i.type === 'company') {
        const st = companyState[t.id];
        const years = st ? st.d.y.map(r => r[0]).sort().reverse() : [];
        ctl = `<div class="co-row"><input id="in_${i.id}" list="dl_${i.id}" placeholder="Ticker, e.g. HTO.AT, AAPL, SAP.DE" value="${esc(st ? st.d.s : '')}" autocomplete="off" spellcheck="false"><datalist id="dl_${i.id}"></datalist>
          <select id="yr_${i.id}" ${years.length ? '' : 'disabled'} title="Financial year">${years.length ? years.map(y => `<option value="${y}" ${st.year === y ? 'selected' : ''}>FY ${y.slice(0, 4)}</option>`).join('') : '<option>Year</option>'}</select>
          <button type="button" class="btn primary" id="go_${i.id}">Load</button></div>
          <div class="file-status">${st ? `<b>${esc(st.d.n)}</b> &middot; year ending ${st.year} &middot; ${esc(st.d.c)} &middot; ${esc(st.source)} <button type="button" class="reset-link" id="cx_${i.id}">clear</button>` : (RELAY_URL ? 'Any listed company (live from Yahoo Finance), or pick a built-in one.' : 'Pick one of the built-in Greek, US and European companies.')}</div>`;
      }
      else if (i.type === 'colpick') {
        const cols = colsOf(t, i);
        if (!cols.length) ctl = `<select id="in_${i.id}" disabled><option>Load a file first</option></select>`;
        else if (!i.multi) { const cur = cols.includes(val) ? val : (i.auto ? i.auto(cols) : ''); ctl = `<select id="in_${i.id}">${cur ? '' : '<option value="">Choose a column...</option>'}${cols.map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`; }
        else { let sel = []; try { sel = JSON.parse(val || '[]'); } catch (e) { sel = []; } ctl = `<div class="colpick" id="in_${i.id}">${cols.map(c => `<label class="chk"><input type="checkbox" value="${esc(c)}" ${sel.includes(c) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>`; }
      }
      else if (i.type === 'file') {
        const f = fileOf(t.id, i.id);
        ctl = `<div class="file-row"><label class="btn file-btn">${svg('xlsx')}<span>${f ? 'Replace file' : 'Choose file'}</span><input id="in_${i.id}" type="file" accept="${esc(i.accept || '')}" hidden></label>${i.template ? `<button type="button" class="btn" id="tpl_${i.id}">Template</button>` : ''}${i.datasetButton ? `<button type="button" class="btn" id="ds_${i.id}">Built-in companies</button>` : ''}${i.demo ? `<button type="button" class="btn" id="dm_${i.id}">${esc(i.demo.label)}</button>` : ''}</div>
          <div class="file-status">${f ? `<b>${esc(f.name)}</b> &middot; ${f.rows.length} rows <button type="button" class="reset-link" id="fx_${i.id}">remove</button>` : (i.demo && i.demo.auto ? 'No file loaded: the demo sample is used' : 'No file loaded')}</div>`;
      }
      else ctl = `<input id="in_${i.id}" type="number" inputmode="decimal" step="${i.step ?? 'any'}" ${i.min !== undefined ? `min="${i.min}"` : ''} ${i.max !== undefined ? `max="${i.max}"` : ''} value="${val ?? ''}">`;
      h += `<div class="field" data-f="${i.id}">${lab}${ctl}${i.hint ? `<div class="hint">${i.hint}</div>` : ''}</div>`;
    });
    if (t.runButton) h += `<button class="btn primary" id="runBtn" style="justify-content:center;padding:11px">${svg('play')}${esc(t.runButton)}</button>`;
    $('#inputs').innerHTML = h;
    t.inputs.forEach(i => {
      const el = $('#in_' + i.id);
      if (i.type === 'company') {
        loadDB().then(db => { const dl = $('#dl_' + i.id); if (dl && !dl.children.length) dl.innerHTML = db.map(d => `<option value="${esc(d.s)}">${esc(d.n)} (${esc(marketName(d))})</option>`).join(''); });
        if (RELAY_URL) {
          let tm = null;
          el.addEventListener('input', () => {
            clearTimeout(tm); const q = el.value.trim(); if (q.length < 2) return;
            tm = setTimeout(async () => {
              try {
                const r = await fetch(RELAY_URL + '/search?q=' + encodeURIComponent(q)).then(x => x.json());
                const dl = $('#dl_' + i.id); if (!dl) return; const have = new Set([...dl.options].map(o => o.value));
                (r.quotes || []).forEach(x => { if (!have.has(x.symbol)) dl.insertAdjacentHTML('beforeend', `<option value="${esc(x.symbol)}">${esc(x.name || '')} (${esc(x.exchange || '')})</option>`); });
              } catch (e) { /* ignore */ }
            }, 300);
          });
        }
        const go = async () => {
          const btn = $('#go_' + i.id); if (!el.value.trim()) { el.focus(); return; }
          btn.disabled = true; btn.textContent = 'Loading...';
          const res = await fetchCompany(el.value);
          if (!res) { btn.disabled = false; btn.textContent = 'Load'; toast(RELAY_URL ? 'Company not found' : 'Not one of the built-in companies'); return; }
          const years = res.d.y.map(r => r[0]).sort();
          companyState[t.id] = { d: res.d, source: res.source, year: years[years.length - 1] };
          applyCompany(t, i);
          toast(res.d.s + ' loaded');
        };
        $('#go_' + i.id).addEventListener('click', go);
        el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        const yr = $('#yr_' + i.id); if (yr && companyState[t.id]) yr.addEventListener('change', () => { companyState[t.id].year = yr.value; applyCompany(t, i); });
        const cx = $('#cx_' + i.id); if (cx) cx.addEventListener('click', () => { delete companyState[t.id]; renderInputs(); recompute(); });
        return;
      }
      if (i.type === 'colpick') {
        if (!el || el.disabled) return;
        if (i.multi) el.addEventListener('change', () => { values[i.id] = JSON.stringify([...el.querySelectorAll('input:checked')].map(x => x.value)); changed(false); });
        else el.addEventListener('change', () => { values[i.id] = el.value; changed(true); });
        return;
      }
      if (i.type === 'file') {
        const dsb = $('#ds_' + i.id);
        const dmb = $('#dm_' + i.id);
        if (dmb) dmb.addEventListener('click', () => { const rows = i.demo.rows(); (files[t.id] = files[t.id] || {})[i.id] = { name: i.demo.name, rows }; toast(rows.length + ' rows loaded'); renderInputs(); recompute(); });
        if (dsb) dsb.addEventListener('click', async () => { const rows = await datasetRows(); (files[t.id] = files[t.id] || {})[i.id] = { name: 'Built-in companies (' + DATA_ASOF + ')', rows }; toast(rows.length + ' companies loaded'); renderInputs(); recompute(); });
        el.addEventListener('change', async () => {
          const f = el.files[0]; if (!f) return;
          try {
            let wb;
            if (/\.csv$/i.test(f.name)) {
              const txt = await f.text(); const first = txt.split(/\r?\n/)[0] || '';
              wb = XLSX.read(txt, { type: 'string', FS: (first.split(';').length > first.split(',').length) ? ';' : ',' });
            } else wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
            (files[t.id] = files[t.id] || {})[i.id] = { name: f.name, rows };
            toast(rows.length + ' rows loaded');
          } catch (err) { toast('Could not read this file'); console.error(err); }
          renderInputs(); recompute();
        });
        const tb = $('#tpl_' + i.id);
        if (tb) tb.addEventListener('click', () => { const tp = i.template; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([tp.columns].concat(tp.rows)), 'Data'); XLSX.writeFile(wb, tp.name); toast('Template downloaded'); });
        const fx = $('#fx_' + i.id);
        if (fx) fx.addEventListener('click', () => { delete (files[t.id] || {})[i.id]; renderInputs(); recompute(); });
        return;
      }
      if (i.type === 'seg') el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        values[i.id] = b.dataset.v; changed(true);
      });
      else el.addEventListener('input', () => {
        values[i.id] = i.type === 'number' || !i.type ? (el.value === '' ? '' : el.value) : el.value;
        changed(i.type === 'select');
      });
    });
    if (t.runButton) $('#runBtn').addEventListener('click', () => recompute());
    applyVisibility();
  }

  function applyVisibility() {
    const v = parsed();
    current.inputs.forEach(i => {
      const f = document.querySelector(`[data-f="${i.id}"]`); if (!f) return;
      f.classList.toggle('hidden', !!(i.showIf && !i.showIf(v)));
      const el = $('#in_' + i.id);
      if (i.disabledIf && el.tagName === 'INPUT') {
        const dis = i.disabledIf(v); el.disabled = dis;
        if (dis) el.placeholder = 'solved';
      }
    });
  }

  let timer = null;
  function changed(structural) {
    store.set('4fl-in-' + current.id, values);
    if (structural) applyVisibility();
    if (current.runButton && !current.liveInputs) return;
    clearTimeout(timer); timer = setTimeout(recompute, 90);
  }

  function parsed() {
    const v = {};
    current.inputs.forEach(i => {
      const raw = values[i.id];
      if (i.type === 'file') { const f = fileOf(current.id, i.id); v[i.id] = f ? f.rows : null; return; }
      if (i.type === 'company') { v[i.id] = null; return; }
      if (i.type === 'colpick') { if (i.multi) { try { v[i.id] = JSON.parse(raw || '[]'); } catch (e) { v[i.id] = []; } } else v[i.id] = raw || ''; return; }
      v[i.id] = (i.type === 'select' || i.type === 'seg' || i.type === 'textarea') ? raw : (raw === '' || raw === null || raw === undefined ? NaN : parseFloat(raw));
    });
    return v;
  }

  function recompute() {
    const t = current, v = parsed();
    // validation of visible, enabled, required numeric inputs
    const missing = t.inputs.filter(i => (!i.type || i.type === 'number') && !i.optional && !(i.showIf && !i.showIf(v)) && !(i.disabledIf && i.disabledIf(v)) && !isFinite(v[i.id]));
    const hasFile = t.inputs.some(i => i.type === 'file' && fileOf(t.id, i.id));
    if (missing.length && hasFile) v.__singleInvalid = 'Please enter a valid number for: ' + missing.map(i => i.label.replace(/<[^>]+>/g, '')).join(', ') + '.';
    if (missing.length && !hasFile) { lastResult = { error: 'Please enter a valid number for: ' + missing.map(i => i.label.replace(/<[^>]+>/g, '')).join(', ') + '.' }; }
    else {
      try { lastResult = t.compute(v) || {}; }
      catch (e) { console.error(e); lastResult = { error: 'Calculation error: ' + e.message }; }
    }
    const cst = companyState[t.id];
    if (cst && cst.missing && cst.missing.length) lastResult.warnings = (lastResult.warnings || []).concat('Not available from the data source for ' + cst.d.s + ' (year ending ' + cst.year + '): ' + cst.missing.join(', ') + '. Enter these from the annual report.');
    if (cst) lastResult.warnings = (lastResult.warnings || []).concat('Company data: ' + cst.d.n + ', year ending ' + cst.year + ', amounts in ' + cst.d.c + ' (' + cst.source + '). Check key figures against the annual report before relying on them.');
    // write solved values back into disabled fields
    if (lastResult.solved) Object.entries(lastResult.solved).forEach(([k, x]) => { const el = $('#in_' + k); if (el) el.value = isFinite(x) ? +x.toFixed(6) : ''; });
    renderResults(false);
  }

  // ---------------- Results rendering ----------------
  function renderResults(themeChanged) {
    const r = lastResult, box = $('#results');
    const T = theme(); chartDefaults(T);
    let h = '';
    if (r.error) h += `<div class="msg err">${r.error}</div>`;
    (r.warnings || []).forEach(w => h += `<div class="msg">${w}</div>`);
    if (r.kpis && r.kpis.length) h += `<div class="kpis">${r.kpis.map(k => `<div class="kpi ${k.cls || ''} ${k.big ? 'big' : ''}"><div class="k">${k.k}</div><div class="v">${k.v}</div>${k.s ? `<div class="s">${k.s}</div>` : ''}</div>`).join('')}</div>`;
    if (r.html) h += r.html;
    (r.charts || []).forEach(c => {
      h += `<div class="panel"><div class="panel-h"><h3>${c.title}</h3><div class="mini-btns">
        <button class="mini" data-cpng="${c.id}">${svg('image')}PNG</button><button class="mini" data-cxlsx="${c.id}">${svg('xlsx')}XLSX</button></div></div>
        <div class="panel-b"><div class="chart-wrap ${c.tall ? 'tall' : ''}"><canvas id="ch_${c.id}"></canvas></div>${c.note ? `<div class="chart-note">${c.note}</div>` : ''}</div></div>`;
    });
    (r.tables || []).forEach(tb => {
      h += `<div class="panel"><div class="panel-h"><h3>${tb.title}</h3><div class="mini-btns">
        <button class="mini" data-tpng="${tb.id}">${svg('image')}PNG</button><button class="mini" data-txlsx="${tb.id}">${svg('xlsx')}XLSX</button></div></div>
        <div class="tbl-scroll">${tableHtml(tb)}</div>${tb.note ? `<div class="panel-b note" style="padding-top:10px">${tb.note}</div>` : ''}</div>`;
    });
    if (r.steps && r.steps.length) {
      const wasOpen = $('#stepsBox') ? $('#stepsBox').open : true;
      h += `<details class="steps" id="stepsBox" ${wasOpen ? 'open' : ''}><summary>Formulas &amp; step-by-step solution</summary><div class="steps-body">
        ${r.steps.map(s => `<div class="step"><h4>${s.h}</h4>${(s.f || []).map(f => `<div class="formula">${f}</div>`).join('')}${s.calc ? `<div class="sub-calc">${s.calc}</div>` : ''}${s.note ? `<div class="note" style="margin-top:6px">${s.note}</div>` : ''}</div>`).join('')}
        ${r.refs ? `<div class="ref">${r.refs}</div>` : ''}</div></details>`;
    }
    // keep existing chart instances if same ids (avoid flicker)
    const ids = new Set((r.charts || []).map(c => c.id));
    Object.keys(charts).forEach(id => { charts[id].destroy(); delete charts[id]; });
    box.innerHTML = h;
    (r.charts || []).forEach(c => {
      const cfg = c.build(T);
      charts[c.id] = new Chart($('#ch_' + c.id), cfg);
      charts[c.id]._spec = c;
    });
    box.querySelectorAll('[data-cpng]').forEach(b => b.onclick = () => chartPng(b.dataset.cpng));
    box.querySelectorAll('[data-cxlsx]').forEach(b => b.onclick = () => chartXlsx(b.dataset.cxlsx));
    box.querySelectorAll('[data-tpng]').forEach(b => b.onclick = () => tablePng(b.dataset.tpng));
    box.querySelectorAll('[data-txlsx]').forEach(b => b.onclick = () => tableXlsx(b.dataset.txlsx));
    void ids; void themeChanged;
  }

  function cellText(col, x) {
    if (x === null || x === undefined || x === '') return '';
    if (typeof x === 'string') return x;
    return col.fmt ? col.fmt(x) : FM.num(x, 4);
  }
  function tableHtml(tb) {
    const hl = new Set(tb.hl || []);
    return `<table class="data"><thead><tr>${tb.columns.map(c => `<th class="${c.num !== false ? 'num' : ''}">${c.h}</th>`).join('')}</tr></thead><tbody>
      ${tb.rows.map((row, ri) => `<tr class="${hl.has(ri) ? 'hl' : ''}">${row.map((x, i) => `<td class="${tb.columns[i].num !== false ? 'num' : ''}">${typeof x === 'string' ? x : esc(cellText(tb.columns[i], x))}</td>`).join('')}</tr>`).join('')}
    </tbody></table>`;
  }

  // ---------------- Export helpers ----------------
  const stripTags = s => String(s).replace(/<sub>(.*?)<\/sub>/g, '_$1').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').trim();
  const fileBase = () => '4FinanceLab_' + current.id + '_' + new Date().toISOString().slice(0, 10);
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  const safeSheet = (s, used) => { let n = stripTags(s).replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Sheet'; let k = n, i = 2; while (used.has(k)) k = n.slice(0, 25) + ' ' + i++; used.add(k); return k; };

  function tableAoa(tb) {
    return [tb.columns.map(c => stripTags(c.h))].concat(tb.rows.map(r => r.map(x => typeof x === 'string' ? stripTags(x) : (isFinite(x) ? x : (x === null || x === undefined ? '' : String(x))))));
  }
  function chartAoa(id) {
    const ch = charts[id], spec = ch._spec;
    if (spec.exportData) { const d = spec.exportData(); return [d.columns].concat(d.rows); }
    const ds = ch.data.datasets, labels = ch.data.labels;
    if (labels && labels.length) {
      const head = [stripTags(spec.xLabel || 'x')].concat(ds.map(d => d.label || 'series'));
      return [head].concat(labels.map((l, i) => [l].concat(ds.map(d => { const y = d.data[i]; return y && typeof y === 'object' ? y.y : y; }))));
    }
    const maxLen = Math.max(...ds.map(d => d.data.length));
    const sc = ch.options.scales || {}, xt = (sc.x && sc.x.title && sc.x.title.text) || 'x', yt = (sc.y && sc.y.title && sc.y.title.text) || 'y';
    const head = []; ds.forEach(d => head.push((d.label || 'series') + ': ' + xt, (d.label || 'series') + ': ' + (d.yAxisID === 'y2' ? ((sc.y2 && sc.y2.title && sc.y2.title.text) || 'y2') : yt)));
    const rows = [];
    for (let i = 0; i < maxLen; i++) { const r = []; ds.forEach(d => { const p = d.data[i]; r.push(p ? p.x : '', p ? p.y : ''); }); rows.push(r); }
    return [head].concat(rows);
  }
  function sheetFrom(aoa) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = aoa[0].map((_, i) => ({ wch: Math.min(40, Math.max(10, ...aoa.slice(0, 200).map(r => String(r[i] ?? '').length + 2))) }));
    return ws;
  }
  function writeBook(sheets, name) {
    const wb = XLSX.utils.book_new(); const used = new Set();
    sheets.forEach(s => XLSX.utils.book_append_sheet(wb, sheetFrom(s.aoa), safeSheet(s.name, used)));
    XLSX.writeFile(wb, name);
    toast('Excel file downloaded');
  }
  function inputsAoa() {
    const v = parsed();
    const rows = [['Input', 'Value', 'Unit']];
    current.inputs.forEach(i => {
      if (i.showIf && !i.showIf(v)) return;
      if (i.type === 'file') { const f = fileOf(current.id, i.id); if (f) rows.push([stripTags(i.label), f.name + ' (' + f.rows.length + ' rows)', '']); return; }
      if (i.type === 'colpick') { const x = v[i.id]; rows.push([stripTags(i.label), Array.isArray(x) ? x.join(', ') : (x || '(automatic)'), '']); return; }
      if (i.type === 'company') { const st = companyState[current.id]; if (st) rows.push(['Company data', st.d.n + ' (' + st.d.s + '), year ending ' + st.year + ', ' + st.source, st.d.c]); return; }
      let val = values[i.id];
      if (i.type === 'select' || i.type === 'seg') { const o = i.options.find(o => String(o[0]) === String(val)); val = o ? o[1] : val; }
      else if (i.type !== 'textarea') { val = lastResult.solved && i.id in lastResult.solved ? lastResult.solved[i.id] : parseFloat(val); }
      rows.push([stripTags(i.label) + (lastResult.solved && i.id in lastResult.solved ? ' (solved)' : ''), val, i.unit || '']);
    });
    return rows;
  }
  function exportAllXlsx() {
    const r = lastResult || {}; const sheets = [];
    const info = [['4Finance Lab', current.title], ['Author', 'Prof. Periklis Gogas'], ['Exported', new Date().toLocaleString()], []].concat(inputsAoa());
    sheets.push({ name: 'Inputs', aoa: info });
    if (r.kpis && r.kpis.length) sheets.push({ name: 'Results', aoa: [['Result', 'Value', 'Comment']].concat(r.kpis.map(k => [stripTags(k.k), k.raw !== undefined ? k.raw : stripTags(k.v), stripTags(k.s || '')])) });
    (r.tables || []).forEach(tb => sheets.push({ name: tb.title, aoa: tableAoa(tb) }));
    (r.charts || []).forEach(c => sheets.push({ name: 'Chart ' + stripTags(c.title), aoa: chartAoa(c.id) }));
    writeBook(sheets, fileBase() + '.xlsx');
  }
  function tableXlsx(id) { const tb = lastResult.tables.find(t => t.id === id); writeBook([{ name: tb.title, aoa: tableAoa(tb) }], fileBase() + '_' + id + '.xlsx'); }
  function chartXlsx(id) { const c = charts[id]; writeBook([{ name: c._spec.title, aoa: chartAoa(id) }], fileBase() + '_' + id + '_data.xlsx'); }

  function chartPng(id) {
    const ch = charts[id], T = theme();
    // render at 2x on an offscreen canvas with a title
    const src = ch.canvas, scale = 2, pad = 20 * scale, titleH = 34 * scale;
    const out = document.createElement('canvas');
    out.width = src.width * scale / (window.devicePixelRatio || 1) + pad * 2; out.height = src.height * scale / (window.devicePixelRatio || 1) + pad * 2 + titleH;
    const prevRatio = ch.options.devicePixelRatio;
    ch.options.devicePixelRatio = scale; ch.resize(); ch.update('none');
    const ctx = out.getContext('2d');
    ctx.fillStyle = T.surface; ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = T.text; ctx.font = (16 * scale) + 'px ' + getComputedStyle(document.body).fontFamily; ctx.font = '700 ' + ctx.font;
    ctx.fillText(stripTags(ch._spec.title), pad, pad + 16 * scale);
    ctx.fillStyle = T.muted; ctx.font = (11 * scale) + 'px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'right'; ctx.fillText('4Finance Lab · ' + current.title, out.width - pad, pad + 15 * scale); ctx.textAlign = 'left';
    ctx.drawImage(ch.canvas, pad, pad + titleH, out.width - pad * 2, out.height - pad * 2 - titleH);
    ch.options.devicePixelRatio = prevRatio; ch.resize(); ch.update('none');
    download(out.toDataURL('image/png'), fileBase() + '_' + id + '.png');
    toast('PNG downloaded');
  }

  function tablePng(id) {
    const tb = lastResult.tables.find(t => t.id === id), T = theme();
    const head = tb.columns.map(c => stripTags(c.h));
    const body = tb.rows.map(r => r.map((x, i) => typeof x === 'string' ? stripTags(x) : cellText(tb.columns[i], x)));
    const font = getComputedStyle(document.body).fontFamily, s = 2;
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    ctx.font = `13px ${font}`;
    const widths = head.map((h, i) => { ctx.font = `700 12px ${font}`; let w = ctx.measureText(h.toUpperCase()).width; ctx.font = `13px ${font}`; body.forEach(r => w = Math.max(w, ctx.measureText(r[i]).width)); return Math.ceil(w) + 28; });
    const rowH = 30, titleH = 46, pad = 18, W = widths.reduce((a, b) => a + b, 0) + pad * 2, H = titleH + rowH * (body.length + 1) + pad * 2;
    c.width = W * s; c.height = H * s; ctx.scale(s, s);
    ctx.fillStyle = T.surface; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = T.text; ctx.font = `700 16px ${font}`; ctx.textBaseline = 'middle';
    ctx.fillText(stripTags(tb.title), pad, pad + 12);
    ctx.fillStyle = T.muted; ctx.font = `11px ${font}`; ctx.fillText('4Finance Lab · ' + current.title, pad, pad + 30);
    let y = pad + titleH;
    ctx.fillStyle = T.dark ? '#1c2a40' : '#eef2f7'; ctx.fillRect(pad, y, W - pad * 2, rowH);
    const hl = new Set(tb.hl || []);
    const drawRow = (cells, yy, bold, header) => {
      let x = pad;
      cells.forEach((t, i) => {
        const num = tb.columns[i].num !== false;
        ctx.font = (bold ? '700 ' : '') + (header ? '12px ' : '13px ') + font;
        ctx.fillStyle = header ? T.muted : T.text; ctx.textAlign = num ? 'right' : 'left';
        ctx.fillText(header ? t.toUpperCase() : t, num ? x + widths[i] - 12 : x + 12, yy + rowH / 2);
        x += widths[i];
      });
      ctx.textAlign = 'left';
    };
    drawRow(head, y, true, true); y += rowH;
    body.forEach((r, ri) => {
      if (hl.has(ri)) { ctx.fillStyle = T.alpha(T.accent, .14); ctx.fillRect(pad, y, W - pad * 2, rowH); }
      ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      drawRow(r, y, hl.has(ri), false); y += rowH;
    });
    download(c.toDataURL('image/png'), fileBase() + '_' + id + '.png');
    toast('PNG downloaded');
  }

  // ---------------- Print support: swap charts for images ----------------
  window.addEventListener('beforeprint', () => {
    Object.values(charts).forEach(ch => {
      const wrap = ch.canvas.parentElement; let img = wrap.querySelector('img.print-img');
      if (!img) { img = document.createElement('img'); img.className = 'print-img'; wrap.appendChild(img); }
      img.src = ch.toBase64Image('image/png', 1);
    });
    const d = $('#stepsBox'); if (d) { d.dataset.wasOpen = d.open; d.open = true; }
  });
  window.addEventListener('afterprint', () => {
    document.querySelectorAll('img.print-img').forEach(i => i.remove());
    const d = $('#stepsBox'); if (d && d.dataset.wasOpen === 'false') d.open = false;
  });

  // ---------------- Boot ----------------
  window.FL_APP = { charts, get result() { return lastResult; }, get tool() { return current; }, exportAllXlsx, chartPng, tablePng };
  buildNav(); setThemeIcon();
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // ---------------- Install app button ----------------
  (function installButton() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone || !location.protocol.startsWith('http')) return;
    let deferred = null;
    const btn = document.createElement('button');
    btn.className = 'btn primary'; btn.id = 'installBtn'; btn.title = 'Install 4Finance Lab as an app';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg><span class="lbl">Install app</span>';
    btn.style.display = 'none';
    $('#themeBtn').before(btn);
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.style.display = ''; });
    window.addEventListener('appinstalled', () => { btn.remove(); toast('4Finance Lab installed'); });
    function help() {
      const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
      const edge = /Edg\//.test(ua), android = /Android/.test(ua), firefox = /Firefox/.test(ua), safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
      const steps = ios ? 'Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.'
        : safari ? 'In Safari choose <b>File &gt; Add to Dock</b>.'
        : firefox ? 'Firefox on desktop cannot install web apps. Please open this page in <b>Chrome</b> or <b>Edge</b>.'
        : android ? 'Open the browser menu <b>&#8942;</b> and tap <b>Install app</b> or <b>Add to Home screen</b>.'
        : edge ? 'Open the menu <b>&#8943;</b> &gt; <b>Apps</b> &gt; <b>Install this site as an app</b>.'
        : 'Open the menu <b>&#8942;</b> &gt; <b>Cast, save, and share</b> &gt; <b>Install page as app</b>, or click the install icon at the right end of the address bar.';
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:grid;place-items:center;padding:16px';
      d.innerHTML = `<div class="panel" style="max-width:420px;padding:22px"><h3 style="margin:0 0 8px">Install 4Finance Lab</h3><p style="margin:0 0 16px;color:var(--muted)">${steps}</p><button class="btn primary" style="width:100%;justify-content:center">OK</button></div>`;
      d.addEventListener('click', e => { if (e.target === d || e.target.tagName === 'BUTTON') d.remove(); });
      document.body.appendChild(d);
    }
    btn.addEventListener('click', async () => {
      if (!deferred) return help();
      deferred.prompt();
      const r = await deferred.userChoice; deferred = null;
      if (r.outcome === 'accepted') btn.remove();
    });
  })();
})();
