/* =====================================================================
   pillars.js  —  Protect30A three-pillar shared behavior layer
   Owner: Agent P0-A.  Framework-free ES module.

   Loaded as <script type="module" src="/assets/pillars.js"></script>
   on every page. Everything is defensive: if the target elements are
   absent the function is a silent no-op (no thrown errors). Coexists
   with index.html's existing burger menu (#nav-burger toggling
   nav.menu-open) — this file never touches that toggle.

   Exposes exactly one global: window.p30aPillars = {initNav,
   initDisclosures, initCites}. Auto-inits on DOMContentLoaded.
   ===================================================================== */

/* ---------- small helpers ---------- */
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
/* allow only http/https/mailto/relative in injected hrefs */
function safeUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (/^(https?:|mailto:|\/|#|\.)/i.test(s)) return s;
  return '';
}

/* =====================================================================
   (a) NAV — accessible dropdown menus
   Wires every `.has-menu > .nav-top[aria-controls]`:
     • click toggles aria-expanded + panel visibility
     • Esc closes the open panel and returns focus to its button
     • click or focus outside closes all open panels
     • ArrowLeft/ArrowRight move focus between top-level buttons
     • ArrowDown from a button opens it and focuses the first item
   Does NOT interfere with #nav-burger / nav.menu-open (mobile burger).
   ===================================================================== */
export function initNav() {
  const tops = $$('.has-menu > .nav-top[aria-controls]');
  if (!tops.length) return;

  const panelFor = (btn) => {
    const id = btn.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  };

  const closeAll = (except) => {
    tops.forEach((btn) => {
      if (btn === except) return;
      if (btn.getAttribute('aria-expanded') === 'true') {
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  };

  const openBtn = (btn) => {
    closeAll(btn);
    btn.setAttribute('aria-expanded', 'true');
  };
  const toggleBtn = (btn) => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) btn.setAttribute('aria-expanded', 'false');
    else openBtn(btn);
  };

  tops.forEach((btn, i) => {
    // guard against double-init
    if (btn.dataset.p30aNav === '1') return;
    btn.dataset.p30aNav = '1';
    if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleBtn(btn);
    });

    btn.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          if (btn.getAttribute('aria-expanded') === 'true') {
            e.preventDefault();
            btn.setAttribute('aria-expanded', 'false');
            btn.focus();
          }
          break;
        case 'ArrowRight': {
          e.preventDefault();
          const next = tops[(i + 1) % tops.length];
          next && next.focus();
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const prev = tops[(i - 1 + tops.length) % tops.length];
          prev && prev.focus();
          break;
        }
        case 'ArrowDown':
        case 'Enter':
        case ' ': {
          // open and move into the panel (Enter/Space also handled by click,
          // but we intercept to place focus on the first link)
          if (e.key === 'ArrowDown') e.preventDefault();
          openBtn(btn);
          const panel = panelFor(btn);
          const first = panel && panel.querySelector('a,button,[tabindex]');
          if (e.key === 'ArrowDown' && first) first.focus();
          break;
        }
        default:
          break;
      }
    });

    // keyboard handling inside each panel
    const panel = panelFor(btn);
    if (panel && panel.dataset.p30aNav !== '1') {
      panel.dataset.p30aNav = '1';
      panel.addEventListener('keydown', (e) => {
        const items = $$('a,button,[tabindex]', panel).filter(
          (el) => !el.hasAttribute('disabled')
        );
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          (items[idx + 1] || items[0]).focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          (items[idx - 1] || btn).focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        } else if (e.key === 'Tab') {
          // tabbing out of the panel closes it (no focus trap)
          closeAll();
        }
      });
    }
  });

  // click / focus outside closes everything
  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('.has-menu')) closeAll();
  });
  document.addEventListener('focusin', (e) => {
    if (!e.target.closest || !e.target.closest('.has-menu')) closeAll();
  });
  // global Esc safety net
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}

/* =====================================================================
   (b) DISCLOSURE injector
   For each [data-disclosure="A|B|C|D|E|F"] element, inject the matching
   Variant copy as an accessible role="note" .pp-disclosure block.
   Idempotent; unknown/absent variants are skipped with a console.warn.
   ===================================================================== */
const DISCLOSURES = {
  A: 'protect30a.org is a community advocacy resource published by Doug Liles in his personal capacity as a South Walton resident and property owner. It does not represent the official position of any special district, Walton County, or any other government body, and nothing here is an official act or communication of any public office. Water-quality data is courtesy of the Choctawhatchee Basin Alliance. Sponsorship does not constitute an official position or government endorsement. Information here is general and educational — not legal or engineering advice.',
  B: 'A private, resident-led advocacy tool. Not an official government form, survey, or channel. Your participation here is voluntary civic engagement, not communication with a public office.',
  C: 'Sponsors support this independent community effort. Sponsorship does not represent an official position, and no sponsor is endorsed by, or endorses, any government body, special district, or public official.',
  D: 'Water-quality data courtesy of the Choctawhatchee Basin Alliance (CBA). Figures are provided for public information and may be provisional; refer to CBA for the authoritative dataset.',
  E: 'This material is general information, not legal or engineering advice. Statutory and technical items may change and can be fact-specific; consult qualified Florida counsel or a licensed professional engineer before relying on them.',
  F: 'Disclosure: This resource is published by Doug Liles, who also founds/operates GoodSam.ai and EcoGuardian.AI and owns Point Preserve (725 J D Miller Road). Where those interests appear, they are disclosed. This site is not a marketing channel for those ventures, and their mention is not a government endorsement.',
};

