#!/usr/bin/env node
/* =====================================================================
   scripts/verify-prompt.mjs — Protect30A additive-page verifier
   Owner: Agent P0-G. Node built-ins ONLY. No npm installs. No network.

   USAGE
     node scripts/verify-prompt.mjs            # run all checks
     node scripts/verify-prompt.mjs --help     # this help
     node scripts/verify-prompt.mjs --no-launch  # skip the launch checker

   Runnable from any working directory — the repo root is derived from
   this file's own location (scripts/ -> repo root), not from process.cwd().

   WHAT IT DOES
     (1) LAUNCH CHECKER passthrough — if scripts/check-protect30a-launch.mjs
         exists, spawn it (node child process, local-only, no CHECK_LIVE) and
         surface its PASS/FAIL via the child's exit code. (That script already
         crawls every page for SEO/anchor/a11y regressions; we do not
         duplicate it — we gate on it.)
     (2) STATIC ANCHOR/LINK CHECK — for a fixed set of pages
         (index.html, act/, records/, impact/, records-privacy/, districts/),
         extract internal href="#..." and href="/..." targets and verify:
           - same-page "#anchor"  -> an id="anchor" (or <a name="anchor">)
             exists in THAT file;
           - root-relative "/path" -> resolves to an existing file or dir
             ("/x" -> x/index.html or x; "/x/" likewise; "/" -> index.html).
         Every broken target is reported with its source file.
     (3) TAG-BALANCE sanity check on the new pages (act, records, impact,
         records-privacy) — opening vs. closing counts for common container
         elements must match (void/self-closing elements are ignored).

   Exit status: process.exit(1) if ANY check fails (including a broken
   anchor or a non-zero launch checker), else exit 0.
   ===================================================================== */

import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = path.dirname(__filename);
const ROOT = path.resolve(SCRIPTS_DIR, '..');

const LAUNCH_CHECKER = path.join(SCRIPTS_DIR, 'check-protect30a-launch.mjs');

/* Pages whose internal links we statically verify. Relative to ROOT.
   Missing files are tolerated (reported as "skipped", not failed) so this
   harness stays usable while sibling agents are still scaffolding pages. */
const LINK_CHECK_FILES = [
  'index.html',
  'act/index.html',
  'records/index.html',
  'impact/index.html',
  'records-privacy/index.html',
  'districts/index.html',
];

/* New pages that get the tag-balance sanity check. */
const NEW_PAGES = [
  'act/index.html',
  'records/index.html',
  'impact/index.html',
  'records-privacy/index.html',
];

/* Void / self-closing HTML elements — never expected to have a close tag. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

/* Container elements we balance-check (open vs close counts). Deliberately
   excludes elements that are commonly written self-closing or that wrap raw
   text we strip (script/style). */
const BALANCE_TAGS = [
  'html', 'head', 'body', 'header', 'footer', 'main', 'nav', 'section',
  'article', 'aside', 'div', 'ul', 'ol', 'li', 'p', 'a', 'h1', 'h2', 'h3',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form', 'button', 'figure',
];

/* -------------------------------------------------------------------- */

function makeReport(label) {
  return { label, passes: [], warnings: [], failures: [], skips: [] };
}
const pass = (r, m) => r.passes.push(m);
const warn = (r, m) => r.warnings.push(m);
const fail = (r, m) => r.failures.push(m);
const skip = (r, m) => r.skips.push(m);

/* Strip <script>…</script>, <style>…</style>, and <!-- … --> so that hrefs
   inside JS strings / CSS / comments never register as real links.
   Robust to large files: plain regex over the string (index.html ~0.85 MB
   is well within a single readFile + replace). */
function stripNonMarkup(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ');
}

/* Collect id="…" values and <a name="…"> values from raw HTML.
   (Kept on raw HTML so an id on any element still counts.) */
function collectIds(html) {
  const ids = new Set();
  const idRe = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  let m;
  while ((m = idRe.exec(html))) {
    const v = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (v) ids.add(v);
  }
  const nameRe = /<a\b[^>]*\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  while ((m = nameRe.exec(html))) {
    const v = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (v) ids.add(v);
  }
  return ids;
}

/* Extract href values (double, single, or unquoted) from cleaned markup. */
function collectHrefs(cleanHtml) {
  const out = [];
  const re = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  let m;
  while ((m = re.exec(cleanHtml))) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (raw) out.push(raw);
  }
  return out;
}

function decodeAmps(s) {
  return String(s).replace(/&amp;/g, '&');
}

/* Does a root-relative "/path" resolve to a real file or directory?
   "/"        -> index.html
   "/x"       -> x  (file) OR x/index.html OR x/ (dir)
   "/x/"      -> x/index.html OR x/ (dir)
   Query and hash are stripped by the caller. */
