/* 4Finance Lab - numerical helpers */
(function (G) {
  'use strict';
  const M = {};

  // Standard normal pdf
  M.normPdf = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  // Standard normal cdf: Hart (1968) algorithm 5666 as given by West (2005), double precision
  M.normCdf = function (x) {
    const z = Math.abs(x);
    let c;
    if (z > 37) c = 0;
    else {
      const e = Math.exp(-z * z / 2);
      if (z < 7.07106781186547) {
        let n = 3.52624965998911e-02 * z + 0.700383064443688;
        n = n * z + 6.37396220353165; n = n * z + 33.912866078383;
        n = n * z + 112.079291497871; n = n * z + 221.213596169931;
        n = n * z + 220.206867912376;
        let d = 8.83883476483184e-02 * z + 1.75566716318264;
        d = d * z + 16.064177579207; d = d * z + 86.7807322029461;
        d = d * z + 296.564248779674; d = d * z + 637.333633378831;
        d = d * z + 793.826512519948; d = d * z + 440.413735824752;
        c = e * n / d;
      } else {
        let b = z + 0.65; b = z + 4 / b; b = z + 3 / b; b = z + 2 / b; b = z + 1 / b;
        c = e / b / 2.506628274631;
      }
    }
    return x > 0 ? 1 - c : c;
  };

  // Inverse standard normal: Acklam (2003) + one Halley refinement step (about 1e-15 relative error)
  M.invNorm = function (p) {
    if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425, ph = 1 - pl;
    let q, r, x;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= ph) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const e = M.normCdf(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  };

  // Robust root finder: Brent's method on [a,b]. Returns NaN if no sign change.
  M.brent = function (f, a, b, tol = 1e-12, maxIter = 300) {
    let fa = f(a), fb = f(b);
    if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return NaN;
    if (fa === 0) return a; if (fb === 0) return b;
    let c = a, fc = fa, d = b - a, e = d;
    for (let i = 0; i < maxIter; i++) {
      if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
      if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
      const tol1 = 2 * Number.EPSILON * Math.abs(b) + tol / 2, xm = (c - b) / 2;
      if (Math.abs(xm) <= tol1 || fb === 0) return b;
      if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
        let s = fb / fa, p, q;
        if (a === c) { p = 2 * xm * s; q = 1 - s; }
        else { q = fa / fc; const r = fb / fc; p = s * (2 * xm * q * (q - r) - (b - a) * (r - 1)); q = (q - 1) * (r - 1) * (s - 1); }
        if (p > 0) q = -q; p = Math.abs(p);
        if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; }
        else { d = xm; e = d; }
      } else { d = xm; e = d; }
      a = b; fa = fb;
      b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1);
      fb = f(b);
    }
    return b;
  };

  // Scan an interval for sign changes and return all roots (used for IRR)
  M.allRoots = function (f, lo, hi, steps = 2000) {
    const roots = []; let x0 = lo, f0 = f(lo);
    for (let i = 1; i <= steps; i++) {
      const x1 = lo + (hi - lo) * i / steps, f1 = f(x1);
      if (isFinite(f0) && isFinite(f1) && f0 * f1 <= 0 && f0 !== f1) {
        const r = M.brent(f, x0, x1);
        if (isFinite(r) && !roots.some(z => Math.abs(z - r) < 1e-7)) roots.push(r);
      }
      x0 = x1; f0 = f1;
    }
    return roots;
  };

  // Seeded RNG (mulberry32) and Box-Muller normal generator
  M.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  M.normalGen = function (rand) {
    let spare = null;
    return function () {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let u = 0, v = 0;
      while (u === 0) u = rand();
      v = rand();
      const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
      spare = r * Math.sin(th);
      return r * Math.cos(th);
    };
  };

  // Sample quantile (Excel PERCENTILE.INC / R type 7) on a sorted array
  M.quantileSorted = function (s, p) {
    const h = (s.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
    return s[lo] + (h - lo) * (s[hi] - s[lo]);
  };

  M.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

  // ---------- Formatting ----------
  const nf = (d, min) => new Intl.NumberFormat('en-US', { minimumFractionDigits: min ?? d, maximumFractionDigits: d });
  M.num = (x, d = 2) => !isFinite(x) ? (isNaN(x) ? 'n/a' : (x > 0 ? '∞' : '−∞')) : nf(d).format(x).replace('-', '−');
  M.money = (x, d = 2) => !isFinite(x) ? M.num(x) : (x < 0 ? '−$' : '$') + nf(d).format(Math.abs(x));
  M.pct = (x, d = 2) => !isFinite(x) ? M.num(x) : M.num(x * 100, d) + '%';
  M.plain = (x, d = 4) => !isFinite(x) ? String(x) : (+x.toFixed(d)).toString();

  G.FM = M;
})(window);
