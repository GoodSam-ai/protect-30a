# Protect30A — Merge Verification Checklist

**Scope.** Run this checklist before merging **any** change into
`feature/phase-0-pillars` (and before promoting that branch). It gates the
three-pillar integration: shared assets (`/assets/pillars.*`), the pillar
routes (`/act`, `/records`, `/impact`), the records/privacy page
(`/records-privacy`), homepage integration, and district/show pages.

**Ground rules this checklist enforces.**

- **Additive only.** No page renames, no removed anchors, no deleted routes.
- **WCAG 2.1 AA.** Contrast, focus, keyboard, reduced-motion, labels.
- **Exact statute citations.** `FS Ch. 119`, `FS §286.011`, `FS §720.3085`,
  etc. — verbatim, never paraphrased into a wrong section number.
- **"Special assessment," never "tax."** (An MSBU/MSTU assessment is not a
  general tax; the FAQ and JSON-LD say so.)
- **Legal-adjacent information, not legal advice.** Any page touching records,
  privacy, statutes, or governance must say so and recommend Florida counsel.

---

## 1. Automated gates (must pass — blocking)

Run from the repo root:

- [ ] **`node scripts/verify-prompt.mjs`** exits **0**.
      Fails on: a broken same-page `#anchor`, an unresolved root-relative
      `/path`, unbalanced container tags on a new page, or a non-zero launch
      checker. (Node built-ins only; no network.)
- [ ] **`node scripts/check-protect30a-launch.mjs`** exits **0**
      (local crawl: canonical/OG/Twitter/JSON-LD metadata, per-page anchor +
      route resolution, mobile-nav a11y, media alt/title, tracking events).
- [ ] **`node scripts/check-protect30a-launch.mjs --self-test`** passes
      (guards the checker itself).
- [ ] *(Pre-promote only, needs network)* `CHECK_LIVE=1 node
      scripts/check-protect30a-launch.mjs` — live page 200s, `.com → .org`
      301 redirect, live robots/sitemap. Skip for local/offline PR review.

## 2. Existing anchors & routes still resolve (no regressions)

- [ ] These homepage anchors still exist and are linked correctly:
      `#why`, `#plan`, `#timeline`, `#lakes`, `#wq-explorer`, `#faq`, `#help`.
- [ ] These routes still resolve: `/show`, `/districts/`, every
      `/districts/*` district page, and the new `/act`, `/records`,
      `/impact`, `/records-privacy`.
- [ ] Cross-page fragment links (e.g. `/records#money`, `/act#calendar`,
      `/impact#tracker`) point at ids that exist on the destination page.
- [ ] No duplicate `id="…"` on any page (the launch checker flags these).

## 3. Lighthouse (Chrome DevTools or CI)

Run against the changed page(s) on a production-like build:

- [ ] **Performance — no regression** vs. the current `main` baseline for the
      same route (record the before/after numbers in the PR).
- [ ] **Accessibility ≥ 95** (target 100).
- [ ] **Best Practices** and **SEO** not regressed.
- [ ] No new render-blocking resources beyond the shared
      `pillars.css` / `pillars.js` / `content.js` / `metrics.js`.

## 4. Accessibility — axe (and manual)

- [ ] **axe DevTools / axe-core** run on each changed page: **0 critical,
      0 serious** violations.
- [ ] Keyboard-only pass: skip-link (`#main`) works; nav dropdowns open/close
      with Enter/Space/Esc; focus is visible on every interactive element;
      no keyboard trap.
- [ ] Color contrast spot-check for any new text (tokens only — no off-palette
      colors introduced; gold/aqua used as background/large-decoration only).
- [ ] `prefers-reduced-motion` respected (no essential motion).
- [ ] Headings are ordered (single `<h1>`, logical `<h2>`/`<h3>`), landmarks
      present (`header`/`main`/`footer`/`nav` with labels).

## 5. Visual diff

- [ ] Visual regression (Percy / Chromatic / manual screenshot compare) on
      the changed route(s) at **mobile (~380px)**, **tablet**, and **desktop**.
- [ ] Shared chrome (header brand → `/`, nav, footer, disclosure block)
      renders consistently with the rest of the site.
- [ ] No layout shift from the injected `data-disclosure` block or
      records-notice.

## 6. Records notice on any form (public-records compliance)

- [ ] **Any page with a form/submission control** carries the FS Ch. 119
      records notice. Either:
      - the container has `data-records-notice` (auto-injected by
        `/assets/records-notice.js` before the submit control), **or**
      - an equivalent visible notice is present in markup.
- [ ] The notice links to **`/records-privacy/`**.
- [ ] The notice tells users submissions **may be public records / may not be
      confidential** and to **minimize sensitive info**.
- [ ] `/records-privacy/` itself is reachable and states: private-capacity
      publisher, FS Ch. 119 posture, FS §286.011 (not an official channel),
      what's collected + retention, and the removal contact
      (`doug@goodsamaritaninstitute.org`).

## 7. Legal / statute accuracy

- [ ] Statute citations are **exact**: `FS Ch. 119` and `FS §286.011`
      (and any others) match the correct chapter/section.
- [ ] "**Special assessment**" language used — **no** page calls the MSBU/MSTU
      a "tax."
- [ ] Every records/privacy/governance surface includes the
      **"information, not legal advice — consult Florida counsel"** caveat.
- [ ] Disclosure block (`data-disclosure="A"`) present in the footer of new
      pillar pages and injected correctly by `pillars.js`.

## 8. Counsel / HITL gate (sensitive surfaces)

**Blocking for legal-adjacent changes** — records/privacy copy, statute
citations, disclosures, public-records notices, or anything describing what a
government body will do:

- [ ] A human has reviewed the exact user-facing wording.
- [ ] **Florida counsel review** is requested/complete for new or materially
      changed legal-adjacent copy (records notice, `/records-privacy`,
      Sunshine-Law posture, assessment vs. tax framing).
- [ ] Any placeholder (e.g. retention `[to be set]`) is either resolved or
      explicitly accepted as a known-open item for this merge.
- [ ] Sign-off recorded in the PR before merge.

---

### Quick command reference

```sh
# from repo root
node scripts/verify-prompt.mjs                 # additive-page verifier (gate)
node scripts/check-protect30a-launch.mjs       # local launch regression check
node scripts/check-protect30a-launch.mjs --self-test
CHECK_LIVE=1 node scripts/check-protect30a-launch.mjs   # pre-promote, needs network
```

A merge is **green** only when Section 1 passes, Sections 2–7 are checked, and
the Section 8 HITL/counsel gate is signed off for any sensitive surface.