const DISCLOSURE_ICO =
  '<svg class="pp-disclosure-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>' +
  '<path d="M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '<circle cx="12" cy="7.6" r="1.05" fill="currentColor"/></svg>';

export function initDisclosures() {
  const nodes = $$('[data-disclosure]');
  nodes.forEach((el) => {
    if (el.dataset.p30aDone === '1') return;
    const key = (el.getAttribute('data-disclosure') || '').trim().toUpperCase();
    const copy = DISCLOSURES[key];
    if (!copy) {
      console.warn(`[p30aPillars] Unknown data-disclosure="${key}" — no copy injected.`);
      return;
    }
    el.dataset.p30aDone = '1';
    el.classList.add('pp-disclosure');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'note');
    // preserve any author-provided content? Spec says inject the variant;
    // we set the canonical copy so wording is guaranteed correct site-wide.
    el.innerHTML = DISCLOSURE_ICO + '<p>' + esc(copy) + '</p>';
  });
}

/* =====================================================================
   (c) CITATION CHIP
   For each [data-src] element, read window.PROVENANCE (registry object
   { id:{label,status,source:{name,org,url,accessed},note} }; default {})
   and render an accessible .cite-chip with a keyboard-reachable popover.
   status "unverified" | "needs_pe_review"  -> .cite-chip--unverified.
   console.warn when a data-src has no registry entry.
   ===================================================================== */
const UNVERIFIED_STATES = new Set(['unverified', 'needs_pe_review', 'needs_review', 'provisional']);
let CITE_SEQ = 0;

export function initCites() {
  const registry = (typeof window !== 'undefined' && window.PROVENANCE) || {};
  const nodes = $$('[data-src]');
  const openPops = [];

  nodes.forEach((el) => {
    if (el.dataset.p30aDone === '1') return;
    const id = (el.getAttribute('data-src') || '').trim();
    const entry = registry[id];
    if (!entry) {
      console.warn(`[p30aPillars] No PROVENANCE entry for data-src="${id}".`);
      // still render a minimal chip so the page isn't missing an affordance
    }
    el.dataset.p30aDone = '1';

    const status = ((entry && entry.status) || '').toLowerCase();
    const unverified = UNVERIFIED_STATES.has(status);
    const label = (entry && entry.label) || id || 'Source';
    const src = (entry && entry.source) || {};
    const uid = 'cite-pop-' + (++CITE_SEQ);

    el.classList.add('cite-chip');
    if (unverified) el.classList.add('cite-chip--unverified');

    // build source line
    const srcName = [src.name, src.org].filter(Boolean).join(' — ');
    const url = safeUrl(src.url);
    const accessed = src.accessed ? ` (accessed ${esc(src.accessed)})` : '';
    const srcHtml = url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(srcName || url)}</a>${accessed}`
      : `${esc(srcName)}${accessed}`;
    const noteHtml = entry && entry.note ? `<span class="cite-pop-src">${esc(entry.note)}</span>` : '';
    const statusLabel = unverified
      ? (status === 'needs_pe_review' ? 'Unverified · needs PE review' : 'Unverified')
      : (status ? 'Verified' : '');
    const statusHtml = statusLabel ? `<span class="cite-pop-status">${esc(statusLabel)}</span>` : '';
    const chipText = unverified ? label + ' ⚠' : label; // ⚠ hint for unverified

    el.innerHTML =
      `<button type="button" class="cite-chip-btn" aria-expanded="false" aria-controls="${uid}" aria-haspopup="dialog">` +
      `<span class="sr-only">Citation: </span>${esc(chipText)}</button>` +
      `<span class="cite-chip-pop" id="${uid}" role="dialog" aria-label="Source: ${esc(label)}" hidden>` +
      `<span class="cite-pop-label">${esc(label)}</span>` +
      (srcName || url ? `<span class="cite-pop-src">${srcHtml}</span>` : '') +
      noteHtml + statusHtml +
      `</span>`;

    const btn = el.querySelector('.cite-chip-btn');
    const pop = el.querySelector('.cite-chip-pop');
    if (!btn || !pop) return;

    const close = () => {
      btn.setAttribute('aria-expanded', 'false');
      pop.hidden = true;
    };
    const open = () => {
      // close sibling popovers first
      openPops.forEach((c) => c());
      btn.setAttribute('aria-expanded', 'true');
      pop.hidden = false;
    };
    openPops.push(close);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pop.hidden) open();
      else close();
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) {
        e.preventDefault();
        close();
        btn.focus();
      }
    });
    // focus/click outside closes this popover
    document.addEventListener('click', (e) => {
      if (!pop.hidden && (!e.target.closest || !e.target.closest('.cite-chip'))) close();
    });
  });

  // global Esc closes any open citation popover
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') openPops.forEach((c) => c());
  });
}

/* =====================================================================
   BOOTSTRAP
   ===================================================================== */
function initAll() {
  try { initNav(); } catch (e) { console.warn('[p30aPillars] initNav failed', e); }
  try { initDisclosures(); } catch (e) { console.warn('[p30aPillars] initDisclosures failed', e); }
  try { initCites(); } catch (e) { console.warn('[p30aPillars] initCites failed', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll, { once: true });
} else {
  initAll();
}

/* single safe global */
if (typeof window !== 'undefined') {
  window.p30aPillars = { initNav, initDisclosures, initCites };
}
