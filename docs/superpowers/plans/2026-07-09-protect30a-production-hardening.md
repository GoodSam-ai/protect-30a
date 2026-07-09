# Protect30A Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the newer app routes to production without regressing the currently deployed Action Center, and fix the three audited input/navigation accessibility defects.

**Architecture:** Start from the Next.js release candidate. Migrate the serving static homepage and its public action assets from the currently deployed static branch into the Next public tree. Re-express the two static Vercel handlers as App Router handlers backed by shared, pure intake validation. Keep static UI behavior framework-free; cover it through JSDOM script execution.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, JSDOM, framework-free browser JavaScript.

## Global Constraints

- Preserve the current Action Center markup, copy, route paths, and non-persistent Phase-0 semantics.
- Do not add storage, analytics, public form submissions, or retention/moderation behavior.
- Do not change public content except invalid-email prevention and keyboard/focus fixes.
- Do not deploy until focused tests, the existing full suite, type-check, lint, production build, and preview smoke checks pass.

---

### Task 1: Preserve the production static surface in the Next public tree

**Files:**
- Create: `tests/legacy-action-center-contract.test.ts`
- Modify: `public/legacy/index.html`
- Modify: `public/assets/action-center.js`
- Modify: `public/assets/content.js`
- Modify: `public/assets/metrics.js`
- Modify: `public/assets/records-notice.js`
- Modify: `public/content/*`

**Interfaces:**
- Consumes: public Action Center source from commit `3700c4fa8dde50606909f3b725f4d784fdad4bef`.
- Produces: the existing `/` Action Center controls and static content under `/assets/*` and `/content/*` from the Next public tree.

- [ ] **Step 1: Write the failing parity test**

```ts
it("keeps the currently deployed Action Center controls and assets", async () => {
  const html = await readFile(join(process.cwd(), "public/legacy/index.html"), "utf8");
  expect(html).toContain('id="pp-pledge-form"');
  expect(html).toContain('id="pp-rsvp-form"');
  expect(html).toContain('id="pp-signup-form"');
  expect(html).toContain('src="/assets/action-center.js"');
  await expect(access("public/assets/action-center.js")).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/legacy-action-center-contract.test.ts`

Expected: FAIL because the release-candidate homepage does not contain the Action Center controls or load the script.

- [ ] **Step 3: Migrate the serving static assets without altering their behavior**

Apply the production branch's `index.html`, Action Center assets, and content files into their `public/legacy`, `public/assets`, and `public/content` destinations. Preserve the public paths exactly; only the source-tree location changes.

- [ ] **Step 4: Run the parity test**

