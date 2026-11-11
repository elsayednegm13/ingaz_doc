#!/usr/bin/env node
// W2I-20261028-33654801 — generator: bake Arabic glyph outlines from a local
// system font into a TypeScript module.
//
// Why baked data: the PDF is rendered inside the Worker (workerd has no host
// font files), so the outlines are extracted once here and committed as data.
// The source font is read read-only (no copy of .dev.vars, no network, no
// installs). fsType=8 (EDITABLE) of the inspected source permits embedding the
// glyphs as outlines in generated documents.
//
// Output: src/features/quotations/ar-glyphs.generated.ts
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FONT_FILE = process.argv[2] || 'C:\\Windows\\Fonts\\arial.ttf';
const OUT_FILE = path.resolve(__dirname, '..', '..', 'src', 'features', 'quotations', 'ar-glyphs.generated.ts');

// Ranges kept: Arabic base letters, tatweel, Arabic-Indic digits and
// separators, the lam-alef composites and the whole presentation block.
const RANGES = [
  [0x0621, 0x064a],
  [0x0640, 0x0640],
  [0x0660, 0x0669],
  [0x066a, 0x066c],
  [0x066d, 0x066d],
  [0xfef5, 0xfefc],
  [0xfe70, 0xfeff],
];

const buf = fs.readFileSync(FONT_FILE);
const fontSha = crypto.createHash('sha256').update(buf).digest('hex');
const be16 = (b, o) => (b[o] << 8) | b[o + 1];
const be32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const i16 = (b, o) => (be16(b, o) << 16) >> 16;

const numTables = be16(buf, 4);
const tables = {};
for (let i = 0; i < numTables; i += 1) {
  const rec = 12 + i * 16;
  tables[buf.toString('latin1', rec, rec + 4).trim()] = {
    offset: be32(buf, rec + 8),
    length: be32(buf, rec + 12),
  };
}
if (!tables.head || !tables.maxp || !tables.loca || !tables.glyf || !tables.cmap || !tables.hmtx || !tables.hhea) {
  console.error('MISSING_REQUIRED_TTF_TABLES');
  process.exit(1);
}
const unitsPerEm = be16(buf, tables.head.offset + 18);
const indexToLocFormat = be16(buf, tables.head.offset + 50);
const numGlyphs = be16(buf, tables.maxp.offset + 4);
const numberOfHMetrics = be16(buf, tables.hhea.offset + 34);

// hmtx: advance per glyph id.
const hmtx = tables.hmtx.offset;
const advances = [];
for (let g = 0; g < numGlyphs; g += 1) {
  if (g < numberOfHMetrics) advances.push(be16(buf, hmtx + g * 4));
  else advances.push(advances[advances.length - 1] ?? 0);
}

// cmap: pick a Unicode BMP subtable (3/1 preferred, then 0/3, then 3/10).
const cmapBase = tables.cmap.offset;
const subCount = be16(buf, cmapBase + 2);
const subs = [];
for (let i = 0; i < subCount; i += 1) {
  const rec = cmapBase + 4 + i * 8;
  subs.push({ platform: be16(buf, rec), encoding: be16(buf, rec + 2), offset: be32(buf, rec + 4) });
}
const pick =
  subs.find((s) => s.platform === 3 && s.encoding === 1) ??
  subs.find((s) => s.platform === 0 && s.encoding === 3) ??
  subs.find((s) => s.platform === 0) ??
  subs.find((s) => s.platform === 3 && s.encoding === 10) ??
  subs[0];
if (!pick) { console.error('NO_CMAP_SUBTABLE'); process.exit(1); }
const subBase = cmapBase + pick.offset;
const format = be16(buf, subBase);