function rootRelativeResolves(targetPath) {
  // Normalize: strip leading slash, decode &amp;, drop trailing slash (except root).
  let p = decodeAmps(targetPath);
  if (p === '/' || p === '') {
    return existsSync(path.join(ROOT, 'index.html'));
  }
  p = p.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!p || p.includes('..')) return false;
  const abs = path.join(ROOT, p);
  if (existsSync(abs)) return true;                       // file or dir exists
  if (existsSync(path.join(abs, 'index.html'))) return true; // dir with index
  if (existsSync(abs + '.html')) return true;             // extensionless -> .html
  return false;
}

/* -------------------------------------------------------------------- */
/* (1) Launch checker passthrough                                        */
/* -------------------------------------------------------------------- */

function runLaunchChecker() {
  return new Promise((resolve) => {
    const report = makeReport('launch checker (scripts/check-protect30a-launch.mjs)');
    if (!existsSync(LAUNCH_CHECKER)) {
      warn(report, 'not found — skipping (nothing to gate on)');
      resolve(report);
      return;
    }
    // Local-only: do NOT set CHECK_LIVE (keeps this offline/no-network).
    const env = { ...process.env };
    delete env.CHECK_LIVE;
    const child = spawn(process.execPath, [LAUNCH_CHECKER], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => {
      fail(report, `could not spawn launch checker: ${e.message}`);
      resolve(report);
    });
    child.on('close', (code) => {
      // Surface the checker's own summary line if present.
      const summary = (out.match(/^Summary:.*$/m) || [])[0];
      if (summary) report.detail = summary.trim();
      if (code === 0) {
        pass(report, `passed${summary ? ` (${summary.trim()})` : ''}`);
      } else {
        fail(report, `FAILED with exit code ${code}${summary ? ` (${summary.trim()})` : ''}`);
        // Echo the checker's own [fail] lines to aid debugging.
        const fails = out.split('\n').filter((l) => l.includes('[fail]')).slice(0, 40);
        for (const line of fails) fail(report, `  ↳ ${line.trim()}`);
        if (err.trim()) fail(report, `  ↳ stderr: ${err.trim().split('\n')[0]}`);
      }
      resolve(report);
    });
  });
}

/* -------------------------------------------------------------------- */
/* (2) Static anchor/link check                                          */
/* -------------------------------------------------------------------- */

async function checkLinks() {
  const report = makeReport('static anchor/link check');

  // Load every target file once so cross-file "/path#frag" can be verified
  // against the destination page's ids when that page is one we loaded.
  const loaded = new Map(); // rel -> { raw, ids }
  for (const rel of LINK_CHECK_FILES) {
    const abs = path.join(ROOT, rel);
    if (!existsSync(abs)) {
      skip(report, `${rel} — not present (skipped)`);
      continue;
    }
    const raw = await readFile(abs, 'utf8');
    loaded.set(rel, { raw, ids: collectIds(raw) });
  }

  if (loaded.size === 0) {
    fail(report, 'no target files found to check');
    return report;
  }

  // Map a root-relative path to a loaded page key, so we can also validate
  // cross-page fragments (e.g. /records#money). Best-effort: only for pages
  // we actually loaded.
  function loadedKeyForPath(p) {
    let s = p.replace(/^\/+/, '').replace(/\/+$/, '');
    if (s === '') return 'index.html';
    const candidates = [`${s}/index.html`, s, `${s}.html`];
    for (const c of candidates) if (loaded.has(c)) return c;
    return null;
  }

  let brokenCount = 0;

  for (const [rel, page] of loaded) {
    const clean = stripNonMarkup(page.raw);
    const hrefs = collectHrefs(clean);
    let fileBroken = 0;

    for (const hrefRaw of hrefs) {
      const href = hrefRaw.trim();
      if (!href) continue;
      // Skip external / non-navigational schemes.
      if (/^(mailto:|tel:|javascript:|data:|#$)/i.test(href)) continue;
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href)) continue; // http(s)://, etc.
      if (href.startsWith('//')) continue;                 // protocol-relative external

      if (href.startsWith('#')) {
        // Same-page fragment.
        const frag = decodeURIComponentSafe(decodeAmps(href.slice(1)).split('?')[0]);
        if (!frag || frag === '!') continue;
        if (!page.ids.has(frag)) {
          fail(report, `${rel}: href="${href}" → no matching id/name in ${rel}`);
          fileBroken++; brokenCount++;
        }
      } else if (href.startsWith('/')) {
        // Root-relative path (+ optional ?query / #fragment).
        const noHash = href.split('#');
        const pathPart = noHash[0].split('?')[0];
        const fragPart = noHash.length > 1 ? decodeURIComponentSafe(decodeAmps(noHash[1])) : '';

        if (!rootRelativeResolves(pathPart)) {
          fail(report, `${rel}: href="${href}" → path "${pathPart}" resolves to no file/dir`);
          fileBroken++; brokenCount++;
          continue;
        }
        // If it points at a page we loaded and carries a fragment, verify it.
        if (fragPart && fragPart !== '!') {
          const key = loadedKeyForPath(pathPart);
          if (key && !loaded.get(key).ids.has(fragPart)) {
            fail(report, `${rel}: href="${href}" → "#${fragPart}" not found in ${key}`);
            fileBroken++; brokenCount++;
          }
        }
      }
      // Relative links (no leading / or #) are out of scope for this static
      // check; the launch checker's crawl covers same-origin resolution.
    }

    if (fileBroken === 0) pass(report, `${rel}: all internal #anchors and /paths resolve`);
  }

  if (brokenCount === 0) pass(report, 'no broken internal targets across checked files');
  return report;
}

