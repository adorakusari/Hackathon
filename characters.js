/* =====================================================================
   ARENA ROSTER v3 — character portrait renderer
   Art direction: bold vector illustration, one shared ink outline (#120f1a),
   two-tone cel shading (key light upper-left, accent rim right), natural bust
   proportions (head ~ 40% of shoulder width, neck, trapezius, shoulders) and
   real garment construction. Every hero is built from the same parts so the
   roster reads as one universe, while hair, jaw, gear, headwear, scars and
   accessories give each a different silhouette and personality.
   Customization comes in through the `look` object.
   ===================================================================== */
(function () {
  'use strict';
  const INK = '#120f1a';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const toRgb = h => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const toHex = r => '#' + r.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A.map((x, i) => x * (1 - t) + B[i] * t)); };
  const shade = (c, t) => t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t);
  const f = n => (Math.round(n * 100) / 100);
  const MIR = 'transform="translate(120 0) scale(-1 1)"';
  const sym = s => s + '<g ' + MIR + '>' + s + '</g>';

  /* Per-hero identity */
  const TRAITS = {
    nova:{jaw:'square', gear:'jacket', expr:'calm',    brow:'straight', stubble:.2, scar:'browR', build:'m'},
    kai: {jaw:'square', gear:'racer',  expr:'smirk',   brow:'angled',   stubble:.5, headset:true, build:'m'},
    zara:{jaw:'oval',   gear:'vest',   expr:'smirk',   brow:'arch',     freckles:26, earcuff:true, build:'f'},
    axel:{jaw:'sharp',  gear:'hoodie', expr:'focused', brow:'straight', stubble:.28, glasses:true, build:'m'},
    luna:{jaw:'oval',   gear:'cowl',   expr:'calm',    brow:'arch',     mole:true, build:'f'},
    jett:{jaw:'square', gear:'armor',  expr:'grin',    brow:'angled',   beard:'full', build:'m'},
    rex: {jaw:'square', gear:'jacket', expr:'smirk',   brow:'angled',   stubble:.35, scar:'cheekL', pierce:true, build:'m'},
    mira:{jaw:'oval',   gear:'mantle', expr:'calm',    brow:'arch',     freckles:12, gem:true, build:'f'},
    sol: {jaw:'round',  gear:'armor',  expr:'calm',    brow:'straight', beard:'grey', earrings:true, build:'m'},
    nyx: {jaw:'sharp',  gear:'cowl',   expr:'smirk',   brow:'angled',   liner:true, nosestud:true, build:'f'}
  };

  function rng(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }

  /* ---------- head ---------- */
  const JAWS = {
    square:{hw:21.5, jx:17, jy:72, cx:8.5, chin:84.5},
    oval:  {hw:20,   jx:13.5, jy:75, cx:5.5, chin:86},
    sharp: {hw:20.5, jx:14, jy:73, cx:3.2, chin:87},
    round: {hw:22,   jx:18, jy:72, cx:10, chin:84}
  };
  function facePath(j) {
    const L = 60 - j.hw, R = 60 + j.hw;
    return 'M' + L + ' 50 C' + L + ' 34 ' + (L + 6) + ' 28 60 28 C' + (R - 6) + ' 28 ' + R + ' 34 ' + R + ' 50 ' +
      'C' + R + ' 60 ' + (R - 1) + ' 66 ' + (60 + j.jx) + ' ' + j.jy + ' L' + (60 + j.cx) + ' ' + j.chin + ' Q60 ' + (j.chin + 1.6) + ' ' + (60 - j.cx) + ' ' + j.chin +
      ' L' + (60 - j.jx) + ' ' + j.jy + ' C' + (L + 1) + ' 66 ' + L + ' 60 ' + L + ' 50Z';
  }

  /* ---------- hair (every style = clean closed shapes + one shadow side + clipped highlights) ---------- */
  function piece(p, key, ds, mir, color, extra) {
    const dark = shade(color, -.4), cid = p + 'h' + key;
    const fwd = ds.map(d => '<path d="' + d + '"/>').join('');
    const bwd = mir ? ds.map(d => '<path ' + MIR + ' d="' + d + '"/>').join('') : '';
    return '<clipPath id="' + cid + '">' + fwd + bwd + '</clipPath>' +
      '<g fill="' + color + '">' + fwd + bwd + '</g>' +
      '<g clip-path="url(#' + cid + ')"><path d="M64 0 C71 30 70 70 65 130 L130 130 L130 0Z" fill="' + dark + '" opacity=".55"/>' + (extra || '') + '</g>' +
      '<g fill="none" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round">' + fwd + bwd + '</g>';
  }
  const hl = (d, c, w, o) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (w || 1.2) + '" stroke-linecap="round" opacity="' + (o || .5) + '"/>';

  function locStrand(x, y, len, color, p, key, ang) {
    const w = 6, cid = p + 'lc' + key, base = shade(color, .1), dark = shade(color, -.4), light = shade(color, .42);
    const d = 'M' + (x - w / 2) + ' ' + y + ' L' + (x - w / 2 + .4) + ' ' + (y + len) + ' Q' + x + ' ' + (y + len + 5) + ' ' + (x + w / 2 - .4) + ' ' + (y + len) + ' L' + (x + w / 2) + ' ' + y + 'Z';
    let rings = '';
    for (let k = 9; k < len; k += 8) rings += '<path d="M' + (x - w / 2) + ' ' + (y + k) + ' L' + (x + w / 2) + ' ' + (y + k + 1) + '" stroke="' + dark + '" stroke-width=".9" opacity=".75"/>';
    return '<g transform="rotate(' + ang + ' ' + x + ' ' + y + ')"><clipPath id="' + cid + '"><path d="' + d + '"/></clipPath><path d="' + d + '" fill="' + base + '"/>' +
      '<g clip-path="url(#' + cid + ')"><rect x="' + (x + .8) + '" y="' + y + '" width="3" height="' + (len + 8) + '" fill="' + dark + '" opacity=".5"/><rect x="' + (x - w / 2 + .7) + '" y="' + y + '" width="1.3" height="' + (len + 8) + '" fill="' + light + '" opacity=".6"/>' + rings + '</g>' +
      '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="1"/>' +
      '<circle cx="' + x + '" cy="' + (y + len + 1) + '" r="1.8" fill="#e0b13a" stroke="' + INK + '" stroke-width=".7"/></g>';
  }

  function hairShape(style, color, p) {
    const light = shade(color, .4), dark = shade(color, -.45);
    const out = {back:'', front:'', hood:false};
    switch (style) {
      case 'spiky':
        out.front = piece(p, 'f', ['M38 54 C34 42 35 33 40 28 L36 16 L47 24 L50 8 L58 22 L66 5 L70 22 L81 12 L79 28 C85 34 86 44 82 54 C80 45 76 40 70 38 C62 36 52 38 46 41 C42 44 40 48 38 54Z'], false, color,
          hl('M47 24 C48 31 50 35 53 38', light, 1.3) + hl('M67 20 C67 28 68 33 70 36', light, 1.1, .35));
        break;
      case 'long':
        out.back = piece(p, 'b', ['M33 112 C22 70 24 28 60 19 C96 28 98 70 87 112Z'], false, color, hl('M36 44 C32 66 33 90 35 106', light, 1.4, .3));
        out.front = piece(p, 'f', ['M60 21 C74 21 84 34 82 54 C83 72 85 90 87 106 L78 108 C76 90 77 72 77 56 C76 46 70 38 60 36 C50 38 44 46 43 56 C43 72 44 90 42 108 L33 106 C35 90 37 72 38 54 C36 34 46 21 60 21Z'], false, color,
          hl('M45 32 C52 24 68 24 76 31', light, 1.4) + hl('M38 60 C37 76 36 90 35 100', light, 1.1, .3));
        break;
      case 'afro':
        out.front = piece(p, 'f', ['M36 58 C22 56 20 38 28 29 C24 16 38 8 48 10 C54 1 68 1 74 10 C86 8 98 16 92 29 C100 38 98 56 84 58 C84 47 80 41 72 38 C64 42 56 42 48 38 C40 41 36 47 36 58Z'], false, color,
          hl('M34 30 C38 22 46 18 54 18', light, 1.5, .4) + hl('M62 12 C68 12 74 14 78 18', light, 1.3, .35) +
          '<g fill="none" stroke="' + dark + '" stroke-width="1" opacity=".5"><path d="M38 40 q3 -4 6 0 M46 22 q3 -4 6 0 M58 14 q3 -4 6 0 M72 20 q3 -4 6 0 M84 38 q3 -4 6 0"/></g>');
        break;
      case 'mohawk':
        out.front = '<path d="M39 48 C38 36 46 28 60 28 C74 28 82 36 81 48 C80 41 72 37 60 37 C48 37 40 41 39 48Z" fill="' + color + '" opacity=".35"/>' +
          piece(p, 'f', ['M50 40 C44 32 45 22 50 14 L55 19 L60 8 L65 19 L70 14 C75 22 76 32 70 40 C65 37 55 37 50 40Z'], false, color,
            hl('M55 33 C55 26 56 20 58 13', light, 1.3) + hl('M63 32 C64 26 63 21 62 15', dark, 1.1, .6));
        break;
      case 'swept':
        out.front = piece(p, 'f', ['M37 55 C31 36 38 19 58 16 C79 12 92 29 83 55 C82 46 79 40 73 37 C66 41 58 38 51 42 C45 44 40 48 37 55Z'], false, color,
          hl('M42 33 C52 23 68 20 80 29', light, 1.5, .45) + hl('M45 39 C54 31 66 29 76 33', light, 1.1, .3) + hl('M60 22 C58 28 58 33 61 38', dark, 1.1, .5));
        break;
      case 'crop':
        out.front = piece(p, 'f', ['M38 52 C35 34 45 23 60 23 C75 23 85 34 82 52 C80 44 76 38 60 37 C44 38 40 44 38 52Z'], false, color,
          hl('M44 32 C52 26 68 26 77 32', light, 1.4, .45) + hl('M42 44 C42 40 44 37 47 35', dark, 1, .5));
        break;
      case 'pixie':
        out.front = piece(p, 'f', ['M36 60 C30 36 41 18 60 18 C79 18 91 34 84 60 C84 47 80 39 73 35 C66 43 52 40 44 49 C41 52 38 56 36 60Z'], false, color,
          hl('M42 32 C54 22 70 21 82 31', light, 1.5, .45) + hl('M46 46 C52 41 60 40 66 41', light, 1, .3));
        break;
      case 'hood':
        out.hood = true;
        out.front = piece(p, 'f', ['M38 50 C38 38 47 33 60 33 C73 33 82 38 82 50 C79 42 72 39 60 39 C48 39 41 42 38 50Z'], false, color, '');
        break;
      case 'bob':
        out.back = piece(p, 'b', ['M32 92 C23 58 31 20 60 18 C89 20 97 58 88 92 L74 95 L74 54 L46 54 L46 95Z'], false, color, '');
        out.front = piece(p, 'f', ['M37 62 C31 36 42 18 60 18 C78 18 89 36 83 62 C83 50 78 41 70 37 C62 44 49 41 43 53 C40 56 38 59 37 62Z', 'M37 56 C34 70 35 82 33 92 L45 94 C47 82 45 68 44 54Z'], false, color,
          hl('M43 31 C53 22 69 22 80 31', light, 1.5, .45) + hl('M38 66 C38 76 38 84 37 90', light, 1, .3));
        out.front += piece(p, 'f2', ['M83 56 C86 70 85 82 87 92 L75 94 C73 82 75 68 76 54Z'], false, color, '');
        break;
      case 'locs':
        out.back = [[37, 38, 30, 12], [41.5, 42, 42, 6], [46, 46, 34, 0]].map((a, i) => locStrand(a[0], a[1], a[2], color, p, 'l' + i, a[3]) + locStrand(120 - a[0], a[1], a[2] + (i % 2 ? -4 : 6), color, p, 'r' + i, -a[3])).join('');
        out.front = piece(p, 'f', ['M38 54 C34 36 44 21 60 21 C76 21 86 36 82 54 C80 44 72 37 60 37 C48 37 40 44 38 54Z'], false, color,
          hl('M44 31 C53 24 68 24 77 31', light, 1.4, .45) +
          '<g stroke="' + dark + '" stroke-width="1" opacity=".5"><path d="M46 28 L45 38 M52 25 L51 36 M58 24 L58 35 M64 24 L65 35 M70 25 L72 36 M76 28 L79 38"/></g>');
        break;
      default:
        out.front = piece(p, 'f', ['M38 54 C34 34 44 21 60 21 C76 21 86 34 82 54 C80 44 72 37 60 37 C48 37 40 44 38 54Z'], false, color, '');
    }
    return out;
  }

  /* ---------- face parts ---------- */
  function eye(cx, side, look, T, c) {
    const fem = T.build === 'f', ix = cx - side * 5, ox = cx + side * 5;
    const iy = 54.4, oy = T.expr === 'focused' ? 54 : 53;
    const upper = 'M' + f(ix) + ' ' + iy + ' C' + f(ix + side * 1.8) + ' 50.4 ' + f(ox - side * 2.2) + ' ' + (oy - 3.4) + ' ' + f(ox) + ' ' + oy;
    const shape = upper + ' C' + f(ox - side * 2.4) + ' 56.9 ' + f(ix + side * 2) + ' 57.1 ' + f(ix) + ' ' + iy + 'Z';
    const cid = c.p + 'eye' + (side < 0 ? 'L' : 'R');
    const browColor = shade(c.hair, -.1), bw = fem ? 1.6 : 2.5;
    const inner = T.expr === 'focused' ? 3.4 : T.brow === 'angled' ? 2.4 : T.brow === 'arch' ? 1 : 1.3;
    const browD = T.brow === 'arch'
      ? 'M' + f(ix - side * .6) + ' ' + (49.4 + inner) + ' Q' + f(cx + side * .8) + ' ' + (45.8) + ' ' + f(ox + side * 2) + ' 49.2'
      : 'M' + f(ix - side * .6) + ' ' + (48.4 + inner) + ' Q' + f(cx + side * .4) + ' ' + (47 + inner * .2) + ' ' + f(ox + side * 2) + ' 48.6';
    let s = '<path d="M' + f(ix + side * 1) + ' 51.6 C' + f(cx - side * .4) + ' 49.2 ' + f(ox - side * 1.6) + ' 49.2 ' + f(ox + side * .8) + ' 51" fill="none" stroke="' + c.skinDeep + '" stroke-width=".9" opacity=".5"/>' +
      '<clipPath id="' + cid + '"><path d="' + shape + '"/></clipPath><path d="' + shape + '" fill="#f1ede9"/>' +
      '<g clip-path="url(#' + cid + ')"><circle cx="' + f(cx + side * .2) + '" cy="54" r="3.3" fill="' + look.iris + '"/><circle cx="' + f(cx + side * .2) + '" cy="54" r="3.3" fill="none" stroke="' + shade(look.iris, -.6) + '" stroke-width=".8"/>' +
      '<path d="M' + f(cx - 2 + side * .2) + ' 55.6 A2.3 2.3 0 0 0 ' + f(cx + 2 + side * .2) + ' 55.6" fill="none" stroke="' + shade(look.iris, .5) + '" stroke-width=".8" opacity=".75"/>' +
      '<circle cx="' + f(cx + side * .2) + '" cy="54" r="1.4" fill="#07080d"/><circle cx="' + f(cx - .8) + '" cy="52.8" r=".9" fill="#fff"/>' +
      '<rect x="' + f(ix - 2) + '" y="49" width="14" height="3.4" fill="' + c.skinDeep + '" opacity=".5"/></g>' +
      '<path d="' + upper + '" fill="none" stroke="' + INK + '" stroke-width="' + (fem ? 1.7 : 1.5) + '" stroke-linecap="round"/>' +
      '<path d="M' + f(ix) + ' ' + iy + ' C' + f(ix + side * 2) + ' 57.3 ' + f(ox - side * 2.4) + ' 57 ' + f(ox) + ' ' + (oy + .3) + '" fill="none" stroke="' + c.skinDeep + '" stroke-width=".6" opacity=".85"/>' +
      '<path d="M' + f(ix + side * 1.4) + ' 59 Q' + f(cx) + ' 60.2 ' + f(ox - side * .6) + ' 58.8" fill="none" stroke="' + c.skinDeep + '" stroke-width=".8" opacity=".3"/>';
    if (fem) s += '<path d="M' + f(ox) + ' ' + oy + ' L' + f(ox + side * 2.2) + ' ' + f(oy - 1.6) + '" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round"/>';
    if (T.liner) s += '<path d="M' + f(ix + side * .4) + ' ' + (iy - .4) + ' C' + f(ix + side * 1.8) + ' 50 ' + f(ox - side * 2.2) + ' ' + (oy - 3.8) + ' ' + f(ox + side * 4) + ' ' + (oy - 4.2) + '" fill="none" stroke="' + shade(look.accent, -.1) + '" stroke-width="1" stroke-linecap="round"/>';
    s += '<path d="' + browD + '" fill="none" stroke="' + browColor + '" stroke-width="' + bw + '" stroke-linecap="round"/>';
    return s;
  }

  function nose(c) {
    const d = c.skinDeep;
    return '<path d="M61.6 54 C62.6 59 63.2 63 64.2 67" fill="none" stroke="' + d + '" stroke-width="1.8" stroke-linecap="round" opacity=".3"/>' +
      '<path d="M58.4 55 C58 59 57.4 63 56.8 66.6" fill="none" stroke="' + c.skinHi + '" stroke-width="1.3" stroke-linecap="round" opacity=".32"/>' +
      '<ellipse cx="59.2" cy="67" rx="1.9" ry="1.3" fill="' + c.skinHi + '" opacity=".4"/>' +
      '<path d="M62.6 67.6 C65.4 67.2 66.6 69.8 64.2 71 C63 71.6 61.8 71.4 60.8 71" fill="none" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round" opacity=".75"/>' +
      '<path d="M57.4 67.6 C54.6 67.2 53.4 69.8 55.8 71 C57 71.6 58.2 71.4 59.2 71" fill="none" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round" opacity=".6"/>' +
      '<ellipse cx="58" cy="71" rx="1.3" ry=".6" fill="' + shade(d, -.5) + '"/><ellipse cx="62" cy="71" rx="1.3" ry=".6" fill="' + shade(d, -.5) + '"/>';
  }

  function mouth(T, c) {
    const fem = T.build === 'f';
    const lip = mix(c.skin, fem ? '#b13e62' : '#a8505a', fem ? .55 : .35), lipDark = shade(lip, -.3), line = mix(c.skin, '#2a0c18', .78);
    const e = T.expr;
    const cl = [52.4, e === 'grin' ? 76.6 : e === 'focused' ? 78.4 : 78];
    const cr = [67.6, e === 'grin' ? 76.6 : e === 'smirk' ? 76.2 : e === 'focused' ? 78.4 : 78];
    const mid = e === 'grin' ? 79.2 : 78.8;
    if (e === 'grin') {
      return '<path d="M' + cl[0] + ' ' + cl[1] + ' C54.6 80.2 57 81.2 60 81.2 C63 81.2 65.4 80.2 ' + cr[0] + ' ' + cr[1] + ' C65.4 76.8 63 76.4 60 76.6 C57 76.4 54.6 76.8 ' + cl[0] + ' ' + cl[1] + 'Z" fill="#2a0c14" stroke="' + INK + '" stroke-width=".8"/>' +
        '<path d="M53.6 77.6 C56 78.4 64 78.4 66.4 77.6 L65.8 79.4 C63.6 80.6 56.4 80.6 54.2 79.4Z" fill="#f4f0ec"/>' +
        '<path d="M52.4 77 C55 75 57.6 75.2 60 76 C62.4 75.2 65 75 67.6 77 C65 78 62.4 77.6 60 77.8 C57.6 77.6 55 78 52.4 77Z" fill="' + lip + '"/>' +
        '<path d="M54.4 80.4 C56 83 58 83.4 60 83.4 C62 83.4 64 83 65.6 80.4 C64 81.2 62 81.4 60 81.4 C58 81.4 56 81.2 54.4 80.4Z" fill="' + lip + '"/>' +
        '<path d="M51.4 75.4 Q50.6 76.8 51.6 78.2 M68.6 75.4 Q69.4 76.8 68.4 78.2" fill="none" stroke="' + c.skinDeep + '" stroke-width=".9" opacity=".6"/>';
    }
    return '<path d="M' + cl[0] + ' ' + cl[1] + ' C55 ' + (cl[1] - 2.4) + ' 57.6 ' + (cl[1] - 2.2) + ' 60 ' + (cl[1] - 1.4) + ' C62.4 ' + (cr[1] - 2.2) + ' 65 ' + (cr[1] - 2.4) + ' ' + cr[0] + ' ' + cr[1] + ' C65.4 ' + (cr[1] + 1.2) + ' 62.4 ' + (mid - .4) + ' 60 ' + (mid - .2) + ' C57.6 ' + (mid - .4) + ' 55 ' + (cl[1] + 1.2) + ' ' + cl[0] + ' ' + cl[1] + 'Z" fill="' + lipDark + '"/>' +
      '<path d="M53.6 ' + (mid - .2) + ' C56 ' + (mid + .1) + ' 58 ' + (mid + .1) + ' 60 ' + (mid + .1) + ' C62 ' + (mid + .1) + ' 64 ' + (mid + .1) + ' 66.4 ' + (mid - .2) + ' C65 ' + (mid + 3.6) + ' 62.6 ' + (mid + 4.4) + ' 60 ' + (mid + 4.4) + ' C57.4 ' + (mid + 4.4) + ' 55 ' + (mid + 3.6) + ' 53.6 ' + (mid - .2) + 'Z" fill="' + lip + '"/>' +
      '<path d="M56.8 ' + (mid + 1.6) + ' Q60 ' + (mid + 2.4) + ' 63.2 ' + (mid + 1.6) + '" fill="none" stroke="' + shade(lip, .4) + '" stroke-width=".9" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M' + cl[0] + ' ' + cl[1] + ' C55 ' + (mid + .4) + ' 57.6 ' + mid + ' 60 ' + (mid - .1) + ' C62.4 ' + (mid - .2) + ' 65.4 ' + (cr[1] + 1.8) + ' ' + cr[0] + ' ' + cr[1] + '" fill="none" stroke="' + line + '" stroke-width="1" stroke-linecap="round"/>' +
      (e === 'smirk' ? '<path d="M68.8 75.2 Q70.2 76.6 68.8 78" fill="none" stroke="' + c.skinDeep + '" stroke-width="1" stroke-linecap="round" opacity=".75"/>' : '') +
      '<path d="M57 ' + (mid + 5.4) + ' Q60 ' + (mid + 6.2) + ' 63 ' + (mid + 5.4) + '" fill="none" stroke="' + c.skinDeep + '" stroke-width="1" stroke-linecap="round" opacity=".3"/>';
  }

  /* ---------- clothing (absolute coordinates; torso starts y=90) ---------- */
  const P = (d, fill, sw) => '<path d="' + d + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 1) + '" stroke-linejoin="round"/>';
  const L = (d, col, w, o, dash) => '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (w || .8) + '" stroke-linecap="round" opacity="' + (o || .75) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  function zipper(x, y0, y1, color) {
    let s = '';
    for (let y = y0; y < y1; y += 2.4) s += '<path d="M' + (x - 1.2) + ' ' + y + ' L' + (x + 1.2) + ' ' + y + '" stroke="' + color + '" stroke-width=".8" opacity=".85"/>';
    return s + '<rect x="' + (x - 1.6) + '" y="' + (y0 - 1) + '" width="3.2" height="4.2" rx=".8" fill="' + color + '" stroke="' + INK + '" stroke-width=".6"/>';
  }

  function gearArt(look, T, p, emblemSvg) {
    const suit = look.suit, cape = look.cape, acc = look.accent, trim = look.trim;
    const sD = shade(suit, -.4), cD = shade(cape, -.4), aD = shade(acc, -.42), cL = shade(cape, .28), aL = shade(acc, .3);
    const torso = 'M3 120 C3 103 16 95 38 90 L82 90 C104 95 117 103 117 120Z';
    let s = P(torso, suit);
    switch (T.gear) {
      case 'racer':
        s += sym(P('M4 114 C6 101 18 95 36 92 L41 102 C30 104 22 109 20 120 L4 120Z', cape) + L('M8 108 C15 101 24 97 35 95', trim, 1.4, .9) + L('M10 113 C16 107 24 103 33 101', acc, 1.4, .9) +
          P('M18 112 L34 104 L34 110 L22 117Z', acc, .8)) +
          P('M42 86 C50 92 70 92 78 86 L82 98 C70 106 50 106 38 98Z', cape) + L('M42 92 C52 99 68 99 78 92', cD, 1, .8) + L('M44 87 C52 93 68 93 76 87', cL, 1, .6) +
          '<path d="M60 100 L60 120" stroke="' + INK + '" stroke-width="2.6"/>' + zipper(60, 100, 120, trim);
        break;
      case 'vest':
        s += sym(P('M40 91 C30 92 22 96 20 104 L18 120 L54 120 L58 104Z', cape)) +
          '<path d="M48 91 L60 108 L72 91Z" fill="' + sD + '" stroke="' + INK + '" stroke-width="1"/>' +
          sym(L('M30 95 L36 120', acc, 4, 1) + L('M30 95 L36 120', trim, .8, .7, '2 2') + P('M24 108 L34 108 L34 117 L24 117Z', shade(cape, -.15), .9) + L('M25 111 L33 111', trim, .8, .8)) +
          P('M55 112 L65 112 L65 118 L55 118Z', trim, .8) + L('M60 112 L60 118', INK, .8, .8) +
          L('M42 93 C50 100 54 104 58 108 M78 93 C70 100 66 104 62 108', cL, 1, .6);
        break;
      case 'hoodie':
        s += sym(P('M4 114 C6 102 16 96 32 93 L36 103 C26 106 20 110 18 120 L4 120Z', acc)) +
          P('M18 100 C26 89 42 85 60 89 C78 85 94 89 102 100 L106 114 C92 104 76 102 60 105 C44 102 28 104 14 114Z', cape) +
          P('M44 89 C50 98 70 98 76 89 L74 94 C68 101 52 101 46 94Z', '#0a0b12', .9) +
          L('M30 99 C38 94 46 93 52 95 M90 99 C82 94 74 93 68 95', cL, 1, .55) +
          sym(L('M54 100 L52 117', trim, 1.5, 1) + '<circle cx="52" cy="118" r="1.5" fill="' + trim + '" stroke="' + INK + '" stroke-width=".6"/>') +
          L('M60 106 L60 120', INK, 1.2, .5);
        break;
      case 'cowl':
        s += P('M82 94 C98 89 114 96 117 112 C106 108 94 108 86 113Z', acc) + L('M88 100 C98 98 108 102 113 108', trim, 1, .8) +
          P('M3 120 C4 108 14 100 28 97 L40 104 C32 107 26 112 24 120Z', cape) + L('M10 108 L36 116', trim, 1.1, .55) +
          P('M41 82 C50 89 70 89 79 82 L84 98 C72 107 48 107 36 98Z', cape) +
          L('M40 90 C52 97 68 97 80 90 M38 95 C52 102 68 102 82 95', cD, 1.1, .85) + L('M44 86 C52 92 68 92 76 86', cL, 1, .6) +
          L('M60 106 L60 120', trim, 1, .7);
        break;
      case 'armor':
        s += P('M42 88 C50 94 70 94 78 88 L86 98 C72 104 48 104 34 98Z', trim) + L('M44 92 C52 97 68 97 76 92', INK, .9, .5) +
          P('M40 99 L80 99 L87 120 L33 120Z', suit) + L('M60 99 L60 120', INK, 1.6, .6) + L('M47 106 L73 106 M45 112 L75 112', aD, 1.3, .85) + L('M41 102 L79 102', trim, 1, .6) +
          sym(P('M3 114 C0 98 14 90 36 92 L44 100 C32 100 22 106 20 120 L3 120Z', acc) + L('M4 106 C9 98 20 94 34 94', trim, 1.6, .9) + L('M6 112 C11 106 20 103 32 103', aD, 1.2, .9) + L('M8 118 C13 112 20 110 28 109', aD, 1.2, .8) + '<circle cx="13" cy="103" r="1.3" fill="' + trim + '" stroke="' + INK + '" stroke-width=".5"/>');
        break;
      case 'mantle':
        s = P('M1 120 C1 98 18 88 40 85 L80 85 C102 88 119 98 119 120Z', cape) +
          L('M14 108 C24 106 32 111 38 120 M106 108 C96 106 88 111 82 120 M30 94 C38 99 43 108 43 120 M90 94 C82 99 77 108 77 120', cD, 1.5, .7) +
          P('M36 84 L46 100 L60 108 L74 100 L84 84 L72 87 L60 100 L48 87Z', suit) + L('M36 84 L46 100 L60 108 L74 100 L84 84', trim, 1.2, .95) +
          P('M47 102 C52 106 68 106 73 102 L71 111 C66 115 54 115 49 111Z', acc, .9) +
          P('M60 107 L55.6 114 L60 121 L64.4 114Z', trim, .9) + '<path d="M60 109.4 L57.6 114 L60 118 L62.4 114Z" fill="' + look.iris + '" opacity=".9"/>' +
          L('M14 100 C22 98 30 100 36 106', trim, 1, .6, '2 2');
        break;
      default: // jacket
        s += sym(P('M4 114 C6 101 18 95 36 92 L41 102 C30 105 22 110 20 120 L4 120Z', acc) + L('M8 108 C15 101 24 97 35 95', trim, 1.4, .9) + L('M10 113 C16 107 24 103 33 101', trim, 1, .6)) +
          '<path d="M46 90 L60 110 L74 90Z" fill="#0d0f17" stroke="' + INK + '" stroke-width="1"/>' + L('M52 96 L60 105 L68 96', acc, 1.2, .9) +
          sym(P('M45 87 L36 96 L50 116 L60 108Z', cape) + L('M45 88 L38 96', cL, 1.2, .7) + L('M50 100 L55 109', cD, 1, .8)) +
          L('M60 110 L60 120', INK, 2.4, 1) + zipper(60, 110, 120, trim) + L('M30 110 L44 120 M90 110 L76 120', trim, .8, .5, '2 2');
    }
    const clip = '<clipPath id="' + p + 'sh"><path d="M0 120 C0 96 16 88 38 84 L82 84 C104 88 120 96 120 120Z"/></clipPath>' +
      '<g clip-path="url(#' + p + 'sh)"><path d="M64 86 C74 98 82 108 84 122 L130 122 L130 86Z" fill="#070510" opacity=".38"/></g>';
    const patch = T.gear === 'mantle' ? '' : '<g transform="translate(-17 4)"><circle cx="60" cy="109.4" r="6.8" fill="' + sD + '" stroke="' + INK + '" stroke-width="1"/><circle cx="60" cy="109.4" r="5.4" fill="none" stroke="' + trim + '" stroke-width=".6" opacity=".8"/>' + emblemSvg + '</g>';
    return s + clip + patch;
  }

  /* ---------- extras ---------- */
  function accessoryBack(look) {
    if (look.accessory === 'domino') return '<path d="M38.4 51 Q49 46 60 52.4 Q71 46 81.6 51 Q82.6 59.8 73 60 Q65.6 60 60 56.2 Q54.4 60 47 60 Q37.4 59.8 38.4 51Z" fill="#0f1119" stroke="' + INK + '" stroke-width=".8"/><path d="M38.8 51.4 Q49 46.6 60 52.8 Q71 46.6 81.2 51.4" fill="none" stroke="' + look.accent + '" stroke-width=".9" opacity=".85"/>';
    return '';
  }
  function accessoryFront(look) {
    const a = look.accessory;
    if (a === 'headband') return '<path d="M38.2 41 C48 36 72 36 81.8 41 L81.4 46.4 C72 41.6 48 41.6 38.6 46.4Z" fill="' + look.accent + '" stroke="' + INK + '" stroke-width="1"/><path d="M39 42.6 C48 38 72 38 81 42.6" fill="none" stroke="' + look.trim + '" stroke-width=".8" opacity=".8"/><circle cx="60" cy="39.8" r="2.4" fill="' + look.trim + '" stroke="' + INK + '" stroke-width=".8"/>';
    if (a === 'earring') return '<circle cx="38.2" cy="66.2" r="2" fill="none" stroke="' + look.trim + '" stroke-width="1.3"/><circle cx="38.2" cy="69.2" r="1.6" fill="' + look.trim + '" stroke="' + INK + '" stroke-width=".6"/>';
    if (a === 'halo') return '<ellipse cx="60" cy="14" rx="20" ry="4.6" fill="none" stroke="' + INK + '" stroke-width="4.4"/><ellipse cx="60" cy="14" rx="20" ry="4.6" fill="none" stroke="#e8b93e" stroke-width="2.6"/><ellipse cx="60" cy="13.4" rx="20" ry="4.6" fill="none" stroke="#fff6c8" stroke-width=".9" opacity=".85"/>';
    if (a === 'crown') return '<path d="M42 30 L43 15 L52 22 L60 9 L68 22 L77 15 L78 30Z" fill="#e0b13a" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/><path d="M42 30 L78 30" stroke="#fff0b0" stroke-width="1.4"/><circle cx="60" cy="18" r="2" fill="#ff5a7a" stroke="' + INK + '" stroke-width=".5"/><circle cx="48" cy="24" r="1.3" fill="#6ae0ff"/><circle cx="72" cy="24" r="1.3" fill="#6ae0ff"/>';
    return '';
  }
  function signature(look, T, R) {
    let s = '';
    if (T.glasses) s += '<g fill="rgba(140,210,255,.16)" stroke="' + INK + '" stroke-width="1.4"><rect x="43" y="49" width="15" height="12" rx="4.5"/><rect x="62" y="49" width="15" height="12" rx="4.5"/></g><path d="M58 53.4 Q60 52 62 53.4 M43 53 L38.6 52 M77 53 L81.4 52" fill="none" stroke="' + INK + '" stroke-width="1.2"/><path d="M45.6 51.4 L50 50.4" stroke="#fff" stroke-width=".9" opacity=".6" stroke-linecap="round"/>';
    if (T.earcuff) s += '<path d="M38.4 56 C36.4 56 36 59.4 38 60.4" fill="none" stroke="' + look.trim + '" stroke-width="1.3"/><circle cx="37.2" cy="62.4" r="1.2" fill="' + look.trim + '" stroke="' + INK + '" stroke-width=".4"/>';
    if (T.earrings) s += '<circle cx="38" cy="66" r="2.3" fill="none" stroke="#e8b93e" stroke-width="1.4"/><circle cx="82" cy="66" r="2.3" fill="none" stroke="#e8b93e" stroke-width="1.4"/>';
    if (T.pierce) s += '<circle cx="82" cy="60" r="1.1" fill="#cfd8ea" stroke="' + INK + '" stroke-width=".5"/><circle cx="82.4" cy="63.4" r="1.1" fill="#cfd8ea" stroke="' + INK + '" stroke-width=".5"/>';
    if (T.nosestud) s += '<circle cx="63.8" cy="69" r="1" fill="#f6e7a8" stroke="' + INK + '" stroke-width=".4"/>';
    if (T.headset) s += '<path d="M37.8 56 C35 44 40 30 60 29 C80 30 85 44 82.2 56" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/><path d="M37.8 56 C35 44 40 30 60 29 C80 30 85 44 82.2 56" fill="none" stroke="#2a3040" stroke-width="2" stroke-linecap="round"/><rect x="34" y="52" width="5.4" height="11" rx="2" fill="#1d2230" stroke="' + INK + '" stroke-width="1"/><rect x="35.2" y="54.4" width="2.4" height="6" rx="1" fill="' + look.accent + '"/><path d="M36.6 63 C36 69 40 72 46 73" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/><circle cx="46.6" cy="73" r="1.8" fill="' + look.accent + '" stroke="' + INK + '" stroke-width=".7"/>';
    if (T.gem) s += '<path d="M60 38 L62.4 41.4 L60 45 L57.6 41.4Z" fill="' + look.accent + '" stroke="' + INK + '" stroke-width=".8"/><circle cx="52" cy="42.6" r=".8" fill="' + look.trim + '"/><circle cx="68" cy="42.6" r=".8" fill="' + look.trim + '"/>';
    if (T.mole) s += '<circle cx="67.4" cy="73.4" r=".8" fill="' + shade(R.skinDeep, -.4) + '"/>';
    if (T.scar === 'browR') s += '<path d="M71 46.6 L75.6 56.6" stroke="' + R.scar + '" stroke-width="1.5" stroke-linecap="round"/><path d="M71.6 46.8 L76 56.4" stroke="' + R.skinHi + '" stroke-width=".5" opacity=".7"/><path d="M70.2 50 L73 49 M72.2 53.4 L75 52.4" stroke="' + R.scar + '" stroke-width=".7"/>';
    if (T.scar === 'cheekL') s += '<path d="M45 62 L51.4 68.4" stroke="' + R.scar + '" stroke-width="1.5" stroke-linecap="round"/><path d="M45.6 61.8 L52 68" stroke="' + R.skinHi + '" stroke-width=".5" opacity=".7"/><path d="M46.2 66 L48.4 64 M49.2 68.4 L51 66.4" stroke="' + R.scar + '" stroke-width=".7"/>';
    return s;
  }

  /* ---------- the portrait ---------- */
  window.drawArenaCharacter = function (id, look, p, frameSvg, emblemSvg) {
    const T = TRAITS[id] || TRAITS.nova, J = JAWS[T.jaw], skin = look.skin;
    const c = {p, hair: look.hair, skin, skinHi: mix(skin, '#fff2dc', .32), skinDeep: mix(skin, '#2c1233', .5), skinShade: mix(skin, '#4a2a62', .3), scar: mix(skin, '#8a3a4a', .55)};
    const rand = rng(id + look.skin + look.style);
    const face = facePath(J), hair = hairShape(look.style, look.hair, p), fem = T.build === 'f';
    const nw = fem ? 8.6 : 11, chin = J.chin;

    let dots = '';
    if (T.freckles) for (let i = 0; i < T.freckles; i++) {
      const x = 60 + (rand() - .5) * 32, y = 60 + rand() * 11;
      if (Math.abs(x - 60) < 3.6 && y > 63) continue;
      dots += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(.45 + rand() * .45) + '" fill="' + mix(skin, '#8a4a28', .6) + '" opacity="' + f(.55 + rand() * .3) + '"/>';
    }
    const beardColor = T.beard === 'grey' ? mix(look.hair, '#b8b8c4', .6) : look.hair;
    let beard = '';
    if (T.beard) beard = '<path d="M39.8 58 C38.6 76 46 90 60 91 C74 90 81.4 76 80.2 58 C78.4 69 74 73.6 68.8 75.6 L51.2 75.6 C46 73.6 41.6 69 39.8 58Z" fill="' + beardColor + '" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M66 71 C74 70 80 64 80.2 58 C81 76 74 90 60 91 L60 79Z" fill="' + shade(beardColor, -.42) + '" opacity=".55"/>' +
      '<path d="M45 72 C47 81 53 86 60 87 M75 72 C73 81 67 86 60 87" fill="none" stroke="' + shade(beardColor, .35) + '" stroke-width="1" opacity=".4" stroke-linecap="round"/>' +
      '<path d="M52 75 C55 72.8 58 73.6 60 74.2 C62 73.6 65 72.8 68 75 C66 76.6 63 76.2 60 76.2 C57 76.2 54 76.6 52 75Z" fill="' + beardColor + '" stroke="' + INK + '" stroke-width=".7"/>';
    const stubble = T.stubble ? '<path d="M41 62 C42 76 50 87 60 88 C70 87 78 76 79 62 C75.6 72 68 71.6 60 72.4 C52 71.6 44.4 72 41 62Z" fill="url(#' + p + 'stub)" opacity="' + f(T.stubble + .3) + '"/>' : '';

    const hoodBack = hair.hood ? '<path d="M19 102 C12 50 30 10 60 8 C90 10 108 50 101 102 L106 124 L14 124Z" fill="' + look.cape + '" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/><path d="M66 8 C97 14 109 54 101 102 L106 124 L130 124 L130 8Z" fill="#070510" opacity=".32"/><path d="M26 44 C21 66 22 86 25 100 M94 44 C99 66 98 86 95 100" fill="none" stroke="' + shade(look.cape, -.42) + '" stroke-width="1.5" opacity=".6"/>' +
      '<path d="M31 70 C28 38 41 22 60 22 C79 22 92 38 89 70 C85 44 75 33 60 33 C45 33 35 44 31 70Z" fill="#0a0810"/>' : '';
    const hoodRim = hair.hood ? '<path d="M31 70 C28 38 41 22 60 22 C79 22 92 38 89 70" fill="none" stroke="' + INK + '" stroke-width="5"/><path d="M31 70 C28 38 41 22 60 22 C79 22 92 38 89 70" fill="none" stroke="' + look.cape + '" stroke-width="3.4"/><path d="M34 64 C33 40 44 26 60 26 C76 26 87 40 86 64" fill="none" stroke="' + shade(look.cape, .3) + '" stroke-width=".9" opacity=".7"/>' : '';

    const defs =
      '<clipPath id="' + p + 'clip"><circle cx="60" cy="60" r="57"/></clipPath>' +
      '<clipPath id="' + p + 'face"><path d="' + face + '"/></clipPath>' +
      '<radialGradient id="' + p + 'vig" cx="50%" cy="44%" r="64%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>' +
      '<linearGradient id="' + p + 'fgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#d9a52a"/><stop offset="1" stop-color="#fff3b8"/></linearGradient>' +
      '<linearGradient id="' + p + 'frainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a7a"/><stop offset=".25" stop-color="#ffd24a"/><stop offset=".5" stop-color="#5aff9a"/><stop offset=".75" stop-color="#4ab8ff"/><stop offset="1" stop-color="#b06aff"/></linearGradient>' +
      '<linearGradient id="' + p + 'ffire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d2e"/><stop offset=".6" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>' +
      '<filter id="' + p + 'glowf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<pattern id="' + p + 'stub" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".6" r=".36" fill="' + look.hair + '"/><circle cx="1.6" cy="1.6" r=".32" fill="' + look.hair + '"/></pattern>';

    const bg =
      '<rect width="120" height="120" fill="' + mix(look.accent, '#0b0e17', .84) + '"/>' +
      '<path d="M0 0 L62 0 L24 120 L0 120Z" fill="' + look.accent + '" opacity=".18"/><path d="M120 6 L120 120 L80 120Z" fill="' + look.accent + '" opacity=".14"/>' +
      '<path d="M0 84 L120 36" stroke="' + look.trim + '" stroke-width=".7" opacity=".16"/>';

    const neck =
      '<path d="M' + (60 - nw) + ' 72 L' + (60 - nw - 1) + ' 102 L' + (60 + nw + 1) + ' 102 L' + (60 + nw) + ' 72Z" fill="' + skin + '" stroke="' + INK + '" stroke-width="1"/>' +
      '<path d="M61 72 L' + (60 + nw) + ' 72 L' + (60 + nw + 1) + ' 102 L61 102Z" fill="' + c.skinShade + '" opacity=".8"/>' +
      '<path d="M' + (60 - nw) + ' 72 L' + (60 + nw) + ' 72 L' + (60 + nw) + ' ' + (chin + 9) + ' Q60 ' + (chin + 14) + ' ' + (60 - nw) + ' ' + (chin + 9) + 'Z" fill="' + c.skinDeep + '" opacity=".65"/>';

    const head =
      '<path d="M39.6 50 C35 49 34 57 36.2 62 C37.4 65 39.8 65.8 40.6 64.4Z" fill="' + skin + '" stroke="' + INK + '" stroke-width="1"/><path d="M37.6 53 C36.8 56.4 37.4 60 38.8 62" fill="none" stroke="' + c.skinDeep + '" stroke-width=".9" opacity=".7"/>' +
      '<path d="M80.4 50 C85 49 86 57 83.8 62 C82.6 65 80.2 65.8 79.4 64.4Z" fill="' + c.skinShade + '" stroke="' + INK + '" stroke-width="1"/><path d="M82.4 53 C83.2 56.4 82.6 60 81.2 62" fill="none" stroke="' + c.skinDeep + '" stroke-width=".9" opacity=".7"/>' +
      '<path d="' + face + '" fill="' + skin + '"/>' +
      '<g clip-path="url(#' + p + 'face)">' +
      '<path d="M64 24 C71.4 42 69 60 63.6 80 C62.6 84 63 88 63.4 92 L100 92 L100 24Z" fill="' + c.skinShade + '" opacity=".7"/>' +
      '<path d="M40 40 C48 48 72 48 80 40 L80 24 L40 24Z" fill="' + c.skinDeep + '" opacity=".4"/>' +
      '<ellipse cx="45.6" cy="62.4" rx="3.4" ry="5.6" transform="rotate(-14 45.6 62.4)" fill="' + c.skinHi + '" opacity=".25"/>' +
      '<ellipse cx="51" cy="43" rx="7" ry="2.4" fill="' + c.skinHi + '" opacity=".22"/>' +
      '<ellipse cx="46.4" cy="67" rx="4.6" ry="3.2" fill="' + mix(skin, '#e0506a', .5) + '" opacity="' + (fem ? .22 : .1) + '"/><ellipse cx="73.6" cy="67" rx="4.6" ry="3.2" fill="' + mix(skin, '#e0506a', .5) + '" opacity="' + (fem ? .16 : .07) + '"/>' +
      '<path d="M60 83.4 L60 86" stroke="' + c.skinDeep + '" stroke-width="1.8" opacity=".16" stroke-linecap="round"/>' +
      dots + stubble + '</g>' +
      '<path d="' + face + '" fill="none" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' +
      beard + accessoryBack(look) +
      eye(51, -1, look, T, c) + eye(69, 1, look, T, c) + nose(c) + mouth(T, c) + signature(look, T, c) +
      hair.front + hoodRim + accessoryFront(look) +
      '<path d="M81.4 54 C83.6 61 82.8 71 78.4 80" fill="none" stroke="' + look.accent + '" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>';

    return '<svg class="arena-character-art" viewBox="0 0 120 120" role="img" aria-label="' + look.name + ' character portrait">' +
      '<defs>' + defs + '</defs>' +
      '<g clip-path="url(#' + p + 'clip)">' + bg +
      '<g transform="translate(0 -4)">' + hoodBack + hair.back + neck + '</g>' +
      '<g transform="translate(0 -4)">' + gearArt(look, T, p, emblemSvg) + '</g>' +
      '<g transform="translate(0 -4)">' + head + '</g>' +
      '<rect width="120" height="120" fill="url(#' + p + 'vig)"/>' +
      '</g>' + frameSvg + '</svg>';
  };
})();
