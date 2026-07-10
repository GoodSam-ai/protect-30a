# Protect30A Critical Functionality Fixes Design

## Scope

Fix the three verified production defects without changing unrelated public-site behavior:

1. RSVP, signup, and pledge submissions must be validated and persisted before success is shown.
2. Projected meetings must export as tentative calendar events.
3. Expired events marked `upcoming` must display as past events and stop accepting comments.

## Submission architecture

The existing Next.js API routes remain the only public write surface. They validate and sanitize each supported form type, then call a focused storage module that uses the existing Supabase service-role client. A new `action_center_submissions` table stores the form type and sanitized JSON fields. Row-level security is enabled with no public policies, so only the server-side service role can read or write submissions.

Durable intake is limited to the three approved public flows: RSVP, signup, and
pledge. Legacy `flood-report`, `story`, and generic-capture pledge shapes remain
rejected so the change does not silently expand collection or bypass records
consent.

Pledge-wall reads also go through the API. The response counts every saved pledge but returns first name and neighborhood only for rows with explicit public-display consent. Emails and free text are never returned by this endpoint. If Supabase is missing or a write fails, the API returns `503` and the browser keeps the form populated while showing an error.

## Validation contracts

- RSVP requires a meeting identifier, first name, and explicit reminder/public-record consent. Email is optional, but must be valid when supplied.
- Signup requires a valid email and explicit consent.
- Pledge requires a first name and explicit public-record consent.
- Unknown fields are dropped; known high-risk sensitive fields remain rejected.
- Honeypot submissions keep their silent-success behavior and are never persisted.

## Calendar and live-event behavior

The existing calendar builder derives the RFC 5545 status from the meeting record: projected rows use `TENTATIVE`; officially noticed rows use `CONFIRMED`.

The live-room component derives whether an `upcoming` event is already past from `ends_at` when present, otherwise `starts_at`. Expired upcoming events show `Past event`, display a no-replay-yet message when appropriate, and close the comment composer. Stored event rows are not mutated during rendering.

The same status predicate is enforced by the server-side comment action before
duplicate checks or inserts, so a direct API request cannot bypass the closed
composer.

A follow-on migration replaces the RLS helper with the same predicate, closing
direct Supabase Data API inserts after an upcoming event has expired.

## Launch governance gate

Durable intake must not be deployed until the public records/privacy page names
a specific retention period and the matching deletion/export procedure is
approved. The prior page still contains a `[to be set]` retention placeholder,
so the code and migration can be reviewed now but production activation remains
blocked on that policy decision.

## Testing

Regression tests cover invalid payload rejection, successful persistence, failure-to-persist behavior, consent-filtered pledge-wall output, projected/noticed calendar exports, expired event labeling, and comment closure. Targeted tests run first, followed by the full test, typecheck, lint, and production build commands.
