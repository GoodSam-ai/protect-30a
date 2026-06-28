#!/usr/bin/env node

import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_CANONICAL = 'https://protect30a.org/';
const DEFAULT_COM_URL = 'https://protect30a.com/';
const DEFAULT_HTML_FILES = ['30a-stormwater-plan.html', 'index.html'];
const VERIFICATION_HTML_PATTERN = /^google[a-z0-9]+\.html$/i;

function makeReport(label) {
  return { label, passes: [], warnings: [], failures: [] };
}

function pass(report, message) {
  report.passes.push(message);
}

function warn(report, message) {
  report.warnings.push(message);
}

function fail(report, message) {
  report.failures.push(message);
}

function normalizeCanonical(value) {
  const url = new URL(value || DEFAULT_CANONICAL);
  url.hash = '';
  url.search = '';
  if (!url.pathname) url.pathname = '/';
  return url.href;
}

function sameUrl(actual, expected) {
  try {
    return normalizeCanonical(actual) === normalizeCanonical(expected);
  } catch {
    return false;
  }
}

function expectedOrigin(expectedCanonical) {
  return new URL(expectedCanonical).origin;
}

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function stripTags(value) {
  return decodeEntities(String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseAttributes(tag) {
  const attrs = {};
  const body = tag
    .replace(/^<\s*\/?\s*[\w:-]+/i, '')
    .replace(/\/?\s*>$/i, '');
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(attrPattern)) {
    const name = match[1].toLowerCase();
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function lineNumberFor(html, index) {
  return html.slice(0, index).split('\n').length;
}

function getOpenTags(html, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return [...html.matchAll(regex)].map((match) => ({
    tag: match[0],
    attrs: parseAttributes(match[0]),
    index: match.index,
    line: lineNumberFor(html, match.index),
  }));
}

function getElements(html, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return [...html.matchAll(regex)].map((match) => ({
    tag: match[0],
    attrs: parseAttributes(match[0]),
    content: match[1],
    index: match.index,
    line: lineNumberFor(html, match.index),
  }));
}

function findMetaContent(html, kind, key) {
  const lowerKind = kind.toLowerCase();
  const lowerKey = key.toLowerCase();
  for (const meta of getOpenTags(html, 'meta')) {
    if ((meta.attrs[lowerKind] || '').toLowerCase() === lowerKey) {
      return meta.attrs.content || '';
    }
  }
  return '';
}

function findCanonicalLinks(html) {
  return getOpenTags(html, 'link')
    .filter((link) => (link.attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical'))
    .map((link) => link.attrs.href || '');
}

function findTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : '';
}

function collectIds(html) {
  const ids = new Map();
  const duplicates = new Set();
  for (const tag of getOpenTags(html, '[a-z][\\w:-]*')) {
    if (!tag.attrs.id) continue;
    if (ids.has(tag.attrs.id)) duplicates.add(tag.attrs.id);
    ids.set(tag.attrs.id, tag.line);
  }
  for (const anchor of getOpenTags(html, 'a')) {
    if (anchor.attrs.name && !ids.has(anchor.attrs.name)) {
      ids.set(anchor.attrs.name, anchor.line);
    }
  }
  return { ids, duplicates };
}

function collectFragmentLinks(html) {
  return getElements(html, 'a')
    .filter((link) => (link.attrs.href || '').startsWith('#'))
    .map((link) => ({ ...link, href: link.attrs.href || '' }));
}

function fragmentFromHref(href) {
  const raw = href.slice(1).split('?')[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function hasExpectedOrigin(value, expectedCanonical) {
  try {
    return new URL(value, expectedCanonical).origin === expectedOrigin(expectedCanonical);
  } catch {
    return false;
  }
}

function checkRequiredMetadata(html, expectedCanonical, report) {
  const title = findTitle(html);
  if (title) pass(report, 'title is present');
  else fail(report, 'missing <title>');

  const description = findMetaContent(html, 'name', 'description');
  if (description) pass(report, 'meta description is present');
  else fail(report, 'missing meta name="description"');

  const ogTitle = findMetaContent(html, 'property', 'og:title');
  if (ogTitle) pass(report, 'og:title is present');
  else fail(report, 'missing meta property="og:title"');

  const ogDescription = findMetaContent(html, 'property', 'og:description');
  if (ogDescription) pass(report, 'og:description is present');
  else fail(report, 'missing meta property="og:description"');

  const ogImage = findMetaContent(html, 'property', 'og:image');
  if (!ogImage) {
    fail(report, 'missing meta property="og:image"');
  } else if (!hasExpectedOrigin(ogImage, expectedCanonical)) {
    fail(report, `og:image must use ${expectedOrigin(expectedCanonical)}; found ${ogImage}`);
  } else {
    pass(report, 'og:image uses the canonical origin');
  }

  const ogImageWidth = findMetaContent(html, 'property', 'og:image:width');
  const ogImageHeight = findMetaContent(html, 'property', 'og:image:height');
  if (ogImageWidth === '1200' && ogImageHeight === '630') {
    pass(report, 'og:image dimensions are present');
  } else {
    fail(report, `og:image dimensions must be 1200x630; found ${ogImageWidth || '(missing)'}x${ogImageHeight || '(missing)'}`);
  }

  const ogImageAlt = findMetaContent(html, 'property', 'og:image:alt');
  if (ogImageAlt) pass(report, 'og:image:alt is present');
  else fail(report, 'missing meta property="og:image:alt"');

  const ogUrl = findMetaContent(html, 'property', 'og:url');
  if (!ogUrl) {
    fail(report, 'missing meta property="og:url"');
  } else if (!sameUrl(ogUrl, expectedCanonical)) {
    fail(report, `og:url must be ${expectedCanonical}; found ${ogUrl}`);
  } else {
    pass(report, 'og:url matches the canonical URL');
  }

  const twitterImage = findMetaContent(html, 'name', 'twitter:image');
  if (!twitterImage) {
    fail(report, 'missing meta name="twitter:image"');
  } else if (!hasExpectedOrigin(twitterImage, expectedCanonical)) {
    fail(report, `twitter:image must use ${expectedOrigin(expectedCanonical)}; found ${twitterImage}`);
  } else {
    pass(report, 'twitter:image uses the canonical origin');
  }
}

function checkCanonical(html, expectedCanonical, report) {
  const canonicalLinks = findCanonicalLinks(html);
  if (canonicalLinks.length === 0) {
    fail(report, 'missing canonical link tag');
    return;
  }
  if (canonicalLinks.length > 1) {
    fail(report, `expected one canonical link tag; found ${canonicalLinks.length}`);
  }
  for (const href of canonicalLinks) {
    if (sameUrl(href, expectedCanonical)) {
      pass(report, `canonical link points to ${expectedCanonical}`);
    } else {
      fail(report, `canonical link must be ${expectedCanonical}; found ${href || '(empty)'}`);
    }
  }
}

function inspectJsonUrls(value, expectedCanonical, failures, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectJsonUrls(item, expectedCanonical, failures, [...pathParts, String(index)]));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if ((key === 'url' || key === '@id') && typeof child === 'string' && child.includes('protect30a.')) {
      if (!sameUrl(child, expectedCanonical) && !hasExpectedOrigin(child, expectedCanonical)) {
        failures.push(`${nextPath.join('.')} points outside ${expectedOrigin(expectedCanonical)}: ${child}`);
      }
    }
    inspectJsonUrls(child, expectedCanonical, failures, nextPath);
  }
}

function checkJsonLd(html, expectedCanonical, report) {
  const scripts = getElements(html, 'script')
    .filter((script) => (script.attrs.type || '').toLowerCase() === 'application/ld+json');

  if (scripts.length === 0) {
    fail(report, 'missing application/ld+json script');
    return;
  }

  const urlFailures = [];
  scripts.forEach((script, index) => {
    try {
      const parsed = JSON.parse(script.content.trim());
      inspectJsonUrls(parsed, expectedCanonical, urlFailures);
    } catch (error) {
      fail(report, `JSON-LD script ${index + 1} does not parse: ${error.message}`);
    }
  });

  if (!report.failures.some((message) => message.startsWith('JSON-LD'))) {
    pass(report, `${scripts.length} JSON-LD script(s) parse`);
  }

  if (urlFailures.length) {
    urlFailures.forEach((message) => fail(report, `JSON-LD ${message}`));
  } else {
    pass(report, 'JSON-LD URLs stay on the canonical origin when present');
  }
}

function checkInternalAnchors(html, report) {
  const { ids, duplicates } = collectIds(html);
  if (duplicates.size) {
    [...duplicates].sort().forEach((id) => fail(report, `duplicate id="${id}"`));
  }

  const broken = [];
  for (const link of collectFragmentLinks(html)) {
    const fragment = fragmentFromHref(link.href);
    if (!fragment || fragment === '!') continue;
    if (!ids.has(fragment)) {
      broken.push(`line ${link.line}: href="${link.href}" has no matching id/name`);
    }
  }

  if (broken.length) {
    broken.forEach((message) => fail(report, message));
  } else {
    pass(report, 'all non-empty internal fragment links resolve');
  }
}

function checkMobileNav(html, report) {
  const navs = getOpenTags(html, 'nav');
  if (!navs.length) {
    fail(report, 'missing <nav> element');
    return;
  }
  pass(report, '<nav> element is present');

  const { ids } = collectIds(html);
  const buttons = getElements(html, 'button');
  const toggle = buttons.find((button) => button.attrs['aria-controls'] || button.attrs['aria-expanded'] !== undefined);
  if (!toggle) {
    fail(report, 'missing mobile nav toggle button with aria-controls/aria-expanded');
    return;
  }

  const accessibleName = toggle.attrs['aria-label'] || stripTags(toggle.content);
  if (accessibleName) pass(report, 'mobile nav toggle has an accessible name');
  else fail(report, `line ${toggle.line}: mobile nav toggle lacks an aria-label or text label`);

  if (toggle.attrs['aria-expanded'] === 'true' || toggle.attrs['aria-expanded'] === 'false') {
    pass(report, 'mobile nav toggle has boolean aria-expanded');
  } else {
    fail(report, `line ${toggle.line}: mobile nav toggle aria-expanded must be "true" or "false"`);
  }

  const controls = toggle.attrs['aria-controls'];
  if (!controls) {
    fail(report, `line ${toggle.line}: mobile nav toggle missing aria-controls`);
  } else if (!ids.has(controls)) {
    fail(report, `line ${toggle.line}: aria-controls="${controls}" has no matching element id`);
  } else {
    pass(report, `mobile nav toggle controls #${controls}`);
  }
}

function checkMediaAttributes(html, report) {
  const images = getOpenTags(html, 'img');
  if (!images.length) {
    pass(report, 'no <img> tags present');
  }
  for (const image of images) {
    if (!image.attrs.src) fail(report, `line ${image.line}: <img> missing src`);
    if (image.attrs.alt === undefined) fail(report, `line ${image.line}: <img> missing alt`);
  }
  if (images.length && !report.failures.some((message) => message.includes('<img>'))) {
    pass(report, `${images.length} <img> tag(s) have src and alt attributes`);
  }

  const svgs = getOpenTags(html, 'svg').filter((svg) => (svg.attrs.role || '').toLowerCase() === 'img');
  for (const svg of svgs) {
    if (!svg.attrs['aria-label'] && !svg.attrs['aria-labelledby']) {
      fail(report, `line ${svg.line}: role="img" SVG missing aria-label/aria-labelledby`);
    }
  }
  if (svgs.length && !report.failures.some((message) => message.includes('role="img" SVG'))) {
    pass(report, `${svgs.length} role="img" SVG(s) have ARIA labels`);
  }

  const iframes = getOpenTags(html, 'iframe');
  for (const iframe of iframes) {
    if (!iframe.attrs.src) fail(report, `line ${iframe.line}: <iframe> missing src`);
    if (!iframe.attrs.title) fail(report, `line ${iframe.line}: <iframe> missing title`);
    if (iframe.attrs.loading && iframe.attrs.loading !== 'lazy') {
      warn(report, `line ${iframe.line}: iframe loading is "${iframe.attrs.loading}", expected "lazy"`);
    }
  }
  if (!iframes.length) pass(report, 'no <iframe> tags present');

  const media = [...getOpenTags(html, 'video'), ...getOpenTags(html, 'audio')];
  for (const item of media) {
    const tagName = item.tag.match(/^<\s*(video|audio)/i)?.[1]?.toLowerCase() || 'media';
    if (!item.attrs.src && !html.slice(item.index, item.index + 2000).match(/<source\b/i)) {
      fail(report, `line ${item.line}: <${tagName}> missing src or nested <source>`);
    }
    if (item.attrs.autoplay !== undefined && item.attrs.muted === undefined) {
      fail(report, `line ${item.line}: autoplay <${tagName}> must also be muted`);
    }
    if (item.attrs.controls === undefined && !item.attrs['aria-label'] && !item.attrs.title) {
      warn(report, `line ${item.line}: <${tagName}> has no controls, title, or aria-label`);
    }
  }
  if (!media.length) pass(report, 'no video/audio tags present');

  const sources = getOpenTags(html, 'source');
  for (const source of sources) {
    if (!source.attrs.src && !source.attrs.srcset) fail(report, `line ${source.line}: <source> missing src/srcset`);
    if (!source.attrs.type && source.attrs.src) warn(report, `line ${source.line}: <source> missing type`);
  }
}

function hasEventHandlerForId(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`getElementById\\(\\s*['"]${escaped}['"]\\s*\\)\\.addEventListener`, 'i').test(html)
    || new RegExp(`querySelector\\(\\s*['"]#${escaped}['"]\\s*\\)\\.addEventListener`, 'i').test(html)
    || new RegExp(`id\\s*=\\s*['"]${escaped}['"][^>]*\\bon[a-z]+\\s*=`, 'i').test(html);
}

function checkEventControls(html, report) {
  const placeholderLinks = getElements(html, 'a').filter((link) => (link.attrs.href || '') === '#');
  if (!placeholderLinks.length) {
    pass(report, 'no href="#" event links present');
    return;
  }

  for (const link of placeholderLinks) {
    const label = stripTags(link.content) || link.attrs['aria-label'] || '(unlabeled)';
    if (!link.attrs.id) {
      fail(report, `line ${link.line}: href="#" control "${label}" needs an id for scripting`);
      continue;
    }
    if (!hasEventHandlerForId(html, link.attrs.id)) {
      fail(report, `line ${link.line}: href="#" control #${link.attrs.id} has no detected click handler`);
    }
    if (!label || label === '(unlabeled)') {
      fail(report, `line ${link.line}: href="#" control #${link.attrs.id} has no accessible label`);
    }
  }

  if (!report.failures.some((message) => message.includes('href="#"'))) {
    pass(report, `${placeholderLinks.length} href="#" event link(s) have ids, labels, and handlers`);
  }
}

function checkRequiredTracking(html, report) {
  const requiredEvents = [
    'support_email_click',
    'share_click',
    'spotify_click',
    'youtube_click',
    'sponsor_inquiry',
    'district_navigation',
  ];

  for (const eventName of requiredEvents) {
    const dataAttributePattern = new RegExp(`data-track-event\\s*=\\s*["']${escapeRegExp(eventName)}["']`, 'i');
    const directCallPattern = new RegExp(`p30aTrack\\(\\s*["']${escapeRegExp(eventName)}["']`, 'i');
    if (dataAttributePattern.test(html) || directCallPattern.test(html)) {
      pass(report, `tracking event is wired: ${eventName}`);
    } else {
      fail(report, `missing required tracking event: ${eventName}`);
    }
  }

  if (/function\s+p30aTrack\b/.test(html) && /window\.dataLayer/.test(html)) {
    pass(report, 'lightweight analytics dispatcher is present');
  } else {
    fail(report, 'missing p30aTrack analytics dispatcher with dataLayer support');
  }
}

function validateHtml(html, options = {}) {
  const expectedCanonical = normalizeCanonical(options.expectedCanonical || DEFAULT_CANONICAL);
  const report = makeReport(options.label || 'html');

  checkCanonical(html, expectedCanonical, report);
  checkRequiredMetadata(html, expectedCanonical, report);
  checkJsonLd(html, expectedCanonical, report);
  checkInternalAnchors(html, report);
  checkMobileNav(html, report);
  checkMediaAttributes(html, report);
  checkEventControls(html, report);
  checkRequiredTracking(html, report);

  return report;
}

function validateRobotsContent(content, expectedCanonical, report) {
  if (!/Sitemap:\s*\S+/im.test(content)) {
    fail(report, 'robots.txt missing Sitemap directive');
  } else if (!new RegExp(`Sitemap:\\s*${escapeRegExp(new URL('/sitemap.xml', expectedCanonical).href)}`, 'im').test(content)) {
    fail(report, `robots.txt Sitemap must point to ${new URL('/sitemap.xml', expectedCanonical).href}`);
  } else {
    pass(report, 'robots.txt points to the canonical sitemap');
  }

  if (/^Disallow:\s*\/\s*$/im.test(content)) {
    fail(report, 'robots.txt disallows the whole site');
  } else {
    pass(report, 'robots.txt does not globally disallow crawling');
  }
}

function validateSitemapContent(content, expectedCanonical, report) {
  if (!/<(?:urlset|sitemapindex)\b/i.test(content)) {
    fail(report, 'sitemap.xml missing urlset/sitemapindex root');
  } else {
    pass(report, 'sitemap.xml has a sitemap root element');
  }

  if (!content.includes(expectedCanonical)) {
    fail(report, `sitemap.xml must include ${expectedCanonical}`);
  } else {
    pass(report, 'sitemap.xml includes the canonical homepage');
  }

  if (/https?:\/\/(?:www\.)?protect30a\.com\b/i.test(content)) {
    fail(report, 'sitemap.xml contains protect30a.com URLs; expected protect30a.org');
  } else {
    pass(report, 'sitemap.xml avoids protect30a.com URLs');
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function validateLocalRobotsAndSitemap(rootDir, expectedCanonical) {
  const report = makeReport('local robots/sitemap');
  const robotsPath = path.join(rootDir, 'robots.txt');
  const sitemapPath = path.join(rootDir, 'sitemap.xml');

  try {
    const robots = await readFile(robotsPath, 'utf8');
    pass(report, 'robots.txt exists');
    validateRobotsContent(robots, expectedCanonical, report);
  } catch {
    fail(report, 'missing robots.txt at site root');
  }

  try {
    const sitemap = await readFile(sitemapPath, 'utf8');
    pass(report, 'sitemap.xml exists');
    validateSitemapContent(sitemap, expectedCanonical, report);
  } catch {
    fail(report, 'missing sitemap.xml at site root');
  }

  return report;
}

function assetPathFromUrl(value, rootDir, expectedCanonical) {
  if (!value || /^(data|mailto|tel|javascript):/i.test(value)) return null;
  try {
    const url = new URL(value, expectedCanonical);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) return null;
    if (url.protocol !== 'file:' && !/^(www\.)?protect30a\.(org|com)$/i.test(url.hostname)) return null;
    const decodedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!decodedPath || decodedPath.includes('..')) return null;
    return path.join(rootDir, decodedPath);
  } catch {
    return null;
  }
}

async function validateLocalAssetReferences(html, rootDir, expectedCanonical) {
  const report = makeReport('local media assets');
  const imageRefs = [
    ['og:image', findMetaContent(html, 'property', 'og:image')],
    ['twitter:image', findMetaContent(html, 'name', 'twitter:image')],
    ...getOpenTags(html, 'img').map((image) => [`img line ${image.line}`, image.attrs.src || '']),
    ...getOpenTags(html, 'source').map((source) => [`source line ${source.line}`, source.attrs.src || source.attrs.srcset || '']),
  ];

  const checked = new Set();
  for (const [label, value] of imageRefs) {
    const assetPath = assetPathFromUrl(value, rootDir, expectedCanonical);
    if (!assetPath || checked.has(assetPath)) continue;
    checked.add(assetPath);
    try {
      await access(assetPath);
      pass(report, `${label} asset exists: ${path.relative(rootDir, assetPath)}`);
    } catch {
      fail(report, `${label} asset missing locally: ${path.relative(rootDir, assetPath)}`);
    }
  }

  if (!checked.size) {
    warn(report, 'no local media asset URLs found to verify');
  }

  return report;
}

async function collectHtmlFiles(rootDir, currentDir = rootDir, files = []) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '.vercel' || entry.name === 'node_modules') continue;
    if (entry.isFile() && VERIFICATION_HTML_PATTERN.test(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectHtmlFiles(rootDir, fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function routeForHtmlFile(rootDir, filePath) {
  const relative = path.relative(rootDir, filePath).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative.replace(/\.html$/i, '')}`;
}

function routeCandidates(route) {
  const clean = route || '/';
  const candidates = new Set([clean]);
  if (clean !== '/') {
    candidates.add(clean.replace(/\/+$/, ''));
    candidates.add(clean.replace(/\/?$/, '/'));
  }
  return [...candidates];
}

function findAnchors(html) {
  return getElements(html, 'a')
    .map((link) => ({ ...link, href: link.attrs.href || '' }))
    .filter((link) => link.href);
}

async function validateLocalCrawl(rootDir, expectedCanonical) {
  const report = makeReport('local site crawl');
  const files = await collectHtmlFiles(rootDir);
  if (!files.length) {
    fail(report, 'no local HTML files found to crawl');
    return report;
  }
  pass(report, `found ${files.length} local HTML file(s)`);

  const expectedOrigin = new URL(expectedCanonical).origin;
  const pages = new Map();
  const routes = new Map();
  for (const filePath of files) {
    const html = await readFile(filePath, 'utf8');
    const route = routeForHtmlFile(rootDir, filePath);
    const page = {
      filePath,
      relative: path.relative(rootDir, filePath),
      route,
      html,
      ids: collectIds(html).ids,
    };
    pages.set(filePath, page);
    for (const candidate of routeCandidates(route)) routes.set(candidate, page);

    const title = findTitle(html);
    if (!title) fail(report, `${page.relative}: missing <title>`);
    const description = findMetaContent(html, 'name', 'description');
    if (!description) fail(report, `${page.relative}: missing meta description`);
    const canonicalLinks = findCanonicalLinks(html);
    if (canonicalLinks.length !== 1) {
      fail(report, `${page.relative}: expected one canonical link; found ${canonicalLinks.length}`);
    } else {
      try {
        const canonicalUrl = new URL(canonicalLinks[0], expectedCanonical);
        if (canonicalUrl.origin !== expectedOrigin) fail(report, `${page.relative}: canonical must use ${expectedOrigin}`);
        if (/protect30a\.com/i.test(canonicalUrl.href)) fail(report, `${page.relative}: canonical contains protect30a.com`);
      } catch {
        fail(report, `${page.relative}: canonical URL is invalid`);
      }
    }
    if (!findMetaContent(html, 'property', 'og:title')) fail(report, `${page.relative}: missing og:title`);
    if (!findMetaContent(html, 'property', 'og:description')) fail(report, `${page.relative}: missing og:description`);
    if (!findMetaContent(html, 'property', 'og:image')) fail(report, `${page.relative}: missing og:image`);
    if (!findMetaContent(html, 'name', 'twitter:image')) fail(report, `${page.relative}: missing twitter:image`);
  }

  const brokenLinks = [];
  for (const page of pages.values()) {
    for (const link of findAnchors(page.html)) {
      if (/^(mailto|tel|javascript):/i.test(link.href)) continue;
      let url;
      try {
        url = new URL(link.href, new URL(page.route, expectedCanonical));
      } catch {
        brokenLinks.push(`${page.relative}:${link.line} invalid href="${link.href}"`);
        continue;
      }
      if (url.origin !== expectedOrigin) continue;
      const targetPath = url.pathname || '/';
      const targetPage = routes.get(targetPath) || routes.get(targetPath.replace(/\/+$/, '')) || routes.get(`${targetPath.replace(/\/+$/, '')}/`);
      if (!targetPage) {
        brokenLinks.push(`${page.relative}:${link.line} href="${link.href}" has no local route`);
        continue;
      }
      if (url.hash) {
        const fragment = fragmentFromHref(url.hash);
        if (fragment && !targetPage.ids.has(fragment)) {
          brokenLinks.push(`${page.relative}:${link.line} href="${link.href}" has no matching fragment`);
        }
      }
    }
  }

  if (brokenLinks.length) brokenLinks.forEach((message) => fail(report, message));
  else pass(report, 'all same-origin local links and fragments resolve');

  try {
    const sitemap = await readFile(path.join(rootDir, 'sitemap.xml'), 'utf8');
    const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);
    for (const loc of sitemapUrls) {
      const url = new URL(loc);
      if (url.origin !== expectedOrigin) {
        fail(report, `sitemap URL must use ${expectedOrigin}: ${loc}`);
        continue;
      }
      const mapped = routes.get(url.pathname) || routes.get(url.pathname.replace(/\/+$/, '')) || routes.get(`${url.pathname.replace(/\/+$/, '')}/`);
      if (!mapped) fail(report, `sitemap URL has no local HTML route: ${loc}`);
    }
    if (sitemapUrls.length) pass(report, `${sitemapUrls.length} sitemap URL(s) map to local routes`);
    else fail(report, 'sitemap.xml contains no <loc> URLs');
  } catch {
    fail(report, 'could not crawl sitemap.xml');
  }

  if (!report.failures.length) pass(report, 'required crawl metadata is present across local HTML pages');
  return report;
}

async function pickHtmlFile(rootDir, explicitFile) {
  const candidates = explicitFile ? [explicitFile] : DEFAULT_HTML_FILES;
  for (const candidate of candidates) {
    const fullPath = path.resolve(rootDir, candidate);
    try {
      const info = await stat(fullPath);
      if (info.isFile()) return fullPath;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(`No HTML file found. Set HTML_FILE or create one of: ${DEFAULT_HTML_FILES.join(', ')}`);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    redirect: options.redirect || 'follow',
    headers: { 'user-agent': 'Protect30A launch regression checker' },
  });
  const text = options.method === 'HEAD' ? '' : await response.text();
  return { response, text };
}

async function checkComRedirect(comUrl, expectedCanonical) {
  const report = makeReport('live .com redirect');
  let result;
  try {
    result = await fetchText(comUrl, { method: 'HEAD', redirect: 'manual' });
    if (result.response.status === 405) {
      result = await fetchText(comUrl, { method: 'GET', redirect: 'manual' });
    }
  } catch (error) {
    fail(report, `could not request ${comUrl}: ${error.message}`);
    return report;
  }

  const status = result.response.status;
  if (![301, 302, 307, 308].includes(status)) {
    fail(report, `${comUrl} must redirect to ${expectedCanonical}; got HTTP ${status}`);
    return report;
  }

  const location = result.response.headers.get('location') || '';
  if (!location) {
    fail(report, `${comUrl} returned HTTP ${status} without a Location header`);
    return report;
  }

  const redirected = new URL(location, comUrl).href;
  if (new URL(redirected).origin !== expectedOrigin(expectedCanonical)) {
    fail(report, `${comUrl} redirects outside canonical origin: ${redirected}`);
  } else {
    pass(report, `${comUrl} redirects to ${redirected} with HTTP ${status}`);
  }

  return report;
}

async function validateLiveChecks(expectedCanonical, orgUrl, comUrl) {
  const reports = [];
  const livePage = makeReport(`live page ${orgUrl}`);
  try {
    const { response, text } = await fetchText(orgUrl);
    if (!response.ok) {
      fail(livePage, `${orgUrl} returned HTTP ${response.status}`);
    } else {
      pass(livePage, `${orgUrl} returned HTTP ${response.status}`);
      const htmlReport = validateHtml(text, {
        expectedCanonical,
        label: `live html ${orgUrl}`,
      });
      livePage.passes.push(...htmlReport.passes);
      livePage.warnings.push(...htmlReport.warnings);
      livePage.failures.push(...htmlReport.failures);
    }
  } catch (error) {
    fail(livePage, `could not fetch ${orgUrl}: ${error.message}`);
  }
  reports.push(livePage);

  const robotsUrl = new URL('/robots.txt', orgUrl).href;
  const liveRobots = makeReport(`live robots ${robotsUrl}`);
  try {
    const { response, text } = await fetchText(robotsUrl);
    if (!response.ok) fail(liveRobots, `${robotsUrl} returned HTTP ${response.status}`);
    else {
      pass(liveRobots, `${robotsUrl} returned HTTP ${response.status}`);
      validateRobotsContent(text, expectedCanonical, liveRobots);
    }
  } catch (error) {
    fail(liveRobots, `could not fetch ${robotsUrl}: ${error.message}`);
  }
  reports.push(liveRobots);

  const sitemapUrl = new URL('/sitemap.xml', orgUrl).href;
  const liveSitemap = makeReport(`live sitemap ${sitemapUrl}`);
  try {
    const { response, text } = await fetchText(sitemapUrl);
    if (!response.ok) fail(liveSitemap, `${sitemapUrl} returned HTTP ${response.status}`);
    else {
      pass(liveSitemap, `${sitemapUrl} returned HTTP ${response.status}`);
      validateSitemapContent(text, expectedCanonical, liveSitemap);
    }
  } catch (error) {
    fail(liveSitemap, `could not fetch ${sitemapUrl}: ${error.message}`);
  }
  reports.push(liveSitemap);

  reports.push(await checkComRedirect(comUrl, expectedCanonical));
  return reports;
}

function printReport(report) {
  console.log(`\n${report.label}`);
  for (const message of report.passes) console.log(`  [pass] ${message}`);
  for (const message of report.warnings) console.log(`  [warn] ${message}`);
  for (const message of report.failures) console.log(`  [fail] ${message}`);
}

function printSummary(reports) {
  const totals = reports.reduce(
    (acc, report) => {
      acc.passes += report.passes.length;
      acc.warnings += report.warnings.length;
      acc.failures += report.failures.length;
      return acc;
    },
    { passes: 0, warnings: 0, failures: 0 },
  );

  console.log(`\nSummary: ${totals.passes} pass, ${totals.warnings} warn, ${totals.failures} fail`);
  return totals;
}

function printUsage() {
  console.log(`Protect 30A launch regression checker

Usage:
  node scripts/check-protect30a-launch.mjs
  CHECK_LIVE=1 node scripts/check-protect30a-launch.mjs

Environment:
  HTML_FILE       Local HTML file to inspect. Defaults to 30a-stormwater-plan.html, then index.html.
  CANONICAL_URL   Expected canonical URL. Defaults to ${DEFAULT_CANONICAL}
  CHECK_LIVE      Set to 1 to fetch live URLs.
  ORG_URL         Live canonical page URL. Defaults to CANONICAL_URL.
  COM_URL         Live .com URL to verify as a redirect. Defaults to ${DEFAULT_COM_URL}
`);
}

function runSelfTest() {
  const goodHtml = `<!doctype html>
<html><head>
<title>Protect 30A</title>
<link rel="canonical" href="https://protect30a.org/">
<meta name="description" content="Local stormwater plan">
<meta property="og:title" content="Protect 30A">
<meta property="og:description" content="Local stormwater plan">
<meta property="og:url" content="https://protect30a.org/">
<meta property="og:image" content="https://protect30a.org/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Protect 30A">
<meta name="twitter:image" content="https://protect30a.org/og-image.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","url":"https://protect30a.org/"}</script>
</head><body>
<nav><ul id="nav-menu"><li><a href="#plan" data-track-event="district_navigation">Plan</a></li></ul><button aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><span></span></button></nav>
<main id="top"><section id="plan"><img src="og-image.jpg" alt="Protect 30A"><a href="https://www.youtube.com/watch?v=abc" data-track-event="youtube_click">Video</a><a href="https://open.spotify.com/search/Protect30A" data-track-event="spotify_click">Podcast</a><a href="mailto:test@example.com" data-track-event="sponsor_inquiry">Sponsor</a></section><a id="email-btn" href="#" data-track-event="support_email_click">Email</a><a id="share-btn" href="#" data-track-event="share_click">Share</a></main>
<script>function p30aTrack(){window.dataLayer=window.dataLayer||[]}document.getElementById('share-btn').addEventListener('click', event => event.preventDefault());document.getElementById('email-btn').addEventListener('click', event => event.preventDefault());</script>
</body></html>`;

  const good = validateHtml(goodHtml, { expectedCanonical: DEFAULT_CANONICAL, label: 'self-test good' });
  assert.deepEqual(good.failures, []);

  const badHtml = `<!doctype html>
<html><head>
<link rel="canonical" href="https://protect30a.com/">
<meta property="og:url" content="https://protect30a.com/">
<meta property="og:image" content="https://protect30a.com/og-image.jpg">
<meta name="twitter:image" content="https://protect30a.com/og-image.jpg">
<script type="application/ld+json">{"url":</script>
</head><body><nav><button aria-expanded="maybe"></button></nav><a href="#missing">Broken</a><a href="#">Click</a></body></html>`;

  const bad = validateHtml(badHtml, { expectedCanonical: DEFAULT_CANONICAL, label: 'self-test bad' });
  assert.ok(bad.failures.some((message) => message.includes('canonical link must be')));
  assert.ok(bad.failures.some((message) => message.includes('og:url')));
  assert.ok(bad.failures.some((message) => message.includes('JSON-LD')));
  assert.ok(bad.failures.some((message) => message.includes('href="#missing"')));
  assert.ok(bad.failures.some((message) => message.includes('aria-expanded')));
  assert.ok(bad.failures.some((message) => message.includes('href="#" control')));

  const robotsReport = makeReport('self-test robots');
  validateRobotsContent('User-agent: *\nDisallow:\nSitemap: https://protect30a.org/sitemap.xml\n', DEFAULT_CANONICAL, robotsReport);
  assert.deepEqual(robotsReport.failures, []);

  const sitemapReport = makeReport('self-test sitemap');
  validateSitemapContent('<urlset><url><loc>https://protect30a.org/</loc></url></urlset>', DEFAULT_CANONICAL, sitemapReport);
  assert.deepEqual(sitemapReport.failures, []);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  if (process.argv.includes('--self-test')) {
    runSelfTest();
    console.log('self-test passed');
    return;
  }

  const rootDir = process.cwd();
  const expectedCanonical = normalizeCanonical(process.env.CANONICAL_URL || DEFAULT_CANONICAL);
  const htmlPath = await pickHtmlFile(rootDir, process.env.HTML_FILE);
  const html = await readFile(htmlPath, 'utf8');

  console.log('Protect 30A launch regression check');
  console.log(`Root: ${rootDir}`);
  console.log(`HTML: ${path.relative(rootDir, htmlPath)}`);
  console.log(`Expected canonical: ${expectedCanonical}`);

  const reports = [
    validateHtml(html, {
      expectedCanonical,
      label: `local html ${path.relative(rootDir, htmlPath)}`,
    }),
    await validateLocalRobotsAndSitemap(rootDir, expectedCanonical),
    await validateLocalCrawl(rootDir, expectedCanonical),
    await validateLocalAssetReferences(html, rootDir, expectedCanonical),
  ];

  if (process.env.CHECK_LIVE === '1') {
    const orgUrl = normalizeCanonical(process.env.LIVE_ORG_URL || process.env.ORG_URL || expectedCanonical);
    const comUrl = normalizeCanonical(process.env.LIVE_COM_URL || process.env.COM_URL || DEFAULT_COM_URL);
    console.log(`Live canonical URL: ${orgUrl}`);
    console.log(`Live .com URL: ${comUrl}`);
    reports.push(...(await validateLiveChecks(expectedCanonical, orgUrl, comUrl)));
  } else {
    console.log('Live checks: skipped (set CHECK_LIVE=1 to enable)');
  }

  reports.forEach(printReport);
  const totals = printSummary(reports);
  if (totals.failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
