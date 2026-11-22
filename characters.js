/* =====================================================================
   ARENA ROSTER — character portrait renderer
   One art direction for every hero: three-quarter-lit bust portraits,
   hard-edged cel shading, a cool purple shadow tone, warm key light from the
   upper left, an accent-colored rim light from the right, film grain and
   real clothing construction (collars, seams, straps, plates, stitching).
   Customization (skin, hair, eyes, suit, emblem, extras, frame) still comes in
   through the `look` object; per-hero traits below give every hero a unique
   silhouette, face structure and personality.
   ===================================================================== */
(function () {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const toRgb = h => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const toHex = r => '#' + r.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A.map((x, i) => x * (1 - t) + B[i] * t)); };
  const shade = (c, t) => t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t);
  const f = n => (Math.round(n * 100) / 100);

  /* Per-hero identity: face structure, expression, signature details and clothing. */
  const TRAITS = {
    nova:{jaw:'square', gear:'jacket', expr:'calm',  brow:'straight', stubble:.22, scar:'browR', build:'m'},
    kai: {jaw:'square', gear:'racer',  expr:'smirk', brow:'angled',   stubble:.55, headset:true, build:'m'},
    zara:{jaw:'oval',   gear:'vest',   expr:'smirk', brow:'arch',     freckles:26, earcuff:true, build:'f'},
    axel:{jaw:'sharp',  gear:'hoodie', expr:'focused', brow:'straight', stubble:.3, glasses:true, build:'m'},
    luna:{jaw:'oval',   gear:'cowl',   expr:'calm',  brow:'arch',     mole:true, build:'f'},
    jett:{jaw:'square', gear:'armor',  expr:'grin',  brow:'angled',   beard:'full', build:'m'},
    rex: {jaw:'square', gear:'jacket', expr:'smirk', brow:'angled',   stubble:.35, scar:'cheekL', pierce:true, build:'m'},
    mira:{jaw:'oval',   gear:'mantle', expr:'calm',  brow:'arch',     freckles:12, gem:true, build:'f'},
    sol: {jaw:'round',  gear:'armor',  expr:'calm',  brow:'straight', beard:'grey', earrings:true, build:'m'},
    nyx: {jaw:'sharp',  gear:'cowl',   expr:'smirk', brow:'angled',   liner:true, nosestud:true, build:'f'}
  };

  function rng(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }

  /* ---------- face geometry ---------- */
  const JAWS = {square:{hw:21.5, jw:15.5, chin:85, cut:3.4}, oval:{hw:20, jw:11, chin:86, cut:1}, sharp:{hw:20.5, jw:9.5, chin:87, cut:.4}, round:{hw:22, jw:14, chin:84.5, cut:1.6}};
  function facePath(j) {
    const L = 60 - j.hw, R = 60 + j.hw, jl = 60 - j.jw, jr = 60 + j.jw, ch = j.chin;
    return 'M' + L + ' 50 C' + L + ' 35 ' + (L + 6) + ' 28 60 28 C' + (R - 6) + ' 28 ' + R + ' 35 ' + R + ' 50 L' + (R - .6) + ' 62 ' +
      'C' + (R - 1.2) + ' 70 ' + (jr + 5) + ' ' + (ch - 10) + ' ' + jr + ' ' + (ch - 4.4) + ' L' + f(60 + j.cut) + ' ' + ch + ' Q60 ' + (ch + 1.2) + ' ' + f(60 - j.cut) + ' ' + ch + ' L' + jl + ' ' + (ch - 4.4) + ' ' +
      'C' + (jl - 5) + ' ' + (ch - 10) + ' ' + (L + 1.2) + ' 70 ' + (L + .6) + ' 62Z';
  }

  /* ---------- hair ---------- */
  function hairShape(style, hairColor, p, n) {
    // returns {back, front} where front is drawn above the face. Each mass gets a hard shadow + strand texture.
    const dark = shade(hairColor, -.42), mid = shade(hairColor, -.2), light = shade(hairColor, .34);
    const strand = (d, c, w, o) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (w || .9) + '" stroke-linecap="round" opacity="' + (o === undefined ? .55 : o) + '"/>';
    let id = 0;
    const mass = (d, shadowD, strands) => {
      const cid = p + 'hc' + n + '_' + (id++);
      return '<clipPath id="' + cid + '"><path d="' + d + '"/></clipPath><path d="' + d + '" fill="' + hairColor + '"/>' +
        '<g clip-path="url(#' + cid + ')"><path d="' + (shadowD || 'M66 10 C74 30 72 56 64 92 L130 92 L130 10Z') + '" fill="' + dark + '" opacity=".62"/>' + (strands || '') + '</g>' +
        '<path d="' + d + '" fill="none" stroke="' + dark + '" stroke-width=".7" opacity=".55"/>';
    };
    switch (style) {
      case 'spiky': return {back:'', front:
        mass('M38 52 C34 38 38 30 40 26 L42 17 L49 26 L54 11 L60 25 L66 9 L71 24 L78 14 L79 27 C85 30 86 40 82 52 C80 44 76 40 70 38 C62 36 52 38 47 40 C42 43 40 47 38 52Z', 'M63 4 C72 24 74 40 70 56 L100 56 L100 4Z',
          strand('M46 26 C48 32 50 35 52 38', light, .9) + strand('M56 14 C57 24 58 31 59 36', light, .9, .45) + strand('M69 22 C68 29 68 33 69 37', dark, 1, .7) + strand('M74 28 C75 33 76 36 76 39', dark, 1, .6))};
      case 'long': return {
        back: mass('M33 102 C24 64 26 28 60 20 C94 28 96 64 87 102 L78 108 L42 108Z', 'M64 20 C84 40 80 80 70 108 L100 108 L100 20Z', strand('M38 40 C34 62 36 84 38 100', light, .9, .35) + strand('M82 40 C86 62 84 84 82 100', dark, 1, .5)),
        front: mass('M60 22 C46 22 38 32 37 48 C36 62 35 78 33 96 L41 98 C44 82 45 68 45 56 C46 46 51 38 60 35 C69 38 74 46 75 56 C75 68 76 82 79 98 L87 96 C85 78 84 62 83 48 C82 32 74 22 60 22Z', 'M64 22 C80 26 84 44 84 62 L100 62 L100 22Z',
          strand('M52 27 C45 31 41 38 40 50', light, .9) + strand('M44 40 C42 56 41 72 39 90', light, .9, .35) + strand('M70 26 C75 31 79 38 80 50', dark, 1, .5) + strand('M78 46 C80 62 81 76 83 90', dark, 1, .5))};
      case 'afro': return {
        back: '',
        front: mass('M37 52 C26 50 24 38 30 31 C27 22 36 14 46 16 C50 8 62 6 69 12 C79 10 88 17 86 27 C94 32 94 46 83 52 C82 44 78 38 72 36 C64 41 54 41 47 36 C41 39 38 45 37 52Z', 'M66 6 C86 14 92 32 84 54 L110 54 L110 4Z',
          strand('M40 28 C44 22 50 19 56 18', light, 1, .5) + strand('M58 14 C64 14 68 16 71 19', light, 1, .45) + strand('M30 40 C32 36 35 34 38 33', dark, 1, .6) + strand('M80 22 C84 26 86 30 86 34', dark, 1, .6) + strand('M48 29 q3 -3 6 0 q3 3 6 0 q3 -3 6 0', light, .8, .35))};
      case 'mohawk': return {
        back: '',
        front: '<path d="M39 50 C37 36 44 28 60 28 C76 28 83 36 81 50 C80 42 74 38 60 38 C46 38 40 42 39 50Z" fill="' + hairColor + '" opacity=".28"/>' +
          mass('M51 40 C46 32 47 23 52 17 L56 21 L60 12 L64 21 L68 17 C73 23 74 32 69 40 C65 37 55 37 51 40Z', 'M61 3 C68 14 71 28 69 42 L90 42 L90 3Z', strand('M55 34 C55 26 56 18 58 10', light, 1, .55) + strand('M64 34 C65 26 64 18 62 9', dark, 1, .6))};
      case 'swept': return {
        back: '',
        front: mass('M38 52 C34 32 44 21 62 21 C79 21 88 32 82 52 C81 43 77 37 71 35 C67 40 59 39 52 42 C46 40 42 44 40 48 C39 49 38 50 38 52Z', 'M66 20 C80 26 86 40 82 54 L110 54 L110 18Z',
          strand('M44 34 C54 25 68 24 80 33', light, 1, .5) + strand('M42 42 C52 34 66 32 77 36', light, .9, .45) + strand('M48 40 C58 36 68 36 74 34', dark, 1, .5) + strand('M70 26 C76 28 80 31 82 38', dark, 1, .5))};
      case 'crop': return {
        back: '',
        front: mass('M39 50 C36 33 46 24 60 24 C74 24 84 33 81 50 C80 42 75 37 66 36 C56 36 46 36 41 44 C40 46 39 48 39 50Z', 'M64 24 C78 26 84 38 81 52 L100 52 L100 24Z',
          strand('M44 33 C52 27 66 26 76 31', light, 1, .5) + strand('M46 38 C56 33 68 33 78 38', light, .8, .4) + strand('M40 46 C41 40 43 37 46 35', dark, 1, .5))};
      case 'pixie': return {
        back: mass('M35 68 C28 40 40 22 60 22 C80 22 92 40 85 68 C83 60 83 54 84 48 L36 48 C37 54 37 60 35 68Z', 'M64 22 C86 30 88 52 85 70 L110 70 L110 22Z'),
        front: mass('M37 56 C32 32 44 20 62 20 C80 20 90 32 83 56 C84 46 80 38 73 35 C66 43 54 38 43 47 C40 50 39 53 37 56Z', 'M66 20 C84 26 88 42 83 58 L110 58 L110 18Z',
          strand('M43 32 C54 23 70 23 82 33', light, 1, .5) + strand('M46 44 C54 36 66 34 74 38', light, .9, .4) + strand('M40 52 C39 44 41 38 44 34', dark, 1, .5))};
      case 'hood': return {
        back: '<path d="M22 98 C16 50 30 14 60 12 C90 14 104 50 98 98 L102 120 L18 120Z" fill="' + shade(hairColor, 0) + '" opacity="0"/>',
        hoodBack: true,
        front: mass('M38 48 C37 36 46 30 60 30 C74 30 83 36 82 48 C79 40 72 37 60 37 C48 37 41 40 38 48Z', 'M64 30 C78 31 83 40 82 50 L100 50 L100 30Z', strand('M44 38 C54 33 66 33 76 38', light, .9, .45))};
      case 'bob': return {
        back: mass('M33 88 C26 62 28 30 60 21 C92 30 94 62 87 88 C83 91 80 86 79 80 L79 52 L41 52 L41 80 C40 86 37 91 33 88Z', 'M64 21 C90 34 90 66 87 90 L110 90 L110 21Z', strand('M34 50 C32 64 33 76 35 84', light, .9, .35)),
        front: mass('M38 54 C36 32 46 22 60 22 C74 22 84 32 82 54 C79 41 70 35 60 35 C50 35 41 41 38 54Z M38 54 C37 66 38 76 35 86 L41 88 C43 78 43 66 42 52Z M82 54 C83 66 82 76 85 86 L79 88 C77 78 77 66 78 52Z', 'M64 22 C80 26 84 42 82 58 L100 58 L100 22Z',
          strand('M44 34 C54 27 68 27 78 34', light, 1, .5) + strand('M60 24 C58 28 58 32 60 35', dark, .9, .5) + strand('M36 60 C36 70 37 78 37 84', light, .8, .35))};
      case 'locs': return {
        back: (() => {
          let s = '';
          const lengths = [38, 54, 44, 42, 56, 36];
          [[32.5, 48], [39.5, 54], [46, 60]].forEach((pt, i) => { s += locStrand(pt[0], pt[1], lengths[i], hairColor, dark, light, p, n + 'l' + i); s += locStrand(120 - pt[0], pt[1], lengths[i + 3], hairColor, dark, light, p, n + 'r' + i); });
          return s; })(),
        front: mass('M38 52 C34 34 44 22 60 22 C76 22 86 34 82 52 C79 43 71 37 60 37 C49 37 41 43 38 52Z', 'M64 22 C82 28 86 42 82 54 L100 54 L100 22Z',
          strand('M44 34 C54 26 68 26 78 34', light, 1, .5) + '<g fill="none" stroke="' + dark + '" stroke-width=".7" opacity=".55"><path d="M46 28 L44 38 M52 25 L51 36 M58 24 L58 35 M64 24 L65 35 M70 25 L72 36 M76 28 L79 38"/></g>')};
      default: return {back:'', front:mass('M38 52 C34 32 44 21 62 21 C79 21 88 32 82 52 C80 43 72 37 60 37 C48 37 40 43 38 52Z')};
    }
  }
  function locStrand(x, y, len, hairColor, dark, light, p, key) {
    const w = 5, cid = p + 'lc' + key;
    const d = 'M' + (x - w / 2) + ' ' + y + ' L' + (x - w / 2 - .6) + ' ' + (y + len) + ' Q' + x + ' ' + (y + len + 4) + ' ' + (x + w / 2 + .6) + ' ' + (y + len) + ' L' + (x + w / 2) + ' ' + y + 'Z';
    let rings = '';
    for (let k = 12; k < len; k += 11) rings += '<path d="M' + (x - w / 2) + ' ' + (y + k) + ' L' + (x + w / 2) + ' ' + (y + k - 1.2) + '" stroke="' + dark + '" stroke-width=".8" opacity=".7"/>';
    return '<clipPath id="' + cid + '"><path d="' + d + '"/></clipPath><path d="' + d + '" fill="' + hairColor + '"/><g clip-path="url(#' + cid + ')"><rect x="' + (x + .4) + '" y="' + y + '" width="6" height="' + (len + 6) + '" fill="' + dark + '" opacity=".55"/><rect x="' + (x - w / 2 + .6) + '" y="' + y + '" width="1" height="' + (len + 6) + '" fill="' + light + '" opacity=".5"/></g>' + rings +
      '<circle cx="' + x + '" cy="' + (y + len - 2) + '" r="1.5" fill="#d9b45a" stroke="#6b4d12" stroke-width=".4"/>';
  }

  /* ---------- face parts ---------- */
  function eye(cx, side, look, T, c) {
    const w = 4.8, ix = cx - side * w, ox = cx + side * w, fem = T.build === 'f';
    const iy = 55.0, oy = T.expr === 'focused' ? 54.6 : 54.0;
    const upper = 'M' + f(ix) + ' ' + iy + ' C' + f(ix + side * 2.2) + ' 51.7 ' + f(ox - side * 2) + ' ' + (oy - 2.6) + ' ' + f(ox) + ' ' + oy;
    const shape = upper + ' C' + f(ox - side * 2) + ' 57.0 ' + f(ix + side * 2.2) + ' 57.4 ' + f(ix) + ' ' + iy + 'Z';
    const cid = c.p + 'eye' + (side < 0 ? 'L' : 'R');
    const lid = '#16121c';
    const browColor = shade(c.hair, -.12);
    const browW = fem ? 1.5 : 2.3;
    const inner = T.expr === 'focused' ? 3.6 : T.brow === 'angled' ? 2.6 : T.brow === 'arch' ? 1.6 : 1.9;
    const browD = T.brow === 'arch'
      ? 'M' + f(ix - side * .4) + ' ' + (50.6 + (inner - 1.9)) + ' Q' + f(cx + side * .6) + ' ' + (47.6 + (inner - 2.5)) + ' ' + f(ox + side * 1.8) + ' 50.2'
      : 'M' + f(ix - side * .4) + ' ' + (49.6 + inner * .6) + ' Q' + f(cx + side * .4) + ' ' + (48.2 + inner * .1) + ' ' + f(ox + side * 1.8) + ' 49.8';
    let s = '<ellipse cx="' + f(cx) + '" cy="52.4" rx="6.6" ry="3.2" fill="' + c.skinDeep + '" opacity=".28"/>' +
      '<path d="M' + f(ix + side * 1) + ' 52.7 C' + f(cx - side * .5) + ' 50.7 ' + f(ox - side * 1.4) + ' 50.6 ' + f(ox + side * .6) + ' 52.3" fill="none" stroke="' + c.skinDeep + '" stroke-width=".8" opacity=".55"/>' +
      '<clipPath id="' + cid + '"><path d="' + shape + '"/></clipPath><path d="' + shape + '" fill="#ebe7e4"/>' +
      '<g clip-path="url(#' + cid + ')"><circle cx="' + f(cx + side * .3) + '" cy="54.3" r="2.7" fill="' + look.iris + '"/><circle cx="' + f(cx + side * .3) + '" cy="54.3" r="2.7" fill="none" stroke="' + shade(look.iris, -.55) + '" stroke-width=".7"/>' +
      '<path d="M' + f(cx - 1.6 + side * .3) + ' 55.6 A2 2 0 0 0 ' + f(cx + 1.6 + side * .3) + ' 55.6" fill="none" stroke="' + shade(look.iris, .45) + '" stroke-width=".7" opacity=".7"/>' +
      '<circle cx="' + f(cx + side * .3) + '" cy="54.3" r="1.1" fill="#07080d"/><circle cx="' + f(cx - .7) + '" cy="53.4" r=".7" fill="#fff"/>' +
      '<rect x="' + f(ix - 2) + '" y="50" width="' + (w * 2 + 4) + '" height="2.7" fill="' + c.skinDeep + '" opacity=".5"/></g>' +
      '<path d="' + upper + '" fill="none" stroke="' + lid + '" stroke-width="' + (fem ? 1.5 : 1.25) + '" stroke-linecap="round"/>' +
      '<path d="M' + f(ix) + ' ' + iy + ' C' + f(ix + side * 2.2) + ' 57.4 ' + f(ox - side * 2) + ' 57.1 ' + f(ox) + ' ' + (oy + .4) + '" fill="none" stroke="' + c.skinDeep + '" stroke-width=".55" opacity=".8"/>' +
      '<path d="M' + f(ix + side * 1.4) + ' 58.6 Q' + f(cx) + ' 59.6 ' + f(ox - side * .6) + ' 58.4" fill="none" stroke="' + c.skinDeep + '" stroke-width=".7" opacity=".32"/>';
    if (fem) s += '<path d="M' + f(ox) + ' ' + oy + ' L' + f(ox + side * 2) + ' ' + f(oy - 1.5) + '" stroke="' + lid + '" stroke-width="1.1" stroke-linecap="round"/>';
    if (T.liner) s += '<path d="M' + f(ix + side * .6) + ' ' + (iy - .2) + ' C' + f(ix + side * 2.2) + ' 51.6 ' + f(ox - side * 2) + ' ' + (oy - 2.8) + ' ' + f(ox + side * 3.4) + ' ' + (oy - 3.6) + '" fill="none" stroke="' + shade(look.accent, -.2) + '" stroke-width=".9" stroke-linecap="round"/>';
    s += '<path d="' + browD + '" fill="none" stroke="' + browColor + '" stroke-width="' + browW + '" stroke-linecap="round"/>';
    return s;
  }

  function nose(c) {
    const d = c.skinDeep;
    return '<path d="M61.8 53 C62.8 58 63.4 62 64.4 66.4" fill="none" stroke="' + d + '" stroke-width="1.7" stroke-linecap="round" opacity=".3"/>' +
      '<path d="M58.4 54 C58 58.6 57.4 62 56.8 66" fill="none" stroke="' + c.skinHi + '" stroke-width="1.2" stroke-linecap="round" opacity=".28"/>' +
      '<ellipse cx="59.4" cy="66.4" rx="1.8" ry="1.3" fill="' + c.skinHi + '" opacity=".4"/>' +
      '<path d="M62.4 67 C65 66.6 66.2 69 64 70.4 C62.8 71 61.6 70.8 60.8 70.4" fill="none" stroke="' + d + '" stroke-width=".9" stroke-linecap="round" opacity=".55"/>' +
      '<path d="M57.6 67 C55 66.6 53.8 69 56 70.4 C57.2 71 58.4 70.8 59.2 70.4" fill="none" stroke="' + d + '" stroke-width=".9" stroke-linecap="round" opacity=".45"/>' +
      '<ellipse cx="58.2" cy="70.3" rx="1.3" ry=".6" fill="' + shade(d, -.5) + '" opacity=".75"/><ellipse cx="61.8" cy="70.3" rx="1.3" ry=".6" fill="' + shade(d, -.5) + '" opacity=".8"/>' +
      '<path d="M55 71.8 Q60 74 65 71.8" fill="none" stroke="' + d + '" stroke-width="1.1" opacity=".22" stroke-linecap="round"/>';
  }

  function mouth(T, c) {
    const fem = T.build === 'f';
    const lip = mix(c.skin, fem ? '#b13e62' : '#a8505a', fem ? .5 : .32), lipDark = shade(lip, -.28), line = mix(c.skin, '#2a0c18', .72);
    const e = T.expr;
    const cl = [52.2, e === 'grin' ? 76.3 : e === 'focused' ? 78 : 77.6];
    const cr = [67.8, e === 'grin' ? 76.3 : e === 'smirk' ? 76.0 : e === 'focused' ? 78 : 77.6];
    const mid = e === 'grin' ? 78.8 : 78.4;
    if (e === 'grin') {
      return '<path d="M' + cl[0] + ' ' + cl[1] + ' C54.6 ' + 79.8 + ' 57 80.8 60 80.8 C63 80.8 65.4 79.8 ' + cr[0] + ' ' + cr[1] + ' C65.4 76.4 63 76 60 76.2 C57 76 54.6 76.4 ' + cl[0] + ' ' + cl[1] + 'Z" fill="#2a0c14"/>' +
        '<path d="M53.4 77.2 C56 78 64 78 66.6 77.2 L66 79 C63.6 80.2 56.4 80.2 54 79Z" fill="#f4f0ec"/>' +
        '<path d="M52.4 76.6 C55 74.6 57.6 74.8 60 75.6 C62.4 74.8 65 74.6 67.6 76.6 C65 77.6 62.4 77.2 60 77.4 C57.6 77.2 55 77.6 52.4 76.6Z" fill="' + shade(lip, -.1) + '"/>' +
        '<path d="M54.4 80 C56 82.6 58 83 60 83 C62 83 64 82.6 65.6 80 C64 80.8 62 81 60 81 C58 81 56 80.8 54.4 80Z" fill="' + lip + '"/>' +
        '<path d="M51.4 75 Q50.6 76.4 51.6 77.8 M68.6 75 Q69.4 76.4 68.4 77.8" fill="none" stroke="' + c.skinDeep + '" stroke-width=".8" opacity=".5"/>';
    }
    const lineD = 'M' + cl[0] + ' ' + cl[1] + ' C55 ' + (mid + .4) + ' 57.6 ' + mid + ' 60 ' + (mid - .1) + ' C62.4 ' + (mid - .2) + ' 65.4 ' + (cr[1] + 1.8) + ' ' + cr[0] + ' ' + cr[1];
    return '<path d="M' + cl[0] + ' ' + cl[1] + ' C55 ' + (cl[1] - 2.4) + ' 57.6 ' + (cl[1] - 2.2) + ' 60 ' + (cl[1] - 1.4) + ' C62.4 ' + (cr[1] - 2.2) + ' 65 ' + (cr[1] - 2.4) + ' ' + cr[0] + ' ' + cr[1] + ' C65.4 ' + (cr[1] + 1.2) + ' 62.4 ' + (mid - .4) + ' 60 ' + (mid - .2) + ' C57.6 ' + (mid - .4) + ' 55 ' + (cl[1] + 1.2) + ' ' + cl[0] + ' ' + cl[1] + 'Z" fill="' + lipDark + '"/>' +
      '<path d="M53.6 ' + (mid - .2) + ' C56 ' + (mid + .1) + ' 58 ' + (mid + .1) + ' 60 ' + (mid + .1) + ' C62 ' + (mid + .1) + ' 64 ' + (mid + .1) + ' 66.4 ' + (mid - .2) + ' C65 ' + (mid + 3.6) + ' 62.6 ' + (mid + 4.4) + ' 60 ' + (mid + 4.4) + ' C57.4 ' + (mid + 4.4) + ' 55 ' + (mid + 3.6) + ' 53.6 ' + (mid - .2) + 'Z" fill="' + lip + '"/>' +
      '<path d="M56.8 ' + (mid + 1.6) + ' Q60 ' + (mid + 2.4) + ' 63.2 ' + (mid + 1.6) + '" fill="none" stroke="' + shade(lip, .35) + '" stroke-width=".9" stroke-linecap="round" opacity=".6"/>' +
      '<path d="' + lineD + '" fill="none" stroke="' + line + '" stroke-width=".95" stroke-linecap="round"/>' +
      (e === 'smirk' ? '<path d="M68.8 74.9 Q70 76.2 68.8 77.6" fill="none" stroke="' + c.skinDeep + '" stroke-width=".9" stroke-linecap="round" opacity=".7"/>' : '') +
      '<path d="M57 ' + (mid + 5.2) + ' Q60 ' + (mid + 6) + ' 63 ' + (mid + 5.2) + '" fill="none" stroke="' + c.skinDeep + '" stroke-width="1" stroke-linecap="round" opacity=".28"/>';
  }

  /* ---------- clothing ---------- */
  function fabric(p, id, color, dir) {
    return '<pattern id="' + p + id + '" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(' + (dir || 35) + ')"><rect width="3" height="3" fill="' + color + '"/><rect width="1" height="3" fill="' + shade(color, -.18) + '" opacity=".55"/></pattern>';
  }
  const stitch = (d, c, o) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width=".7" stroke-dasharray="1.6 1.4" opacity="' + (o || .75) + '"/>';
  const edge = (d, fill, sw) => '<path d="' + d + '" fill="' + fill + '" stroke="rgba(6,8,14,.65)" stroke-width="' + (sw || .8) + '" stroke-linejoin="round"/>';
  function gearArt(look, T, p, c, emblemSvg) {
    const suit = look.suit, cape = look.cape, acc = look.accent, trim = look.trim;
    const sDark = shade(suit, -.4), cDark = shade(cape, -.38), aDark = shade(acc, -.42), cLight = shade(cape, .22);
    const body = (d) => edge(d, 'url(#' + p + 'fab)') + '<path d="' + d + '" fill="' + sDark + '" opacity=".0"/>';
    const shadowHalf = '<path d="M66 88 C74 96 80 108 82 120 L130 120 L130 88Z" fill="#05060c" opacity=".38"/>';
    const folds = '<path d="M30 106 C36 108 42 114 44 120 M90 106 C84 108 78 114 76 120 M52 106 C54 111 54 116 52 120" fill="none" stroke="#05060c" stroke-width="1.1" opacity=".35" stroke-linecap="round"/><path d="M34 100 C38 102 42 104 44 108 M86 100 C82 102 78 104 76 108" fill="none" stroke="' + shade(suit, .3) + '" stroke-width=".9" opacity=".3" stroke-linecap="round"/>';
    let s = '', front = '';
    const torso = 'M12 120 C12 104 24 95 44 91 L76 91 C96 95 108 104 108 120Z';
    const patch = '<g transform="translate(-16 4)"><circle cx="60" cy="109.4" r="7.2" fill="' + sDark + '" stroke="' + trim + '" stroke-width=".8"/>' + emblemSvg + '</g>';
    switch (T.gear) {
      case 'racer':
        s = body(torso) + shadowHalf + folds +
          edge('M16 112 L104 112 L106 117 L14 117Z', acc) + '<path d="M16 112 L104 112" stroke="' + trim + '" stroke-width=".7" opacity=".6"/>' +
          edge('M13 108 C14 100 22 95 32 92 L38 98 C30 100 24 104 22 112Z M107 108 C106 100 98 95 88 92 L82 98 C90 100 96 104 98 112Z', cape) +
          '<path d="M16 104 L21 99 M104 104 L99 99" stroke="' + trim + '" stroke-width="1.6" opacity=".8"/>' +
          edge('M44 88 C48 84 72 84 76 88 L78 100 C70 96 50 96 42 100Z', cape) + '<path d="M44 88 C48 84 72 84 76 88" fill="none" stroke="' + trim + '" stroke-width="1.1" opacity=".7"/>' +
          '<path d="M44 92 C52 90 68 90 76 92" fill="none" stroke="' + cDark + '" stroke-width="1" opacity=".7"/>' +
          '<path d="M60 98 L60 120" stroke="' + sDark + '" stroke-width="2.4"/>' + zipper(60, 98, 120, trim) + patch;
        break;
      case 'vest':
        s = '<path d="M12 120 C12 104 22 96 40 92 L80 92 C98 96 108 104 108 120Z" fill="' + cape + '" stroke="rgba(6,8,14,.6)" stroke-width=".8"/>' + shadowHalf +
          '<path d="M44 90 C52 98 68 98 76 90 L78 96 C68 106 52 106 42 96Z" fill="' + cDark + '"/>' +
          edge('M26 96 L46 120 L64 120 L44 92Z', suit) + edge('M94 96 L74 120 L56 120 L76 92Z', suit) +
          '<path d="M26 96 L46 120 M94 96 L74 120" stroke="' + acc + '" stroke-width="3.4" stroke-linecap="round"/><path d="M26 96 L46 120 M94 96 L74 120" stroke="' + trim + '" stroke-width=".8" opacity=".6" stroke-dasharray="2 2"/>' +
          edge('M38 106 L47 106 L47 113 L38 113Z M73 106 L82 106 L82 113 L73 113Z', trim, .6) + '<path d="M40 108 L45 108 M75 108 L80 108" stroke="' + sDark + '" stroke-width=".9"/>' +
          '<path d="M44 92 C52 100 68 100 76 92" fill="none" stroke="' + shade(cape, .25) + '" stroke-width="1" opacity=".6"/>' + patch;
        break;
      case 'hoodie':
        s = body(torso) + shadowHalf + folds +
          edge('M24 100 C32 88 48 86 60 90 C72 86 88 88 96 100 L98 110 C86 102 72 100 60 102 C48 100 34 102 22 110Z', cape) +
          '<path d="M32 98 C42 92 52 92 58 96 M88 98 C78 92 68 92 62 96" fill="none" stroke="' + cDark + '" stroke-width="1.2" opacity=".7"/>' +
          '<path d="M52 98 L50 114 M68 98 L70 114" stroke="' + trim + '" stroke-width="1.3" stroke-linecap="round"/><circle cx="50" cy="115" r="1.4" fill="' + trim + '"/><circle cx="70" cy="115" r="1.4" fill="' + trim + '"/>' +
          '<path d="M60 102 L60 120" stroke="' + sDark + '" stroke-width="1.2" opacity=".7"/>' +
          edge('M13 108 C14 102 20 98 26 96 L30 104 C24 106 22 112 22 118Z', acc) + patch;
        break;
      case 'cowl':
        s = body(torso) + shadowHalf + folds +
          edge('M13 110 C14 100 22 95 32 92 L40 98 C32 102 28 108 28 116Z M107 110 C106 100 98 95 88 92 L80 98 C88 102 92 108 92 116Z', cape) +
          '<path d="M30 110 L50 120 M90 110 L70 120" stroke="' + acc + '" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>' +
          edge('M42 84 C50 90 70 90 78 84 L80 98 C70 104 50 104 40 98Z', cape) +
          '<path d="M43 90 C52 96 68 96 77 90 M42 95 C52 101 68 101 78 95" fill="none" stroke="' + cDark + '" stroke-width="1" opacity=".75"/><path d="M44 86 C52 92 68 92 76 86" fill="none" stroke="' + cLight + '" stroke-width=".9" opacity=".6"/>' +
          '<path d="M56 106 L56 120" stroke="' + trim + '" stroke-width=".9" opacity=".7"/>' + patch;
        break;
      case 'armor':
        s = body(torso) + shadowHalf +
          edge('M44 94 L76 94 L82 120 L38 120Z', acc) + '<path d="M44 94 L76 94 L82 120" fill="none" stroke="' + trim + '" stroke-width=".9" opacity=".6"/>' +
          '<path d="M50 100 L70 100 M49 105 L71 105 M48 110 L72 110" stroke="' + aDark + '" stroke-width="1.2" opacity=".7"/>' +
          edge('M10 112 C8 98 20 90 36 92 L42 100 C32 100 24 106 22 118Z', cape) + edge('M110 112 C112 98 100 90 84 92 L78 100 C88 100 96 106 98 118Z', cape) +
          '<path d="M12 104 C16 96 24 93 34 93 M108 104 C104 96 96 93 86 93" fill="none" stroke="' + trim + '" stroke-width="1.6" opacity=".85"/>' +
          '<path d="M14 108 C18 102 26 100 34 101 M106 108 C102 102 94 100 86 101" fill="none" stroke="' + aDark + '" stroke-width="1" opacity=".7"/>' +
          edge('M42 86 C50 90 70 90 78 86 L80 94 C70 98 50 98 40 94Z', trim) + '<circle cx="60" cy="96" r="2.2" fill="' + aDark + '"/>' + patch;
        break;
      case 'mantle':
        s = '<path d="M8 120 C8 100 20 90 40 86 L80 86 C100 90 112 100 112 120Z" fill="url(#' + p + 'cape)" stroke="rgba(6,8,14,.65)" stroke-width=".8"/>' + shadowHalf +
          '<path d="M16 108 C24 106 32 110 38 120 M104 108 C96 106 88 110 82 120 M34 96 C40 100 44 108 44 120 M86 96 C80 100 76 108 76 120" fill="none" stroke="' + cDark + '" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>' +
          edge('M38 80 L46 98 L60 104 L74 98 L82 80 L72 84 L60 96 L48 84Z', suit) +
          '<path d="M38 80 L46 98 L60 104 L74 98 L82 80" fill="none" stroke="' + trim + '" stroke-width="1.2" opacity=".85"/>' +
          edge('M48 100 C52 104 68 104 72 100 L70 108 C66 112 54 112 50 108Z', acc, .6) +
          '<path d="M60 104 L56 111 L60 118 L64 111Z" fill="' + trim + '" stroke="' + aDark + '" stroke-width=".7"/><path d="M60 106 L58 111 L60 115 L62 111Z" fill="' + look.iris + '" opacity=".85"/>' +
          '<path d="M16 100 C22 98 30 99 36 104" fill="none" stroke="' + trim + '" stroke-width=".9" opacity=".6" stroke-dasharray="2 2"/>';
        break;
      default: // jacket
        s = body(torso) + shadowHalf + folds +
          edge('M13 108 C14 100 22 95 32 92 L40 98 C30 101 24 106 22 114Z M107 108 C106 100 98 95 88 92 L80 98 C90 101 96 106 98 114Z', acc) +
          '<path d="M16 104 C20 99 26 96 32 94 M104 104 C100 99 94 96 88 94" fill="none" stroke="' + trim + '" stroke-width="1.2" opacity=".75"/>' +
          edge('M42 86 L54 102 L48 108 L36 94Z M78 86 L66 102 L72 108 L84 94Z', cape) + '<path d="M42 86 L54 102 M78 86 L66 102" stroke="' + trim + '" stroke-width=".9" opacity=".7"/>' +
          '<path d="M60 102 L60 120" stroke="' + sDark + '" stroke-width="2.2"/>' + zipper(60, 102, 120, trim) +
          stitch('M30 108 L46 120 M90 108 L74 120', trim, .5) + patch;
        break;
    }
    return s;
  }
  function zipper(x, y0, y1, color) {
    let s = '';
    for (let y = y0; y < y1; y += 2.6) s += '<path d="M' + (x - 1.3) + ' ' + y + ' L' + (x + 1.3) + ' ' + y + '" stroke="' + color + '" stroke-width=".8" opacity=".8"/>';
    return s + '<rect x="' + (x - 1.5) + '" y="' + y0 + '" width="3" height="4" rx=".8" fill="' + color + '" stroke="rgba(0,0,0,.5)" stroke-width=".4"/>';
  }

  /* ---------- extras (customizable accessories + hero signature gear) ---------- */
  function accessoryBack(look, c) {
    if (look.accessory === 'domino') return '<path d="M38.4 52 Q49 47 60 53.4 Q71 47 81.6 52 Q82.6 60.8 73 61 Q65.6 61 60 57.2 Q54.4 61 47 61 Q37.4 60.8 38.4 52Z" fill="#0f1119" opacity=".95"/><path d="M38.4 52 Q49 47 60 53.4 Q71 47 81.6 52" fill="none" stroke="' + look.accent + '" stroke-width=".9" opacity=".8"/>';
    return '';
  }
  function accessoryFront(look) {
    const a = look.accessory;
    if (a === 'headband') return '<path d="M38.2 42 C48 37 72 37 81.8 42 L81.4 47 C72 42.2 48 42.2 38.6 47Z" fill="' + look.accent + '" stroke="rgba(6,8,14,.6)" stroke-width=".7"/><path d="M38.4 43.6 C48 38.6 72 38.6 81.6 43.6" fill="none" stroke="' + look.trim + '" stroke-width=".7" opacity=".7"/><circle cx="60" cy="40.6" r="2.4" fill="' + look.trim + '" stroke="rgba(6,8,14,.5)" stroke-width=".5"/>';
    if (a === 'earring') return '<circle cx="38.2" cy="66.2" r="2" fill="none" stroke="' + look.trim + '" stroke-width="1.2"/><circle cx="38.2" cy="69" r="1.5" fill="' + look.trim + '" stroke="rgba(6,8,14,.4)" stroke-width=".4"/>';
    if (a === 'halo') return '<ellipse cx="60" cy="13" rx="20" ry="4.6" fill="none" stroke="#e8b93e" stroke-width="2.6"/><ellipse cx="60" cy="12.4" rx="20" ry="4.6" fill="none" stroke="#fff6c8" stroke-width=".9" opacity=".85"/>';
    if (a === 'crown') return '<path d="M42 28 L44 14 L52 21 L60 9 L68 21 L76 14 L78 28Z" fill="#e0b13a" stroke="#6b4d12" stroke-width=".8"/><path d="M42 28 L78 28" stroke="#fff0b0" stroke-width="1.2"/><circle cx="60" cy="17" r="2" fill="#ff5a7a"/><circle cx="48" cy="22" r="1.3" fill="#6ae0ff"/><circle cx="72" cy="22" r="1.3" fill="#6ae0ff"/>';
    return '';
  }
  function signature(look, T, c, R) {
    let s = '';
    if (T.glasses) s += '<g fill="rgba(120,200,255,.14)" stroke="#12161f" stroke-width="1.2"><circle cx="51" cy="54.6" r="7.6"/><circle cx="69" cy="54.6" r="7.6"/></g><path d="M58.6 54 Q60 52.6 61.4 54 M43.4 53.6 L38.6 52 M76.6 53.6 L81.4 52" fill="none" stroke="#12161f" stroke-width="1.1"/><path d="M45.6 50.2 Q48 48.6 51 49" fill="none" stroke="#fff" stroke-width=".8" opacity=".55" stroke-linecap="round"/>';
    if (T.earcuff) s += '<path d="M38.4 56 C36.4 56 36 59.4 38 60.4" fill="none" stroke="' + look.trim + '" stroke-width="1.2"/><circle cx="37.2" cy="62.4" r="1.1" fill="' + look.trim + '"/>';
    if (T.earrings) s += '<circle cx="38" cy="66" r="2.3" fill="none" stroke="#e8b93e" stroke-width="1.3"/><circle cx="82" cy="66" r="2.3" fill="none" stroke="#e8b93e" stroke-width="1.3"/>';
    if (T.pierce) s += '<circle cx="82" cy="60" r="1" fill="#cfd8ea" stroke="#3a4050" stroke-width=".4"/><circle cx="82.4" cy="63.4" r="1" fill="#cfd8ea" stroke="#3a4050" stroke-width=".4"/>';
    if (T.nosestud) s += '<circle cx="63.6" cy="68.6" r=".9" fill="#f6e7a8" stroke="#6b4d12" stroke-width=".3"/>';
    if (T.headset) s += '<path d="M37.8 56 C35 44 40 30 60 29 C80 30 85 44 82.2 56" fill="none" stroke="#161a24" stroke-width="2.6" stroke-linecap="round"/><rect x="34.4" y="52" width="5" height="10" rx="2" fill="#1d2230" stroke="' + look.accent + '" stroke-width=".9"/><path d="M36.4 62 C36 68 40 71 46 72" fill="none" stroke="#161a24" stroke-width="1.3" stroke-linecap="round"/><circle cx="46.6" cy="72" r="1.6" fill="' + look.accent + '"/>';
    if (T.gem) s += '<path d="M60 39 L62.2 42 L60 45 L57.8 42Z" fill="' + look.accent + '" stroke="' + look.trim + '" stroke-width=".6"/><circle cx="52" cy="43.6" r=".7" fill="' + look.trim + '"/><circle cx="68" cy="43.6" r=".7" fill="' + look.trim + '"/>';
    if (T.mole) s += '<circle cx="67.4" cy="73.4" r=".7" fill="' + shade(R.skinDeep, -.4) + '"/>';
    if (T.scar === 'browR') s += '<path d="M71 47.6 L75.6 56.6" stroke="' + R.scar + '" stroke-width="1.3" stroke-linecap="round"/><path d="M71.6 47.8 L76 56.4" stroke="' + R.skinHi + '" stroke-width=".4" opacity=".6"/><path d="M70.4 51 L73 50 M72.4 54.2 L75 53" stroke="' + R.scar + '" stroke-width=".6"/>';
    if (T.scar === 'cheekL') s += '<path d="M45 62 L51.4 68.4" stroke="' + R.scar + '" stroke-width="1.3" stroke-linecap="round"/><path d="M45.6 61.8 L52 68" stroke="' + R.skinHi + '" stroke-width=".4" opacity=".6"/><path d="M46.2 66 L48.4 64 M49.2 68.4 L51 66.4" stroke="' + R.scar + '" stroke-width=".6"/>';
    return s;
  }

  /* ---------- the portrait ---------- */
  window.drawArenaCharacter = function (id, look, p, frameSvg, emblemSvg) {
    const T = TRAITS[id] || TRAITS.nova;
    const J = JAWS[T.jaw];
    const skin = look.skin;
    const c = {
      p, hair: look.hair, skin,
      skinHi: mix(skin, '#fff2dc', .3), skinDeep: mix(skin, '#2c1233', .46), skinShade: mix(skin, '#3b1c46', .26),
      scar: mix(skin, '#8a3a4a', .55)
    };
    const rand = rng(id + look.skin + look.style);
    const face = facePath(J);
    const hair = hairShape(look.style, look.hair, p, '');
    const fem = T.build === 'f';
    const nw = fem ? 8.4 : 10.4;
    const chin = J.chin;
    // dots: pores/freckles
    let dots = '';
    for (let i = 0; i < 16; i++) dots += '<circle cx="' + f(41 + rand() * 38) + '" cy="' + f(40 + rand() * 40) + '" r="' + f(.25 + rand() * .3) + '" fill="' + c.skinDeep + '" opacity="' + f(.12 + rand() * .16) + '"/>';
    if (T.freckles) for (let i = 0; i < T.freckles; i++) {
      const x = 60 + (rand() - .5) * 30, y = 61 + rand() * 10;
      if (Math.abs(x - 60) < 3.4 && y > 64) continue;
      dots += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(.4 + rand() * .45) + '" fill="' + mix(skin, '#8a4a28', .62) + '" opacity="' + f(.5 + rand() * .3) + '"/>';
    }
    const beardColor = T.beard === 'grey' ? mix(look.hair, '#b8b8c0', .55) : look.hair;
    let beard = '';
    if (T.beard) beard = '<path d="M40.6 60 C39.6 76 47 90 60 91 C73 90 80.4 76 79.4 60 C77.6 70 74 73.4 68.8 75.4 L51.2 75.4 C46 73.4 42.4 70 40.6 60Z" fill="' + beardColor + '"/>' +
      '<path d="M66 70 C74 70 80 64 79.4 60 C80 76 73 90 60 91 L60 78Z" fill="' + shade(beardColor, -.4) + '" opacity=".55"/>' +
      '<path d="M44 70 C46 80 52 86 60 87 M76 70 C74 80 68 86 60 87 M50 78 C54 82 58 84 60 84" fill="none" stroke="' + shade(beardColor, .3) + '" stroke-width=".8" opacity=".35"/>' +
      '<path d="M52 74.6 C55 72.4 58 73.2 60 73.8 C62 73.2 65 72.4 68 74.6 C66 76.2 63 75.8 60 75.8 C57 75.8 54 76.2 52 74.6Z" fill="' + beardColor + '"/>';
    const stubble = T.stubble ? '<path d="M41.4 62 C42 76 50 87 60 88 C70 87 78 76 78.6 62 C75.6 72 68 71.6 60 72.4 C52 71.6 44.4 72 41.4 62Z" fill="url(#' + p + 'stub)" opacity="' + f(T.stubble + .25) + '"/>' : '';
    const hoodBack = hair.hoodBack ? '<path d="M20 100 C13 50 30 12 60 10 C90 12 107 50 100 100 L104 120 L16 120Z" fill="' + look.cape + '" stroke="rgba(6,8,14,.6)" stroke-width=".9"/><path d="M20 100 C13 50 30 12 60 10 C90 12 107 50 100 100" fill="none" stroke="' + shade(look.cape, .25) + '" stroke-width="1.2" opacity=".6"/><path d="M66 10 C96 14 108 54 100 100 L104 120 L130 120 L130 10Z" fill="#05060c" opacity=".3"/><path d="M30 40 C24 62 24 82 28 98 M90 40 C96 62 96 82 92 98" fill="none" stroke="' + shade(look.cape, -.4) + '" stroke-width="1.4" opacity=".6"/>' +
      '<path d="M32 66 C30 36 42 24 60 24 C78 24 90 36 88 66 C84 40 74 32 60 32 C46 32 36 40 32 66Z" fill="#07080d" opacity=".85"/>' : '';
    const hoodRim = hair.hoodBack ? '<path d="M32 66 C30 36 42 24 60 24 C78 24 90 36 88 66" fill="none" stroke="' + look.cape + '" stroke-width="3.4"/><path d="M34 62 C33 38 44 27 60 27 C76 27 87 38 86 62" fill="none" stroke="' + shade(look.cape, .28) + '" stroke-width=".8" opacity=".7"/>' : '';

    return '<svg class="arena-character-art" viewBox="0 0 120 120" role="img" aria-label="' + look.name + ' character portrait">' +
      '<defs>' +
      '<clipPath id="' + p + 'clip"><circle cx="60" cy="60" r="57"/></clipPath>' +
      '<clipPath id="' + p + 'face"><path d="' + face + '"/></clipPath>' +
      '<radialGradient id="' + p + 'vig" cx="50%" cy="46%" r="62%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>' +
      '<linearGradient id="' + p + 'cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(look.cape, .12) + '"/><stop offset="1" stop-color="' + shade(look.cape, -.4) + '"/></linearGradient>' +
      '<linearGradient id="' + p + 'fgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#d9a52a"/><stop offset="1" stop-color="#fff3b8"/></linearGradient>' +
      '<linearGradient id="' + p + 'frainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a7a"/><stop offset=".25" stop-color="#ffd24a"/><stop offset=".5" stop-color="#5aff9a"/><stop offset=".75" stop-color="#4ab8ff"/><stop offset="1" stop-color="#b06aff"/></linearGradient>' +
      '<linearGradient id="' + p + 'ffire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d2e"/><stop offset=".6" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>' +
      '<filter id="' + p + 'glowf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + p + 'grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="' + (id.length * 7 + 3) + '" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.28"/></filter>' +
      '<pattern id="' + p + 'stub" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".6" r=".34" fill="' + look.hair + '"/><circle cx="1.6" cy="1.6" r=".3" fill="' + look.hair + '"/></pattern>' +
      fabric(p, 'fab', look.suit, 35) +
      '</defs>' +
      '<g clip-path="url(#' + p + 'clip)">' +
      '<rect width="120" height="120" fill="' + mix(look.accent, '#0b0e17', .86) + '"/>' +
      '<path d="M0 0 L64 0 L26 120 L0 120Z" fill="' + look.accent + '" opacity=".16"/><path d="M120 10 L120 120 L84 120Z" fill="' + look.accent + '" opacity=".12"/>' +
      '<path d="M0 78 L120 40" stroke="' + look.trim + '" stroke-width=".6" opacity=".14"/><circle cx="60" cy="52" r="40" fill="none" stroke="' + look.accent + '" stroke-width="1" opacity=".16"/>' +
      '<g transform="translate(60 63) scale(1.2) translate(-60 -64)">' +
      hoodBack + hair.back +
      // neck
      '<path d="M' + (60 - nw) + ' 74 L' + (60 - nw - .6) + ' 98 Q60 108 ' + (60 + nw + .6) + ' 98 L' + (60 + nw) + ' 74Z" fill="' + skin + '"/>' +
      '<path d="M62 74 L' + (60 + nw) + ' 74 L' + (60 + nw + .6) + ' 98 Q64 104 62 104Z" fill="' + c.skinShade + '" opacity=".75"/>' +
      '<path d="M' + (60 - nw) + ' 78 Q60 ' + (chin + 10) + ' ' + (60 + nw) + ' 78 L' + (60 + nw) + ' 100 L' + (60 - nw) + ' 100Z" fill="' + c.skinDeep + '" opacity=".7"/>' +
      (fem ? '' : '<path d="M53 90 L56.6 100 M67 90 L63.4 100" stroke="' + c.skinDeep + '" stroke-width="1" opacity=".5" stroke-linecap="round"/>') +
      gearArt(look, T, p, c, emblemSvg) +
      // ears
      '<path d="M39.6 50 C35.2 49 34.4 56.6 36.4 61.6 C37.6 64.6 39.8 65.4 40.6 64.2Z" fill="' + skin + '"/><path d="M37.6 52.6 C36.8 56 37.4 60 38.8 62" fill="none" stroke="' + c.skinDeep + '" stroke-width=".8" opacity=".6"/>' +
      '<path d="M80.4 50 C84.8 49 85.6 56.6 83.6 61.6 C82.4 64.6 80.2 65.4 79.4 64.2Z" fill="' + c.skinShade + '"/><path d="M82.4 52.6 C83.2 56 82.6 60 81.2 62" fill="none" stroke="' + c.skinDeep + '" stroke-width=".8" opacity=".6"/>' +
      // face
      '<path d="' + face + '" fill="' + skin + '"/>' +
      '<g clip-path="url(#' + p + 'face)">' +
      '<path d="M64 24 C71 42 68.6 60 63.4 80 C62.4 84 62.6 88 63 91 L100 92 L100 24Z" fill="' + c.skinShade + '" opacity=".62"/>' +
      '<path d="M66 40 C72 52 72 64 68 76 L100 80 L100 40Z" fill="' + c.skinDeep + '" opacity=".2"/>' +
      '<path d="M40 38 C48 46 72 46 80 38 L80 24 L40 24Z" fill="' + c.skinDeep + '" opacity=".45"/>' +
      '<path d="M40 66 C42 76 50 84 60 85 C50 82 44 76 41 66Z" fill="' + c.skinHi + '" opacity=".16"/>' +
      '<ellipse cx="45.6" cy="62.4" rx="3.4" ry="5.6" transform="rotate(-14 45.6 62.4)" fill="' + c.skinHi + '" opacity=".26"/>' +
      '<ellipse cx="50" cy="42" rx="7" ry="2.4" fill="' + c.skinHi + '" opacity=".2"/>' +
      '<ellipse cx="46.4" cy="67" rx="4.6" ry="3.2" fill="' + mix(skin, '#e0506a', .5) + '" opacity="' + (fem ? .2 : .1) + '"/><ellipse cx="73.6" cy="67" rx="4.6" ry="3.2" fill="' + mix(skin, '#e0506a', .5) + '" opacity="' + (fem ? .15 : .07) + '"/>' +
      '<path d="M59 79 Q60 80.4 61 79" fill="none" stroke="' + c.skinDeep + '" stroke-width=".8" opacity=".3"/>' +
      '<path d="M60 83.4 Q60 85 60 86" stroke="' + c.skinDeep + '" stroke-width="1.6" opacity=".16" stroke-linecap="round"/>' +
      dots + stubble +
      '</g>' +
      beard +
      accessoryBack(look, c) +
      eye(51, -1, look, T, c) + eye(69, 1, look, T, c) +
      nose(c) + mouth(T, c) +
      signature(look, T, c, c) +
      hair.front + hoodRim +
      accessoryFront(look) +
      // rim light from the right, in the hero's accent color
      '<path d="M81.6 52 C84 60 83 72 78 82" fill="none" stroke="' + look.accent + '" stroke-width="1.4" opacity=".55" stroke-linecap="round"/>' +
      '<path d="M100 104 C106 108 108 114 108 120" fill="none" stroke="' + look.accent + '" stroke-width="1.6" opacity=".5"/>' +
      '</g>' +
      '<rect width="120" height="120" fill="url(#' + p + 'vig)"/>' +
      '<rect width="120" height="120" fill="#000" filter="url(#' + p + 'grain)" opacity=".3" style="mix-blend-mode:overlay"/>' +
      '</g>' +
      frameSvg +
      '</svg>';
  };
})();
