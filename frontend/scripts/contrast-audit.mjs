#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const SELF_TEST = process.argv.includes('--self-test');
const __dir = dirname(fileURLToPath(import.meta.url));

function hexToRgb(h) {
  const s = h.replace('#', '');
  if (s.length === 3)
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function alphaBlend([fr, fg, fb], a, [br, bg, bb]) {
  return [Math.round(fr * a + br * (1 - a)), Math.round(fg * a + bg * (1 - a)), Math.round(fb * a + bb * (1 - a))];
}

function linearise(v) {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function contrastRatio(fg, bg) {
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

function hexBlockTokens(css) {
  const out = {};
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})(?:\s*;|\s*\/\*|\s*$)/gm))
    if (!(m[1] in out)) out[m[1]] = m[2];
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*var\([^,)]+,\s*(#[0-9a-fA-F]{3,8})\s*\)/gm))
    if (!(m[1] in out)) out[m[1]] = m[2];
  return out;
}

const cssPath = resolve(__dir, '../globals.css');
const cssText = readFileSync(cssPath, 'utf8');

function extractSelectorBlocks(css, selectorPattern) {
  const chunks = [];
  let pos = 0;
  while (true) {
    const tagIdx = css.search(selectorPattern instanceof RegExp
      ? selectorPattern
      : new RegExp(selectorPattern));
    if (tagIdx === -1 || tagIdx <= pos - 1) break;
    const searchable = css.slice(pos);
    const localIdx = searchable.search(selectorPattern instanceof RegExp
      ? selectorPattern
      : new RegExp(selectorPattern));
    if (localIdx === -1) break;
    const absTag = pos + localIdx;
    const openIdx = css.indexOf('{', absTag);
    if (openIdx === -1) break;
    let depth = 1, cursor = openIdx + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') depth++;
      else if (css[cursor] === '}') depth--;
      cursor++;
    }
    chunks.push(css.slice(openIdx + 1, cursor - 1));
    pos = cursor;
  }
  return chunks.join('\n');
}

function extractAllSelectorBlocks(css, pat) {
  const chunks = [];
  let pos = 0;
  while (pos < css.length) {
    const sub = css.slice(pos);
    const m = sub.search(pat);
    if (m === -1) break;
    const absTag = pos + m;
    const openIdx = css.indexOf('{', absTag);
    if (openIdx === -1) break;
    let depth = 1, cursor = openIdx + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') depth++;
      else if (css[cursor] === '}') depth--;
      cursor++;
    }
    chunks.push(css.slice(openIdx + 1, cursor - 1));
    pos = cursor;
  }
  return chunks.join('\n');
}