function lookupFormat4(cp) {
  const segCountX2 = be16(buf, subBase + 6);
  const segCount = segCountX2 / 2;
  const endBase = subBase + 14;
  const startBase = endBase + segCountX2 + 2;
  const deltaBase = startBase + segCountX2;
  const rangeBase = deltaBase + segCount * 2;
  let lo = 0, hi = segCount - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const end = be16(buf, endBase + mid * 2);
    const start = be16(buf, startBase + mid * 2);
    if (cp > end) lo = mid + 1;
    else if (cp < start) hi = mid - 1;
    else {
      const delta = i16(buf, deltaBase + mid * 2);
      const rangeOff = be16(buf, rangeBase + mid * 2);
      if (rangeOff === 0) {
        const g = (cp + delta) & 0xffff;
        return g;
      }
      const gi = be16(buf, rangeBase + mid * 2 + rangeOff + (cp - start) * 2);
      if (gi === 0) return 0;
      return (gi + delta) & 0xffff;
    }
  }
  return 0;
}
function lookupFormat12(cp) {
  const nGroups = be32(buf, subBase + 12);
  let lo = 0, hi = nGroups - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const rec = subBase + 16 + mid * 12;
    const s = be32(buf, rec), e = be32(buf, rec + 4), g = be32(buf, rec + 8);
    if (cp > e) lo = mid + 1;
    else if (cp < s) hi = mid - 1;
    else return g + (cp - s);
  }
  return 0;
}
function lookup(cp) {
  if (format === 4) return lookupFormat4(cp);
  if (format === 12) return lookupFormat12(cp);
  return 0;
}

// loca offsets per glyph.
const locaBase = tables.loca.offset;
const loca = [];
for (let g = 0; g <= numGlyphs; g += 1) {
  loca.push(indexToLocFormat === 0 ? be16(buf, locaBase + g * 2) * 2 : be32(buf, locaBase + g * 4));
}

const glyfBase = tables.glyf.offset;
const contoursCache = new Map();

function simpleGlyphContours(base) {
  const numberOfContours = i16(buf, base);
  const xMin = i16(buf, base + 2);
  const yMin = i16(buf, base + 4);
  const xMax = i16(buf, base + 6);
  const yMax = i16(buf, base + 8);
  let p = base + 10;
  const endPts = [];
  for (let c = 0; c < numberOfContours; c += 1) { endPts.push(be16(buf, p)); p += 2; }
  const total = endPts.length ? endPts[endPts.length - 1] + 1 : 0;
  const instructionLength = be16(buf, p); p += 2 + instructionLength;
  // flags
  const flags = [];
  while (flags.length < total) {
    const f = buf[p]; p += 1;
    flags.push(f);
    if (f & 0x08) {
      const rep = buf[p]; p += 1;
      for (let r = 0; r < rep && flags.length < total; r += 1) flags.push(f);
    }
  }
  // x deltas
  const xs = [];
  let x = 0;
  for (const f of flags) {
    if (f & 0x02) { const d = buf[p]; p += 1; x += (f & 0x10) ? d : -d; }
    else if (!(f & 0x10)) { x += i16(buf, p); p += 2; }
    xs.push(x);
  }
  // y deltas
  const ys = [];
  let y = 0;
  for (const f of flags) {
    if (f & 0x04) { const d = buf[p]; p += 1; y += (f & 0x20) ? d : -d; }
    else if (!(f & 0x20)) { y += i16(buf, p); p += 2; }
    ys.push(y);
  }
  // split into contours of [x, y, onCurve]
  const contours = [];
  let start = 0;
  for (const end of endPts) {
    const pts = [];
    for (let i = start; i <= end; i += 1) pts.push([xs[i], ys[i], flags[i] & 0x01 ? 1 : 0]);
    contours.push(pts);
    start = end + 1;
  }
  return contours;
}

