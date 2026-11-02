// Pictures for learn cards. Each one is drawn from a small spec in the data
// ("visual": { "type": ..., ... }) so it works offline and takes the subject colour.
// Parts marked data-step can be revealed one at a time with the Play button.
// Nothing moves on its own.

import { esc } from './ui.js';

const st = n => `data-step="${n}"`;

// ---------- HTML components ----------

function flow(v) {
  const items = v.items.map(x => (typeof x === 'string' ? { t: x } : x));
  const html = `<ol class="v-flow">${items.map((x, i) => `<li ${st(i + 1)}>
    ${i ? '<span class="v-arrow" aria-hidden="true">→</span>' : ''}
    <span class="v-box"><strong>${esc(x.t)}</strong>${x.s ? `<span>${esc(x.s)}</span>` : ''}</span></li>`).join('')}</ol>`;
  return { html, steps: items.length };
}

function compare(v) {
  const html = `<div class="v-compare">${v.columns.map((c, i) => `
    ${i && v.link ? `<div class="v-link" ${st(i + 1)}>${esc(v.link)}</div>` : ''}
    <div class="v-col${c.hl ? ' hl' : ''}" ${st(i + 1)}>
      <p class="v-col-title">${esc(c.title)}</p>
      <ul>${c.points.map(p => `<li${c.lang ? ` lang="${c.lang}"` : ''}>${esc(p)}</li>`).join('')}</ul>
    </div>`).join('')}</div>`;
  return { html, steps: v.columns.length };
}

function timeline(v) {
  const html = `<ol class="v-timeline">${v.events.map((e, i) => `<li ${st(i + 1)}>
    <span class="v-dot" aria-hidden="true"></span><span class="v-date">${esc(e.d)}</span><span class="v-event">${esc(e.t)}</span></li>`).join('')}</ol>`;
  return { html, steps: v.events.length };
}

function equation(v) {
  const ops = v.ops || [];
  const html = `<div class="v-eq">${v.parts.map((p, i) => `
    ${i ? `<span class="v-op" ${st(i + 1)}>${esc(ops[i - 1] || '+')}</span>` : ''}
    <span class="v-tile" ${st(i + 1)}>${esc(p)}</span>`).join('')}
    <span class="v-op" ${st(v.parts.length + 1)}>${esc(v.arrow || '→')}</span>
    <span class="v-tile result" ${st(v.parts.length + 1)}>${esc(v.result)}</span></div>`;
  return { html, steps: v.parts.length + 1 };
}

function facts(v) {
  const html = `<div class="v-facts">${v.items.map((x, i) => `<div class="v-fact" ${st(i + 1)}>
    ${x.letter ? `<span class="v-letter">${esc(x.letter)}</span>` : ''}
    <span class="v-k">${esc(x.k)}</span><span class="v-v">${esc(x.v)}</span></div>`).join('')}</div>`;
  return { html, steps: v.items.length };
}

function grid(v) {
  const hl = new Set(v.hl || []);
  const html = `<div class="v-grid">${v.items.map((x, i) => `<span class="v-cell${hl.has(i) ? ' hl' : ''}" ${st(hl.has(i) ? 2 : 1)}>${esc(x)}</span>`).join('')}</div>`;
  return { html, steps: hl.size ? 2 : 1 };
}