function decodeURIComponentSafe(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/* -------------------------------------------------------------------- */
/* (3) Tag-balance sanity check                                          */
/* -------------------------------------------------------------------- */

function tagBalance(cleanHtml, tagName) {
  const open = (cleanHtml.match(new RegExp(`<${tagName}(?=[\\s>/])`, 'gi')) || []).length;
  // subtract self-closing occurrences like <div/>
  const selfClose = (cleanHtml.match(new RegExp(`<${tagName}\\b[^>]*/\\s*>`, 'gi')) || []).length;
  const close = (cleanHtml.match(new RegExp(`</${tagName}\\s*>`, 'gi')) || []).length;
  return { open: open - selfClose, close };
}

async function checkTagBalance() {
  const report = makeReport('tag-balance sanity (new pages)');
  let anyChecked = false;

  for (const rel of NEW_PAGES) {
    const abs = path.join(ROOT, rel);
    if (!existsSync(abs)) {
      skip(report, `${rel} — not present (skipped)`);
      continue;
    }
    anyChecked = true;
    const raw = await readFile(abs, 'utf8');
    const clean = stripNonMarkup(raw);
    const mismatches = [];
    for (const tag of BALANCE_TAGS) {
      const { open, close } = tagBalance(clean, tag);
      if (open !== close) mismatches.push(`<${tag}> open=${open} close=${close}`);
    }
    // Sanity: exactly one <html>, <head>, <body>, <main>.
    for (const singleton of ['html', 'head', 'body', 'main']) {
      const n = (clean.match(new RegExp(`<${singleton}(?=[\\s>])`, 'gi')) || []).length;
      if (n !== 1) mismatches.push(`expected exactly one <${singleton}>, found ${n}`);
    }
    if (mismatches.length) {
      for (const mm of mismatches) fail(report, `${rel}: ${mm}`);
    } else {
      pass(report, `${rel}: container tags balanced`);
    }
  }

  if (!anyChecked) warn(report, 'no new pages present to balance-check');
  return report;
}

/* -------------------------------------------------------------------- */
/* Reporting                                                             */
/* -------------------------------------------------------------------- */

function printReport(report) {
  console.log(`\n${report.label}`);
  for (const m of report.passes) console.log(`  [pass] ${m}`);
  for (const m of report.skips) console.log(`  [skip] ${m}`);
  for (const m of report.warnings) console.log(`  [warn] ${m}`);
  for (const m of report.failures) console.log(`  [fail] ${m}`);
}

function printSummary(reports) {
  const t = reports.reduce(
    (a, r) => {
      a.passes += r.passes.length;
      a.warnings += r.warnings.length;
      a.failures += r.failures.length;
      a.skips += r.skips.length;
      return a;
    },
    { passes: 0, warnings: 0, failures: 0, skips: 0 },
  );
  console.log('\n----------------------------------------------------------');
  console.log(
    `Per-file summary: ${t.passes} pass, ${t.skips} skip, ${t.warnings} warn, ${t.failures} fail`,
  );
  console.log(reports.every((r) => r.failures.length === 0)
    ? 'RESULT: PASS'
    : 'RESULT: FAIL');
  return t;
}

function printUsage() {
  console.log(`Protect30A additive-page verifier (verify-prompt.mjs)

Usage:
  node scripts/verify-prompt.mjs             Run launch checker + link + tag-balance checks
  node scripts/verify-prompt.mjs --no-launch Skip the launch-checker passthrough
  node scripts/verify-prompt.mjs --help      Show this help

Notes:
  - Node built-ins only. No npm packages. No network access (CHECK_LIVE is
    never set; the launch checker runs in local-only mode).
  - Repo root is derived from this file's location, so it runs from any cwd.
  - Exits with status 1 if any check fails (broken anchor, unresolved /path,
    unbalanced tags, or a non-zero launch checker).
`);
}

/* -------------------------------------------------------------------- */

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return;
  }
  const runLaunch = !argv.includes('--no-launch');

  console.log('Protect30A additive-page verifier');
  console.log(`Repo root: ${ROOT}`);

  const reports = [];
  if (runLaunch) {
    reports.push(await runLaunchChecker());
  } else {
    const r = makeReport('launch checker');
    warn(r, 'skipped via --no-launch');
    reports.push(r);
  }
  reports.push(await checkLinks());
  reports.push(await checkTagBalance());

  reports.forEach(printReport);
  const totals = printSummary(reports);

  if (totals.failures > 0) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(error && (error.stack || error.message) || error);
  process.exit(1);
});