function compositeGlyphContours(base) {
  const contours = [];
  let p = base + 10;
  let more = true;
  while (more) {
    const flags = be16(buf, p); p += 2;
    const glyphIndex = be16(buf, p); p += 2;
    const words = (flags & 0x0001) !== 0;
    const xyValues = (flags & 0x0002) !== 0;
    let dx = 0, dy = 0;
    let a = 1, b = 0, c = 0, d = 1;
    if (xyValues) {
      dx = words ? i16(buf, p) : i8(buf, p); p += words ? 2 : 1;
      dy = words ? i16(buf, p) : i8(buf, p); p += words ? 2 : 1;
    } else {
      p += words ? 4 : 2; // point indices — offsets resolved by the renderer only; outlines kept raw
    }
    if (flags & 0x0008) { const s = f2dot14(buf, p); p += 2; a = s; d = s; }
    else if (flags & 0x0040) { a = f2dot14(buf, p); d = f2dot14(buf, p + 2); p += 4; }
    else if (flags & 0x0080) { a = f2dot14(buf, p); c = f2dot14(buf, p + 2); b = f2dot14(buf, p + 4); d = f2dot14(buf, p + 6); p += 8; }
    const nested = glyphContoursOf(glyphIndex);
    for (const contour of nested) {
      const pts = contour.map(([x, y, on]) => {
        const tx = x * a + y * c + dx;
        const ty = x * b + y * d + dy;
        return [Math.round(tx), Math.round(ty), on];
      });
      contours.push(pts);
    }
    more = (flags & 0x0020) !== 0;
  }
  return contours;
}
const i8 = (b, o) => (buf[o] << 24) >> 24;
const f2dot14 = (b, o) => (i16(b, o) / 16384);

function glyphContoursOf(g) {
  if (contoursCache.has(g)) return contoursCache.get(g) || [];
  if (g <= 0 || g >= numGlyphs) return [];
  const start = loca[g], end = loca[g + 1];
  if (start === end) { contoursCache.set(g, []); return []; }
  const base = glyfBase + start;
  const contours = i16(buf, base) >= 0 ? simpleGlyphContours(base) : compositeGlyphContours(base);
  contoursCache.set(g, contours);
  return contours;
}

const glyphs = {};
let kept = 0, missing = 0;
const missingCps = [];
for (const [lo, hi] of RANGES) {
  for (let cp = lo; cp <= hi; cp += 1) {
    const g = lookup(cp);
    if (!g) { missing += 1; missingCps.push(cp.toString(16).toUpperCase().padStart(4, '0')); continue; }
    const contours = glyphContoursOf(g);
    if (!contours.length) { missing += 1; missingCps.push(cp.toString(16).toUpperCase().padStart(4, '0')); continue; }
    glyphs[cp.toString(16).toUpperCase().padStart(4, '0')] = {
      w: advances[g],
      c: contours,
    };
    kept += 1;
  }
}

// Emit compact TS: contours as flat [x, y, on] triples.
const keyOrder = Object.keys(glyphs).sort((x, y) => parseInt(x, 16) - parseInt(y, 16));
const lines = [];
lines.push('// GENERATED FILE — do not edit. Source: scripts/w2/gen-ar-glyphs.cjs');
lines.push(`// Font source: ${FONT_FILE}`);
lines.push(`// Source SHA-256: ${fontSha}`);
lines.push(`// Kept codepoints: ${kept} (missing from font: ${missing})`);
lines.push('');
lines.push('export const AR_FONT = {');
lines.push(`  sourceSha256: ${JSON.stringify(fontSha)},`);
lines.push(`  unitsPerEm: ${unitsPerEm},`);
lines.push(`  numGlyphs: ${numGlyphs},`);
lines.push('  glyphs: {');
for (const key of keyOrder) {
  const glyph = glyphs[key];
  const contours = glyph.c.map((contour) => {
    const flat = [];
    for (const [x, y, on] of contour) flat.push(`${x},${y},${on}`);
    return `[${flat.join(',')}]`;
  });
  lines.push(`    "${key}": { w: ${glyph.w}, c: [[${contours.map((s) => s.slice(1, -1)).join('],[')}]] },`);
}
lines.push('  },');
lines.push('} as const;');
lines.push('');

const out = lines.join('\n');
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, out, 'utf8');
const back = fs.readFileSync(OUT_FILE, 'utf8');
console.log(`MISSING_CODEPOINTS ${missingCps.join(',') || '(none)'}`);
console.log(`WROTE ${path.relative(process.cwd(), OUT_FILE)} bytes=${fs.statSync(OUT_FILE).size} kept=${kept} missing=${missing} unitsPerEm=${unitsPerEm} format=${format} verifyAfterWrite=${back.includes(fontSha) ? 'OK' : 'MISMATCH'}`);
