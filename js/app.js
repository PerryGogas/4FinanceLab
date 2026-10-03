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
  function defaults(t) { const v = {}; t.inputs.forEach(i => v[i.id] = i.value); return v; }

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
      else ctl = `<input id="in_${i.id}" type="number" inputmode="decimal" step="${i.step ?? 'any'}" ${i.min !== undefined ? `min="${i.min}"` : ''} ${i.max !== undefined ? `max="${i.max}"` : ''} value="${val ?? ''}">`;
      h += `<div class="field" data-f="${i.id}">${lab}${ctl}${i.hint ? `<div class="hint">${i.hint}</div>` : ''}</div>`;
    });
    if (t.runButton) h += `<button class="btn primary" id="runBtn" style="justify-content:center;padding:11px">${svg('play')}${esc(t.runButton)}</button>`;
    $('#inputs').innerHTML = h;
    t.inputs.forEach(i => {
      const el = $('#in_' + i.id);
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
      v[i.id] = (i.type === 'select' || i.type === 'seg' || i.type === 'textarea') ? raw : (raw === '' || raw === null || raw === undefined ? NaN : parseFloat(raw));
    });
    return v;
  }

  function recompute() {
    const t = current, v = parsed();
    // validation of visible, enabled, required numeric inputs
    const missing = t.inputs.filter(i => (!i.type || i.type === 'number') && !i.optional && !(i.showIf && !i.showIf(v)) && !(i.disabledIf && i.disabledIf(v)) && !isFinite(v[i.id]));
    if (missing.length) { lastResult = { error: 'Please enter a valid number for: ' + missing.map(i => i.label.replace(/<[^>]+>/g, '')).join(', ') + '.' }; }
    else {
      try { lastResult = t.compute(v) || {}; }
      catch (e) { console.error(e); lastResult = { error: 'Calculation error: ' + e.message }; }
    }
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
})();