const lightCss = extractAllSelectorBlocks(cssText, /(?<![.\w])(:root)\s*\{/);
const darkCss  = extractAllSelectorBlocks(cssText, /\.dark\s*\{/);

const lightRaw = hexBlockTokens(lightCss);
const darkRaw  = hexBlockTokens(darkCss);

function resolveToken(theme, name) {
  const raw = theme === 'light' ? lightRaw : darkRaw;
  const val = raw[name] ?? lightRaw[name];
  return val ? hexToRgb(val) : null;
}

const DB  = hexToRgb('#0a0a0b');
const DC  = hexToRgb('#131316');

const darkOverrides = {
  '--border':                     alphaBlend([255, 255, 255], 0.30, DB),
  '--input':                      alphaBlend([255, 255, 255], 0.22, DB),
  '--status-success-surface':     alphaBlend(hexToRgb('#10b981'), 0.10, DC),
  '--status-warning-surface':     alphaBlend(hexToRgb('#f59e0b'), 0.10, DC),
  '--status-danger-surface':      alphaBlend(hexToRgb('#ef4444'), 0.10, DC),
  '--status-info-surface':        alphaBlend(hexToRgb('#3b82f6'), 0.10, DC),
  '--status-neutral-surface':     alphaBlend(hexToRgb('#64748b'), 0.10, DC),
};

function token(theme, name) {
  if (theme === 'dark' && name in darkOverrides) return darkOverrides[name];
  return resolveToken(theme, name);
}

const PAIRS = [
  ['light  foreground          on background',           '--foreground',                 '--background',               'normal'],
  ['light  foreground          on card',                 '--foreground',                 '--card',                     'normal'],
  ['light  card-foreground     on card',                 '--card-foreground',            '--card',                     'normal'],
  ['light  muted-foreground    on background',           '--muted-foreground',           '--background',               'normal'],
  ['light  muted-foreground    on card',                 '--muted-foreground',           '--card',                     'normal'],
  ['light  muted-foreground    on muted',                '--muted-foreground',           '--muted',                    'normal'],
  ['light  primary-fg          on primary',              '--primary-foreground',         '--primary',                  'normal'],
  ['light  secondary-fg        on secondary',            '--secondary-foreground',       '--secondary',                'normal'],
  ['light  accent-fg           on accent',               '--accent-foreground',          '--accent',                   'normal'],
  ['light  destructive-fg      on destructive',          '--destructive-foreground',     '--destructive',              'normal'],
  ['light  popover-fg          on popover',              '--popover-foreground',         '--popover',                  'normal'],
  ['light  sidebar-fg          on sidebar',              '--sidebar-foreground',         '--sidebar',                  'normal'],
  ['light  sidebar-primary-fg  on sidebar-primary',      '--sidebar-primary-foreground', '--sidebar-primary',          'normal'],
  ['light  ring                on background  [UI 3:1]', '--ring',                       '--background',               'ui'],
  ['light  ring                on card        [UI 3:1]', '--ring',                       '--card',                     'ui'],
  ['light  status-success-ink  on success-surface',      '--status-success-ink',         '--status-success-surface',   'normal'],
  ['light  status-warning-ink  on warning-surface',      '--status-warning-ink',         '--status-warning-surface',   'normal'],
  ['light  status-danger-ink   on danger-surface',       '--status-danger-ink',          '--status-danger-surface',    'normal'],
  ['light  status-info-ink     on info-surface',         '--status-info-ink',            '--status-info-surface',      'normal'],
  ['light  status-neutral-ink  on neutral-surface',      '--status-neutral-ink',         '--status-neutral-surface',   'normal'],
  ['light  status-neutral-ink  on background',           '--status-neutral-ink',         '--background',               'normal'],
  ['dark   foreground          on background',           '--foreground',                 '--background',               'normal'],
  ['dark   foreground          on card',                 '--foreground',                 '--card',                     'normal'],
  ['dark   card-foreground     on card',                 '--card-foreground',            '--card',                     'normal'],
  ['dark   muted-foreground    on background',           '--muted-foreground',           '--background',               'normal'],
  ['dark   muted-foreground    on card',                 '--muted-foreground',           '--card',                     'normal'],
  ['dark   muted-foreground    on muted',                '--muted-foreground',           '--muted',                    'normal'],
  ['dark   primary-fg          on primary',              '--primary-foreground',         '--primary',                  'normal'],
  ['dark   secondary-fg        on secondary',            '--secondary-foreground',       '--secondary',                'normal'],
  ['dark   accent-fg           on accent',               '--accent-foreground',          '--accent',                   'normal'],
  ['dark   destructive-fg      on destructive',          '--destructive-foreground',     '--destructive',              'normal'],
  ['dark   popover-fg          on popover',              '--popover-foreground',         '--popover',                  'normal'],
  ['dark   sidebar-fg          on sidebar',              '--sidebar-foreground',         '--sidebar',                  'normal'],
  ['dark   sidebar-primary-fg  on sidebar-primary',      '--sidebar-primary-foreground', '--sidebar-primary',          'normal'],
  ['dark   ring                on background  [UI 3:1]', '--ring',                       '--background',               'ui'],
  ['dark   ring                on card        [UI 3:1]', '--ring',                       '--card',                     'ui'],
  ['dark   status-success-ink  on success-surface',      '--status-success-ink',         '--status-success-surface',   'normal'],
  ['dark   status-warning-ink  on warning-surface',      '--status-warning-ink',         '--status-warning-surface',   'normal'],
  ['dark   status-danger-ink   on danger-surface',       '--status-danger-ink',          '--status-danger-surface',    'normal'],
  ['dark   status-info-ink     on info-surface',         '--status-info-ink',            '--status-info-surface',      'normal'],
  ['dark   status-neutral-ink  on neutral-surface',      '--status-neutral-ink',         '--status-neutral-surface',   'normal'],
];

function themeOf(label) { return label.startsWith('dark') ? 'dark' : 'light'; }

function wcaaThreshold(kind) { return kind === 'normal' ? 4.5 : 3.0; }

function fmt(r) { return r.toFixed(2) + ':1'; }

if (SELF_TEST) {
  const cases = [
    {
      name: 'pure black [0,0,0] on pure white [255,255,255] must equal 21.0:1 — WCAG 2.1 Annex A reference pair',
      fg: [0, 0, 0], bg: [255, 255, 255], expected: 21.0, tol: 0.005,
    },
    {
      name: '#777777 on white: hand-computed lin(119/255)=((0.4667+0.055)/1.055)^2.4=0.1846, L=0.1846, ratio=(1.05)/(0.2346)=4.48:1',
      fg: hexToRgb('#777777'), bg: [255, 255, 255], expected: 4.48, tol: 0.05,
    },
    {
      name: '#808080 on white: hand-computed lin(128/255)=((0.5020+0.055)/1.055)^2.4=0.2159, L=0.2159, ratio=(1.05)/(0.2659)=3.95:1',
      fg: hexToRgb('#808080'), bg: [255, 255, 255], expected: 3.95, tol: 0.05,
    },
    {
      name: 'identical colours always yield 1.0:1 — identity floor',
      fg: [128, 64, 200], bg: [128, 64, 200], expected: 1.0, tol: 0.005,
    },
  ];

  let passed = 0, failed = 0;
  for (const c of cases) {
    const got = contrastRatio(c.fg, c.bg);
    const ok = Math.abs(got - c.expected) <= c.tol;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
    console.log(`       computed ${fmt(got)}  expected ≈ ${fmt(c.expected)}  tol ±${c.tol}`);
    if (ok) passed++; else failed++;
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const COL_LABEL = 44;
const COL_RATIO = 10;

console.log(
  'Pair'.padEnd(COL_LABEL) +
  'Ratio'.padStart(COL_RATIO) +
  '  Threshold  Result'
);
console.log('-'.repeat(COL_LABEL + COL_RATIO + 24));

const failures = [];

for (const [label, fgName, bgName, kind] of PAIRS) {
  const theme = themeOf(label);
  const fg = token(theme, fgName);
  const bg = token(theme, bgName);

  if (!fg || !bg) {
    console.log(label.padEnd(COL_LABEL) + '  [token missing]');
    continue;
  }

  const r    = contrastRatio(fg, bg);
  const thr  = wcaaThreshold(kind);
  const pass = r >= thr;
  const line =
    label.padEnd(COL_LABEL) +
    fmt(r).padStart(COL_RATIO) +
    `  ≥${thr}:1     ` +
    (pass ? 'PASS' : 'FAIL');

  console.log(line);

  if (!pass) failures.push({ label, fgName, bgName, kind, r, fg, bg });
}

console.log('');

if (failures.length === 0) {
  console.log('All pairs pass WCAG 2.1 AA.');
} else {
  console.log(`${failures.length} FAILURE(S)`);
  console.log('');

  for (const f of failures) {
    console.log(`FAIL  ${f.label}`);
    console.log(`      ${f.fgName} = rgb(${f.fg})  on  ${f.bgName} = rgb(${f.bg})`);
    console.log(`      ratio ${fmt(f.r)}  threshold ≥${wcaaThreshold(f.kind)}:1  (${f.kind} text)`);
    console.log('');
  }
}

console.log('── BLIND SPOTS ──────────────────────────────────────────────────');
console.log('This audit measures static token pairs only. It cannot detect:');
console.log('  • text rendered over a gradient or image background');
console.log('  • token values overridden via inline style= attributes');
console.log('  • colour-mix() computed at runtime against a non-card background');
console.log('    (dark status surfaces are modelled against --card; actual');
console.log('     contrast shifts if they appear directly on --background or');
console.log('     --muted — typically by ≤ 0.3 ratio units at 10% alpha)');
console.log('  • legacy literal Tailwind classes (bg-emerald-50 text-emerald-700)');
console.log('    still present in ~360 files pending ticket-17 migration');