Run: `npx vitest run tests/legacy-action-center-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the migration**

```bash
git add public tests/legacy-action-center-contract.test.ts
git commit -m "fix: preserve Action Center in Next release"
```

### Task 2: Preserve the public Action Center API contracts as Next route handlers

**Files:**
- Create: `lib/action-center/intake.ts`
- Create: `app/api/capture/route.ts`
- Create: `app/api/pledge/route.ts`
- Create: `tests/action-center-api.test.ts`

**Interfaces:**
- Consumes: `Request` objects and JSON bodies for existing `/api/capture` and `/api/pledge` paths.
- Produces: `Response` objects with the existing allowlists, method enforcement, honeypot behavior, no-PII error codes, and JSON shapes.

- [ ] **Step 1: Write failing request/response contract tests**

```ts
it("keeps the capture endpoint's safe RSVP contract", async () => {
  const response = await capturePost(jsonRequest({
    formType: "rsvp",
    fields: { hearingId: "meeting", hearingTitle: "Public meeting", first: "Sam", email: "sam@example.com", consentReminder: true },
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, formType: "rsvp", receivedCount: 5 });
});

it("rejects sensitive pledge fields without returning submitted values", async () => {
  const response = await pledgePost(jsonRequest({ first: "Sam", consentRecords: true, email: "sam@example.com" }));
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ ok: false, error: "sensitive_field_rejected" });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/action-center-api.test.ts`

Expected: FAIL because neither App Router route exists.

- [ ] **Step 3: Implement the shared, pure intake contract**

```ts
export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
```

Port the current route behavior exactly: a 20-request-per-minute best-effort in-memory limiter, existing allowlists and sensitive-key lists, success-on-honeypot, non-persistent success responses, and `Allow` headers on unsupported methods.

- [ ] **Step 4: Implement route adapters**

```ts
export async function POST(request: Request) {
  return handleCapture(request);
}

export function GET() {
  return Response.json({ ok: true, count: 0, recent: [] });
}
```

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run tests/action-center-api.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the API migration**

```bash
git add app/api/capture app/api/pledge lib/action-center tests/action-center-api.test.ts
git commit -m "fix: preserve Action Center API contracts"
```

### Task 3: Correct client-side email and keyboard behavior

**Files:**
- Create: `tests/action-center-browser.test.ts`
- Modify: `public/assets/action-center.js`
- Modify: `public/assets/pillars.js`
- Modify: `public/legacy/index.html`

**Interfaces:**
- Consumes: existing Action Center form IDs, primary navigation `.nav-top` controls, `.nav-panel` elements, and `#nav-menu`.
- Produces: no POST for malformed email, one predictable dropdown state transition per keyboard action, and mobile focus that lands only on visible controls.

- [ ] **Step 1: Write failing browser-behavior tests**

```ts
it("blocks an invalid optional RSVP reminder email before fetch", async () => {
  rsvpEmail.value = "x@";
  submitRsvp();
  expect(fetch).not.toHaveBeenCalled();
  expect(status.textContent).toMatch(/valid email/i);
});

it("toggles a primary dropdown once on Enter", async () => {
  trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  expect(trigger).toHaveAttribute("aria-expanded", "true");
});

it("focuses the first visible primary control when the mobile menu opens", async () => {
  openMobileMenu();
  expect(document.activeElement).toHaveClass("nav-top");
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npx vitest run tests/action-center-browser.test.ts`

Expected: FAIL for `x@`, primary-nav Enter state, and mobile focus.

- [ ] **Step 3: Add minimal email validity checks**

```js
function hasValidEmail(input, value) {
  if (!value) return false;
  if (input && typeof input.checkValidity === "function") return input.checkValidity();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```

Use it for required signup email and only when the optional RSVP email is non-empty. On failure, keep the current inline-error and focus behavior and return before `fetch`.

- [ ] **Step 4: Make dropdown state transitions explicit**

```js
case "Enter":
case " ":
  e.preventDefault();
  toggleBtn(btn);
  break;
case "ArrowDown":
  e.preventDefault();
  openBtn(btn);
  first && first.focus();
  break;
```

On screens at or below 820px, set collapsed panels to `inert` and `aria-hidden="true"`; remove those attributes when expanded and when returning to desktop. Focus `.nav-top` or `.nav-cta` after opening the hamburger, never the first descendant link.

- [ ] **Step 5: Run the browser regression tests**

Run: `npx vitest run tests/action-center-browser.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the behavior fixes**

```bash
git add public/assets/action-center.js public/assets/pillars.js public/legacy/index.html tests/action-center-browser.test.ts
git commit -m "fix: harden action and navigation controls"
```

### Task 4: Verify the complete release and publish

**Files:**
- Modify: none unless verification reveals a focused defect.

- [ ] **Step 1: Run all local verification gates**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Exercise the production build locally without submitting forms**

Run: `npm start -- --port 3100`

Verify: `GET /`, `/live`, `/south-walton-resources`, `/api/pledge`, and invalid `POST`/unsupported methods return their expected response shapes. Do not submit a successful public action.

- [ ] **Step 3: Create a preview deployment and smoke-test it**

Verify public homepage Action Center assets and current static routes, then verify `/live`, `/south-walton-resources`, `/api/pledge`, and `/api/capture` are reachable. Check console/runtime logs for errors.

- [ ] **Step 4: Promote the verified preview to production**

Verify `https://protect30a.org/`, `/live`, `/south-walton-resources`, `/api/pledge`, and `/api/capture` after production propagation. Recheck current internal routes and avoid submitting public forms.

- [ ] **Step 5: Push the release branch**

```bash
git push -u origin codex/protect30a-production-hardening
```