function table(v) {
  const [head, ...rows] = v.rows;
  const html = `<div class="table-wrap"><table class="v-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr ${st(i + 1)}>${r.map((c, j) => `<td${v.lang && j === v.langCol ? ` lang="${v.lang}"` : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return { html, steps: rows.length };
}

function words(v) {
  const html = `<div class="v-words">${v.tiles.map((x, i) => `
    ${i ? '<span class="v-plus" aria-hidden="true">+</span>' : ''}
    <span class="v-word${x.hl ? ' hl' : ''}" ${st(i + 1)}><strong lang="fr">${esc(x.t)}</strong>${x.en ? `<span>${esc(x.en)}</span>` : ''}</span>`).join('')}
    <span class="v-plus" aria-hidden="true" ${st(v.tiles.length + 1)}>=</span>
    <span class="v-word result" ${st(v.tiles.length + 1)}><strong>${esc(v.meaning)}</strong></span></div>`;
  return { html, steps: v.tiles.length + 1 };
}

function vocab(v) {
  const html = `<div class="v-vocab">${v.pairs.map((p, i) => `<div class="v-pair" ${st(i + 1)}>
    <strong lang="fr">${esc(p.fr)}</strong><span>${esc(p.en)}</span></div>`).join('')}</div>`;
  return { html, steps: v.pairs.length };
}

function bars(v) {
  const max = Math.max(...v.items.map(x => x.value));
  const html = `<div class="v-bars">${v.items.map((x, i) => `<div class="v-bar-row" ${st(i + 1)}>
    <span class="v-bar-label">${esc(x.label)}</span>
    <span class="v-bar-track"><span class="v-bar${x.hl ? ' hl' : ''}" style="width:${Math.max(4, Math.round((x.value / max) * 100))}%"></span></span>
    <span class="v-bar-value">${esc(x.text)}</span></div>`).join('')}</div>`;
  return { html, steps: v.items.length };
}

function scale(v) {
  const html = `<div class="v-scale">
    <div class="v-scale-track"><span>${esc(v.left)}</span><span>${esc(v.right)}</span></div>
    <ol class="v-scale-marks">${v.markers.map((m, i) => `<li ${st(i + 1)} style="--pos:${m.pos}%"${m.lang ? ` lang="${m.lang}"` : ''}>
      <span class="v-pin" aria-hidden="true"></span><span class="v-pin-label">${esc(m.t)}</span></li>`).join('')}</ol></div>`;
  return { html, steps: v.markers.length };
}

function column(v) {
  const html = `<div class="v-column-wrap"><ol class="v-column">${v.items.map((x, i) => `<li ${st(i + 1)}>
    <span class="v-sym">${esc(x.sym)}</span><span>${esc(x.name)}</span></li>`).join('')}</ol>
    <div class="v-col-arrow" ${st(v.items.length + 1)}><span aria-hidden="true">↓</span><p>${esc(v.arrow)}</p></div></div>`;
  return { html, steps: v.items.length + 1 };
}

// ---------- SVG helpers ----------

const rad = d => (d * Math.PI) / 180;
const pt = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
// Arc from startDeg to endDeg, clockwise on screen (degrees from +x, y down).
function arc(cx, cy, r, a, b) {
  const [x1, y1] = pt(cx, cy, r, a);
  const [x2, y2] = pt(cx, cy, r, b);
  const large = ((b - a + 360) % 360) > 180 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
// Filled angle wedge at (cx, cy) from a to b, clockwise.
function wedge(cx, cy, r, a, b) {
  return `M${cx.toFixed(1)} ${cy.toFixed(1)} ${arc(cx, cy, r, a, b).replace('M', 'L')}Z`;
}
const T = (x, y, s, extra = '') => `<text x="${x}" y="${y}" ${extra}>${esc(s)}</text>`;
const svgWrap = (w, h, body, alt) => `<svg class="v-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt || '')}">${body}</svg>`;
const ARROW = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="fill-subj"/></marker></defs>';

const DIAGRAMS = {
  lungs(v) {
    const lung = 'M168 112 C120 100 72 150 76 205 C80 238 140 240 164 214 Z';
    const body = `
      <path d="${lung}" class="fill-tint stroke-soft"/><path d="${lung}" transform="translate(360 0) scale(-1 1)" class="fill-tint stroke-soft"/>
      <g ${st(1)}><circle cx="180" cy="20" r="9" class="fill-subj"/><path d="M190 20H300" class="lead"/>${T(304, 25, 'Nose and mouth')}</g>
      <g ${st(2)}><path d="M180 30V112" class="pipe" stroke-width="9"/><path d="M186 70H300" class="lead"/>${T(304, 75, 'Trachea')}</g>
      <g ${st(3)}><path d="M180 112L142 146M180 112L218 146" class="pipe" stroke-width="6"/><path d="M220 140H300" class="lead"/>${T(304, 145, 'Bronchi')}</g>
      <g ${st(4)}><path d="M142 146L116 176M142 146L140 188M142 146L162 176M218 146L244 176M218 146L220 188M218 146L198 176" class="pipe" stroke-width="3"/><path d="M246 172H300" class="lead"/>${T(304, 177, 'Bronchioles')}</g>
      <g ${st(5)}>${[[112, 181], [140, 194], [166, 180], [248, 181], [220, 194], [194, 180]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" class="fill-subj"/>`).join('')}<path d="M226 200H300" class="lead"/>${T(304, 205, 'Alveoli')}</g>`;
    return { html: svgWrap(420, 250, body, 'Air passes from the nose and mouth down the trachea, into the bronchi, then the bronchioles, and ends in the alveoli.'), steps: 5 };
  },
  alveolus() {
    const body = `${ARROW}
      <circle cx="105" cy="100" r="62" class="fill-tint stroke-subj"/>${T(105, 26, 'Alveolus (air)', 'text-anchor="middle"')}
      <rect x="205" y="38" width="66" height="124" rx="33" class="fill-blood"/>${T(238, 26, 'Blood', 'text-anchor="middle"')}
      <g ${st(1)}><path d="M140 82H214" class="arrow" marker-end="url(#ah)"/>${T(176, 72, 'Oxygen', 'text-anchor="middle" class="small-t"')}</g>
      <g ${st(2)}><path d="M214 124H140" class="arrow" marker-end="url(#ah)"/>${T(176, 146, 'Carbon dioxide', 'text-anchor="middle" class="small-t"')}</g>`;
    return { html: svgWrap(320, 180, body, 'Oxygen moves from the air in the alveolus into the blood. Carbon dioxide moves from the blood into the alveolus.'), steps: 2 };
  },
  periodic(v) {
    const cells = [];
    for (let r = 1; r <= 7; r++) for (let c = 1; c <= 18; c++) {
      const exists = r === 1 ? (c === 1 || c === 18) : r <= 3 ? (c <= 2 || c >= 13) : true;
      if (exists) cells.push([r, c]);
    }
    const nonMetal = new Set(['1-1', '1-18', '2-13', '2-14', '2-15', '2-16', '2-17', '2-18', '3-14', '3-15', '3-16', '3-17', '3-18', '4-16', '4-17', '4-18', '5-17', '5-18', '6-18', '7-18']);
    const X = c => 20 + (c - 1) * 19, Y = r => 14 + (r - 1) * 19;
    const rect = ([r, c], cls, extra = '') => `<rect x="${X(c)}" y="${Y(r)}" width="17" height="17" rx="3" class="${cls}" ${extra}/>`;
    let body = cells.map(p => rect(p, 'cell')).join('');
    let steps = 2;
    let alt = '';
    if (v.mode === 'metals') {
      body += `<g ${st(1)}>${cells.filter(([r, c]) => !nonMetal.has(`${r}-${c}`)).map(p => rect(p, 'fill-subj')).join('')}${T(20, 166, 'Metals: left and middle')}</g>`;
      body += `<g ${st(2)}>${cells.filter(([r, c]) => nonMetal.has(`${r}-${c}`)).map(p => rect(p, 'fill-other')).join('')}${T(362, 166, 'Non-metals: right', 'text-anchor="end"')}</g>`;
      alt = 'Metals fill the left and middle of the periodic table. Non-metals are on the right.';
    } else {
      body += `<g ${st(1)}>${cells.filter(([, c]) => c === 1).map(p => rect(p, 'fill-subj')).join('')}${T(20, 166, 'A group is a column')}</g>`;
      body += `<g ${st(2)}>${cells.filter(([r]) => r === 3).map(p => rect(p, 'fill-other')).join('')}${T(362, 166, 'A period is a row', 'text-anchor="end"')}</g>`;
      alt = 'Groups are the columns of the periodic table. Periods are the rows.';
    }
    return { html: svgWrap(380, 176, body, alt), steps };
  },
  poles() {
    const mag = (x, y, left, right) => `<rect x="${x}" y="${y}" width="50" height="34" class="pole-${left.toLowerCase()}"/><rect x="${x + 50}" y="${y}" width="50" height="34" class="pole-${right.toLowerCase()}"/>
      ${T(x + 25, y + 23, left, 'text-anchor="middle" class="pole-t"')}${T(x + 75, y + 23, right, 'text-anchor="middle" class="pole-t"')}`;
    const body = `${ARROW}
      <g ${st(1)}>${mag(20, 20, 'N', 'S')}${mag(220, 20, 'N', 'S')}<path d="M126 37H160" class="arrow" marker-end="url(#ah)"/><path d="M214 37H180" class="arrow" marker-end="url(#ah)"/>${T(170, 80, 'Unlike poles attract', 'text-anchor="middle"')}</g>
      <g ${st(2)}>${mag(20, 110, 'N', 'S')}${mag(220, 110, 'S', 'N')}<path d="M158 127H126" class="arrow" marker-end="url(#ah)"/><path d="M182 127H214" class="arrow" marker-end="url(#ah)"/>${T(170, 170, 'Like poles repel', 'text-anchor="middle"')}</g>`;
    return { html: svgWrap(340, 180, body, 'A south pole next to a north pole attracts. Two south poles next to each other repel.'), steps: 2 };
  },
  field() {
    let lines = '';
    for (const k of [1, 2, 3]) {
      const dx = 46 * k, dy = 30 * k;
      lines += `<path d="M130 96C${130 - dx} ${96 - dy} ${230 + dx} ${96 - dy} 230 96" class="field"/>`;
      lines += `<path d="M130 104C${130 - dx} ${104 + dy} ${230 + dx} ${104 + dy} 230 104" class="field"/>`;
      const yt = 96 - 0.75 * dy, yb = 104 + 0.75 * dy;
      lines += `<path d="M176 ${yt - 5}L184 ${yt}L176 ${yt + 5}" class="field-head"/><path d="M176 ${yb - 5}L184 ${yb}L176 ${yb + 5}" class="field-head"/>`;
    }
    const body = `<rect x="130" y="84" width="50" height="32" class="pole-n"/><rect x="180" y="84" width="50" height="32" class="pole-s"/>
      ${T(155, 105, 'N', 'text-anchor="middle" class="pole-t"')}${T(205, 105, 'S', 'text-anchor="middle" class="pole-t"')}
      <g ${st(1)}>${lines}</g>
      <g ${st(2)}>${T(180, 196, 'From N to S. Closest together at the poles.', 'text-anchor="middle" class="small-t"')}</g>`;
    return { html: svgWrap(360, 206, body, 'Curved field lines go from the north pole round to the south pole of a bar magnet.'), steps: 2 };
  },
  electromagnet() {
    let coil = '';
    for (let i = 0; i < 8; i++) coil += `<ellipse cx="${128 + i * 15}" cy="72" rx="6" ry="20" class="coil"/>`;
    const body = `${ARROW}
      <rect x="110" y="62" width="140" height="20" rx="4" class="fill-iron"/>${coil}${T(180, 40, 'Iron core with a coil of wire', 'text-anchor="middle" class="small-t"')}
      <g ${st(1)}><path d="M122 90V160H160M200 160H238V90" class="wire"/>
        <path d="M160 146V174M170 152V168" class="wire" stroke-width="4"/><path d="M170 160H200" class="wire"/>
        ${T(165, 194, 'Battery: current flows', 'text-anchor="middle" class="small-t"')}</g>
      <g ${st(2)}><path d="M110 64C70 30 70 114 110 80" class="field"/><path d="M250 64C290 30 290 114 250 80" class="field"/>
        ${T(296, 76, 'Magnetic', 'class="small-t"')}</g>`;
    return { html: svgWrap(360, 204, body, 'A coil of wire around an iron core. When current flows from the battery, it becomes a magnet.'), steps: 2 };
  },
  sequence(v) {
    const n = v.values.length;
    const w = 40 + n * 80;
    let body = '';
    v.values.forEach((val, i) => {
      const x = 60 + i * 80;
      body += `<g ${i ? st(i) : ''}><circle cx="${x}" cy="90" r="26" class="fill-tint stroke-subj"/>${T(x, 98, String(val), 'text-anchor="middle" class="big-t"')}</g>`;
      if (i) body += `<g ${st(i)}><path d="${arc(x - 40, 62, 40, 200, 340)}" class="hop"/>${T(x - 40, 34, v.diff, 'text-anchor="middle" class="hop-t"')}</g>`;
    });
    return { html: svgWrap(w, 130, body, `The sequence ${v.values.join(', ')} goes ${v.diff} each time.`), steps: n - 1 };
  },
  angles() {
    const body = `<path d="M30 140H330" class="line"/><path d="M180 140L263.6 40.4" class="line"/>
      <g ${st(1)}><path d="${arc(180, 140, 34, 180, 310)}" class="angle a"/>${T(146, 108, '130°', 'class="big-t"')}</g>
      <g ${st(2)}><path d="${arc(180, 140, 44, 310, 360)}" class="angle b"/>${T(232, 132, '50°', 'class="big-t"')}</g>
      <g ${st(3)}>${T(180, 172, '130° + 50° = 180°', 'text-anchor="middle"')}</g>`;
    return { html: svgWrap(360, 182, body, 'Two angles on a straight line, 130 degrees and 50 degrees, add up to 180 degrees.'), steps: 3 };
  },
  parallel() {
    const panel = (ox, pair, name, rule, n) => {
      const top = [ox + 46.5, 50], bot = [ox + 73.5, 120];
      const regions = { br: [0, 69], al: [180, 249], ar: [249, 360] };
      const [a1, b1] = regions.br, [a2, b2] = regions[pair];
      return `<g>
        <path d="M${ox + 6} 50H${ox + 116}M${ox + 6} 120H${ox + 116}" class="line"/><path d="M${ox + 35} 20L${ox + 85} 150" class="line"/>
        <path d="M${ox + 96} 45l6 5-6 5M${ox + 96} 115l6 5-6 5" class="line thin"/>
        <g ${st(n)}><path d="${wedge(top[0], top[1], 16, a1, b1)}" class="wedge"/><path d="${wedge(bot[0], bot[1], 16, a2, b2)}" class="wedge"/>
          ${T(ox + 61, 170, name, 'text-anchor="middle" class="big-t"')}${T(ox + 61, 188, rule[0], 'text-anchor="middle" class="small-t"')}${T(ox + 61, 204, rule[1], 'text-anchor="middle" class="small-t"')}</g></g>`;
    };
    const body = panel(0, 'al', 'Z shape', ['alternate', 'equal'], 1) + panel(126, 'br', 'F shape', ['corresponding', 'equal'], 2) + panel(252, 'ar', 'C shape', ['co-interior', 'add to 180°'], 3);
    return { html: svgWrap(378, 212, body, 'Parallel lines: alternate angles (Z shape) are equal, corresponding angles (F shape) are equal, co-interior angles (C shape) add up to 180 degrees.'), steps: 3 };
  },
  polygon() {
    const cx = 110, cy = 100, R = 62;
    const vs = [...Array(6)].map((_, k) => pt(cx, cy, R, -90 + 60 * k));
    let ext = '';
    for (let k = 0; k < 6; k++) {
      const a = vs[k], b = vs[(k + 1) % 6];
      const dir = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      const [ex, ey] = pt(b[0], b[1], 26, dir);
      ext += `<path d="M${b[0].toFixed(1)} ${b[1].toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}" class="line dashed"/>`;
      ext += `<path d="${wedge(b[0], b[1], 16, dir, dir + 60)}" class="wedge"/>`;
    }
    const body = `<path d="M${vs.map(p => p.map(n => n.toFixed(1)).join(' ')).join('L')}Z" class="fill-tint stroke-subj"/>
      <g ${st(1)}>${ext}</g>
      <g ${st(2)}>${T(200, 80, 'Exterior: 360 ÷ 6 = 60°')}</g>
      <g ${st(3)}>${T(200, 116, 'Interior: 180 − 60 = 120°')}</g>`;
    return { html: svgWrap(380, 196, body, 'A regular hexagon. Each exterior angle is 360 divided by 6, which is 60 degrees. Each interior angle is 120 degrees.'), steps: 3 };
  },
  bearing() {
    const cx = 120, cy = 112, r = 84;
    const bx = cx + r * Math.sin(rad(70)), by = cy - r * Math.cos(rad(70));
    const body = `${ARROW}<circle cx="${cx}" cy="${cy}" r="${r}" class="faint"/><circle cx="${cx}" cy="${cy}" r="4" class="fill-subj"/>${T(cx - 18, cy + 18, 'A')}
      <g ${st(1)}><path d="M${cx} ${cy}V${cy - r - 6}" class="line" marker-end="url(#ah)"/>${T(cx, cy - r - 12, 'N', 'text-anchor="middle" class="big-t"')}</g>
      <g ${st(2)}><path d="${arc(cx, cy, 40, -90, -20)}" class="angle a" marker-end="url(#ah)"/>${T(232, 60, '1. Start at north', 'class="small-t"')}${T(232, 80, '2. Turn clockwise', 'class="small-t"')}</g>
      <g ${st(3)}><path d="M${cx} ${cy}L${bx.toFixed(1)} ${by.toFixed(1)}" class="line"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4" class="fill-subj"/>${T(bx + 8, by + 4, 'B')}
        ${T(232, 110, '3. Use 3 figures:', 'class="small-t"')}${T(232, 136, '070°', 'class="big-t"')}</g>`;
    return { html: svgWrap(360, 210, body, 'The bearing of B from A is 070 degrees: start at north and turn 70 degrees clockwise.'), steps: 3 };
  },
};

function diagram(v) {
  return DIAGRAMS[v.name](v);
}

function fracbars(v) {
  const html = `<div class="v-frac">${v.rows.map((r, i) => `<div class="v-frac-row" ${st(i + 1)}>
    <span class="v-frac-cells">${[...Array(r.d)].map((_, k) => `<span class="${k < r.n ? 'on' : ''}"></span>`).join('')}</span>
    <span class="v-frac-label">${esc(r.label)}</span></div>`).join('')}</div>`;
  return { html, steps: v.rows.length };
}

function expand(v) {
  let n = 1;
  const html = `<div class="v-expand"><table class="v-grid-table"><tr><th class="corner">×</th>${v.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
    ${v.rows.map((r, i) => `<tr><th>${esc(r)}</th>${v.cells[i].map(c => `<td ${st(n++)}>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>
    <p class="v-expand-result" ${st(n)}>${esc(v.result)}</p></div>`;
  return { html, steps: n };
}

function venn(v) {
  const list = (items, x) => items.map((s, i) => T(x, 92 + i * 22 - (items.length - 1) * 11, s, 'text-anchor="middle" class="big-t"')).join('');
  const body = `<g ${st(1)}><circle cx="135" cy="96" r="78" class="venn-a"/>${T(110, 14, v.left.title, 'text-anchor="middle" class="small-t"')}${list(v.left.items, 92)}</g>
    <g ${st(2)}><circle cx="225" cy="96" r="78" class="venn-b"/>${T(250, 14, v.right.title, 'text-anchor="middle" class="small-t"')}${list(v.right.items, 268)}</g>
    <g ${st(3)}>${list(v.both, 180)}${T(180, 194, v.result, 'text-anchor="middle"')}</g>`;
  return { html: svgWrap(360, 204, body, `${v.left.title} and ${v.right.title}. In both: ${v.both.join(', ')}. ${v.result}`), steps: 3 };
}

const R = { flow, compare, timeline, equation, facts, grid, table, words, vocab, bars, scale, column, diagram, fracbars, expand, venn };

export const VISUAL_TYPES = Object.keys(R);
export const DIAGRAM_NAMES = Object.keys(DIAGRAMS);

export function renderVisual(v) {
  if (!v || !R[v.type]) return '';
  let out;
  try { out = R[v.type](v); } catch (e) { return ''; }
  const play = out.steps > 1
    ? `<button type="button" class="btn small-btn vis-play" data-steps="${out.steps}">Play step by step</button>` : '';
  return `<figure class="visual">${out.html}<div class="vis-foot">${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : '<span></span>'}${play}</div></figure>`;
}

// Reveal the parts one at a time. The picture starts and ends complete.
export function playVisual(btn) {
  const fig = btn.closest('.visual');
  if (!fig || fig.dataset.playing) return;
  const total = Number(btn.dataset.steps);
  const parts = [...fig.querySelectorAll('[data-step]')];
  fig.dataset.playing = '1';
  fig.classList.add('is-playing');
  btn.disabled = true;
  btn.textContent = 'Playing…';
  parts.forEach(p => p.classList.remove('on'));
  let k = 0;
  const tick = () => {
    k++;
    parts.filter(p => Number(p.dataset.step) === k).forEach(p => p.classList.add('on'));
    if (k < total) {
      fig._timer = setTimeout(tick, 1100);
    } else {
      fig._timer = setTimeout(() => {
        fig.classList.remove('is-playing');
        delete fig.dataset.playing;
        btn.disabled = false;
        btn.textContent = 'Play again';
      }, 900);
    }
  };
  fig._timer = setTimeout(tick, 300);
}
