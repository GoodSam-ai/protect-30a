# Protect30A Production Hardening Design

## Goal

Release the newer Next.js application on `protect30a.org` while preserving the currently deployed legacy homepage and Action Center, then correct the audited email-validation and navigation accessibility defects.

## Current-state evidence

- The canonical production domain targets commit `3700c4f` on `feature/phase-0-pillars`; that static release supplies the Action Center and its `/api/capture` and `/api/pledge` functions.
- The newer release candidate, `c8db473` on `feature/pillars-rebased`, includes the Next.js live-engagement, resource, auth, admin, and API routes, but its legacy homepage does not include the Action Center markup or load its scripts.
- Deploying `c8db473` unchanged would therefore remove currently available public actions. This is not acceptable under the requirement to make no unrelated public changes.

## Release design

1. Use the newer Next.js release candidate as the base because it contains the routes currently absent from `protect30a.org`.
2. Preserve both release lines: retain the newer release candidate's homepage additions and merge the current production Action Center into that homepage. The existing Action Center text, controls, content files, and response semantics remain intact; the source library, visitor-resource, Bing-verification, community-action, compact-lake, and Act-this-week additions remain intact too.
3. Port the two current Vercel Node functions to Next App Router route handlers at the same public URLs, `/api/capture` and `/api/pledge`. Preserve their method restrictions, allowlists, honeypot behavior, sensitive-field rejection, response shapes, and intentionally non-persistent Phase-0 behavior. Do not add a data store, collect additional data, or modify retention/moderation policy.
4. Make only the following behavior corrections:
   - Email signup and optional RSVP reminder email reject values that are invalid for their existing `type=email` fields before any request is sent.
   - Enter and Space on a primary navigation trigger prevent the synthetic native click and toggle the matching dropdown once; ArrowDown opens and moves focus into the menu.
   - At the mobile breakpoint, collapsed submenu panels are removed from keyboard focus, and opening the hamburger menu focuses its first visible top-level control.
5. Prove the migration with focused regression tests, the existing full suite, type-check, lint, production build, local route checks, and a production smoke test after deployment.

## Non-goals and constraints

- Do not submit public forms, add persistence, modify public copy or design beyond the audited defects, alter unrelated routes, or change domain/redirect settings.
- Preserve current public Action Center response semantics. A durable intake store is explicitly out of scope and requires separate records-retention and moderation approval.
- Publish only after the isolated release branch is reviewed and all verification gates pass.

## Files and responsibilities

- `public/legacy/index.html`: serves the combined homepage through the existing `/` rewrite; retains both the release-candidate sections and the Action Center markup, then adds only the keyboard focus correction.
- `public/assets/action-center.js`: retains Action Center behavior; adds precise client-side email validity checks.
- `public/assets/pillars.js`: owns accessible primary-dropdown behavior, including mobile collapsed-panel focusability.
- `app/api/capture/route.ts` and `app/api/pledge/route.ts`: Next App Router compatibility handlers for the two currently public Action Center endpoints.
- `lib/action-center/intake.ts`: shared pure validation, request parsing, response, and in-memory rate-limit helpers so both handlers preserve the existing contract without duplication.
- `tests/action-center-api.test.ts` and `tests/action-center-browser.test.ts`: regression coverage for the two public API contracts, malformed email prevention, dropdown activation, and mobile focus behavior.

## Failure handling

- Invalid client-side email leaves form state intact, displays the existing inline error message, focuses the field, and makes no request.
- Server validation errors remain non-PII JSON responses and do not disclose rejected values.
- A deployment or smoke-test failure stops promotion; no fallback changes are bundled into this release.
