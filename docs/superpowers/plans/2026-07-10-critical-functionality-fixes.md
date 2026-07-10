# Protect30A Critical Functionality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Action Center submissions durable and truthful, projected calendar events tentative, and expired live events accurately presented.

**Architecture:** Keep public requests behind the existing Next.js routes. Validate and sanitize in `lib/action-center/intake.ts`, persist through a service-role-only storage adapter, and protect the new Supabase table with RLS. Derive calendar and live-event presentation from source status and timestamps.

**Tech Stack:** Next.js 16, TypeScript 6, Zod 4, Supabase/PostgreSQL, Vitest, React Testing Library.

## Global Constraints

- Never expose RSVP or signup email addresses through a public read API.
- Do not report success unless persistence completes.
- Preserve honeypot, rate-limit, body-size, and sensitive-field protections.
- Preserve source status: projected meetings remain explicitly projected and export as tentative.

---

### Task 1: Action Center regression tests

**Files:**
- Modify: `tests/action-center-api.test.ts`

**Interfaces:**
- Consumes: `POST /api/capture`, `GET|POST /api/pledge`
- Produces: executable validation, persistence, outage, and privacy contracts

- [ ] Add tests that expect invalid RSVP/signup payloads to return `422 validation_failed`.
- [ ] Add tests that expect valid submissions to call the Supabase-backed insert path.
- [ ] Add a test that expects persistence failure to return `503 submission_unavailable`.
- [ ] Replace the non-persistent pledge-wall expectation with saved-count and consent-filtered public-row expectations.
- [ ] Run `npm test -- tests/action-center-api.test.ts` and confirm the new assertions fail against current production code.

### Task 2: Private submission persistence

**Files:**
- Create: `lib/action-center/storage.ts`
- Create: `supabase/migrations/202607100001_action_center_submissions.sql`
- Modify: `lib/action-center/intake.ts`
- Test: `tests/action-center-migration.test.ts`

**Interfaces:**
- Produces: `saveActionCenterSubmission(formType, fields): Promise<void>`
- Produces: `getPublicPledgeWall(): Promise<{ count: number; recent: Array<{ first: string; neighborhood: string }> }>`

- [ ] Add the RLS-protected `action_center_submissions` table and form/date index.
- [ ] Add service-role storage functions that throw on Supabase errors.
- [ ] Add form-specific Zod validation and sanitize unknown fields.
- [ ] Reject pledge, flood-report, and story payloads on the generic capture route.
- [ ] Persist before returning success; translate storage/configuration failures to `503`.
- [ ] Serve total pledge count and only consented public names from saved rows.
- [ ] Run `npm test -- tests/action-center-api.test.ts` and confirm it passes.

### Task 3: Calendar status regression

**Files:**
- Modify: `tests/action-center-browser.test.ts`
- Modify: `public/assets/action-center.js`

**Interfaces:**
- Consumes: meeting `status: "noticed" | "projected"`
- Produces: RFC 5545 `STATUS:CONFIRMED | STATUS:TENTATIVE`

- [ ] Add a browser-level test that captures generated calendar text for projected and noticed meetings.
- [ ] Run the targeted test and confirm projected output incorrectly contains `STATUS:CONFIRMED`.
- [ ] Derive the calendar status from the meeting status.
- [ ] Re-run the targeted test and confirm both cases pass.

### Task 4: Expired event regression

**Files:**
- Modify: `tests/live-podcast-page.test.tsx`
- Modify: `tests/comment-actions.test.ts`
- Modify: `components/live/LivePodcastPage.tsx`
- Modify: `lib/live/actions.ts`
- Create: `lib/live/event-status.ts`
- Create: `supabase/migrations/202607100002_close_expired_event_comments.sql`
- Test: `tests/expired-event-comment-migration.test.ts`

**Interfaces:**
- Consumes: `PodcastEvent.status`, `starts_at`, and `ends_at`
- Produces: truthful public label, player message, participation label, composer availability, and server-side write enforcement

- [ ] Add a fixed-clock test for an expired event still marked `upcoming`.
- [ ] Confirm the test fails because the page says `Upcoming` and leaves comments open.
- [ ] Add a shared timestamp-derived expired-event predicate in the component.
- [ ] Use it for the status label, player empty state, participation label, and comment composer.
- [ ] Reuse the predicate in `createComment` and reject writes for closed or expired events.
- [ ] Replace the database RLS helper with the same expiry predicate so direct Data API writes are also closed.
- [ ] Re-run `npm test -- tests/live-podcast-page.test.tsx` and confirm it passes.

### Task 5: Full verification

**Files:**
- Verify all modified and created files above

**Interfaces:**
- Produces: release-ready evidence

- [ ] Run `npm test` and confirm all tests pass.
- [ ] Run `npm run typecheck` and confirm zero type errors.
- [ ] Run `npm run lint` and confirm no new warnings or errors.
- [ ] Run `npm run build` and confirm the production build succeeds.
- [ ] Run `git diff --check` and review the final diff for privacy, RLS, and source-status compliance.
