# Protect30A PR #14 security and workflow audit

Date: November 1, 2026 (America/Chicago).
Audited head: 117211e9ee8782a765f1b6663ad1febe2bad292b.
Base: abde5053a2f42ce9c4a02e8a56b6ab0b82b1e6a0.
Decision: REQUIRES CORRECTIONS; keep draft, do not merge or activate public intake.
Suitable for isolated synthetic-data development only. This report does not authorize activation.

## Scope reconciliation

The original title/body described validation helpers and tests and explicitly denied an upload implementation. The actual five-file diff added a server POST route using the service-role client, a table and private bucket migration, validation helpers, 18 validation tests and three endpoint guard tests. The upload path was executable when STORM_PHOTO_INTAKE_ENABLED=true. The body was materially inaccurate.

Containment in this revision removes that executable path from the route (preserved in Git history), returning 503 before parsing or provider access even when the old flag is true. It adds no-store and five Node-runtime closure tests. The migration remains a proposed, unexecuted artifact in this audit; no database or production configuration was changed. Existing deployments and environment settings were not inspected or certified disabled. A deployed old revision must retain the disabled flag until this containment reaches it through the approved deployment process.

## Intended workflow

Source: Protect30A District Ops storm-recovery intake skill and its platform-rules.md, revision 0.2 dated October 22, 2026; private test-status.md. These are design requirements, not evidence of live integrations.

Protect30A is the public surface; Good Workspace canonical capabilities are the system of record. Authenticate an existing platform principal, authorize organization/object access, gather dated evidence and property/community context, record consent and representative authority separately, and use versioned canonical commands with idempotency, version checks and audit. Capture material/dimensions, hazards and payer preferences without promising work, safety or funding. Do not invent a parallel identity or evidence store. No applicable live canonical integration was established by this PR.

## Findings and required corrections

| Priority | Evidence in original head | Required correction and acceptance evidence |
| --- | --- | --- |
| Blocker | No authentication or object/organization authorization; service-role client writes on caller inputs. Origin absent is accepted; same-origin is not caller identity. | Integrate canonical principal, membership and object/capability authorization before body/provider work. Deny anonymous, wrong organization/object and revoked membership. Cookie-authenticated browser writes need explicit trusted-origin/CSRF policy; do not use Origin as authentication. |
| Blocker | No distributed rate limit, account quota, bot control or bounded request reader. formData() buffers before photo.size is checked. | Enforce trusted ingress and application limits before expensive parsing, streaming byte cap including multipart overhead, field/part count limits, per-principal and abuse quotas across instances. Do not trust Content-Length or arbitrary forwarded IP headers alone. Test chunked/missing/lying length, oversized fields/many parts and quota concurrency. |
| Blocker | Photo validation trusts client MIME/name/size; scripts with image/jpeg pass helper. | Inspect actual bytes and decode in a constrained image pipeline, enforce pixel/dimension/decompression limits, define supported HEIC/HEIF handling, quarantine/scan as appropriate. Preserve protected original with hash and produce sanitized derivative; restrict EXIF/GPS disclosure. Test MIME/signature mismatch, truncated/polyglot images, decompression bombs and real phone fixtures. |
| Blocker | request_key globally unique, not actor/organization scoped; replay returns id without payload comparison. Storage duplicate errors are recognized by message regex and ignored. | Canonical idempotency record scoped to principal/organization/command, with normalized payload and photo hash; reject same key/different content (409). Use structured provider errors, deterministic object identity and verified content. Never treat an unverified existing object as the requested upload. |
| Blocker | Storage upload and report insert are separate effects. Upload success + failed insert leaves orphan; a subsequent request can attach different fields to old photo. Concurrent different payloads can pair winning photo with another request's fields. | Durable reservation/state machine and reconciliation for storage/database boundary; record expected hash/path before upload, verify effects after timeouts, recover pending state and clean only verified abandoned objects. Do not delete objects another attempt may have committed. Test concurrent same/different payload, lost upload ack, lost insert ack, late commits, replay after restart and cleanup races. |
| High | RLS enabled and anon/authenticated grants revoked on table, private bucket requested. Service role bypasses those protections. No live grants/policy checks. | Verify effective table/schema grants including PUBLIC, existing storage.objects policies, bucket settings, private read/download/list denials, service-key isolation and authorized reviewer access in disposable Supabase. Private bucket is a positive default, not proof of privacy. |
| High | Bucket INSERT ON CONFLICT DO NOTHING leaves any preexisting bucket configuration untouched; CREATE TABLE IF NOT EXISTS similarly does not reconcile an existing schema. | Fail migration/preflight on incompatible existing state or apply explicitly reviewed reconciliation; assert private flag, byte/MIME restrictions, constraints and grants. Do not blindly modify shared storage policies. |
| High | Coordinate CHECK can evaluate UNKNOWN for one null coordinate and therefore accept it when address exists. Client invalid key throws into generic 503; address silently truncated; duplicate fields and File-valued text fields coerced. | Explicit both-null OR both-not-null coordinate constraint; server and DB type/length/key validation; reject malformed/duplicate inputs with 4xx and reject overlong address rather than silently altering it. Test direct SQL bypass of route validation, partial nulls, NaN/infinity and boundary values. |
| Blocker | Only email/location/photo retained, no actor/tenant/property/consent/authority/evidence reference or immutable audit. | Use canonical evidence intake and request commands. Record evidence date/provenance, content digest and immutable reference; consent version/time and access authority; uncertain parcel/community associations; material/dimensions, hazard flags, payer preferences. Status changes require authorization and expected versions. Receipt is not work authorization. |
| High | Raw photo may contain faces, plates and EXIF; contact email/address/GPS stored without workflow retention or disclosure rules. No reviewed access/export/delete path. | Define minimum collection, notice/consent, retention and applicable records obligations, least-privilege review, short-lived scoped signed access, audit of access/export, log redaction and deletion/reconciliation. Test cross-user access and public/analytics/search leakage using synthetic PII. |

## Independent Evidence and Effects Gate

FAIL / NOT DEMONSTRATED. The unique request key is a useful start, but does not provide payload-bound, principal-scoped, recoverable idempotency across all effects.

1. Externally preserved traces: no independent, agent-nonwritable evidence sink, verifier or retention proof found in the changed implementation/CI. GitHub logs provide externally hosted execution evidence but are not sufficient proof of independent effects or immutable runtime traces.
2. Stable idempotency keys: storage/insert split, unbound payloads and unscoped keys fail the required guarantee.
3. Retry/lost acknowledgement/late commit/duplicate delivery: no such tests in the PR.
4. Safety plus benign utility over repeated seeded trials: no scenario harness/results, unauthorized-access trials or successful resident journey found.
5. External single-use deployment approval token bound to exact artifact and evaluation hashes: no implementation or verification found. An environment variable and green status checks do not satisfy this requirement.

Before activation, produce independent redacted request/effect traces and actual provider effects from repeated seeded scenarios. An external verifier must bind code/artifact and evaluation hashes, reject stale/mismatched/reused tokens, and control deployment approval outside the agent-writable environment. Protect contact/location data in traces. Git evidence alone is not gate completion.

## Verified tests versus unverified behavior

Original GitHub Actions run 41242174038, job 124658411275, tested merge ref 769924b55e38dfd4a99a190c90e2ceb568723b3d (head 117211e + base abde505): typecheck passed, lint completed with 32 warnings/zero errors, 327 Vitest tests and five traffic Node tests passed. Storm coverage was 18 helper tests plus three guard tests. No successful upload or live database/storage security integration was exercised by those tests. Vercel status success is separate deployment evidence.

CI install log also reported 28 dependency vulnerabilities (19 moderate, eight high, one critical). This is a historical scanner result, not proof of exploitable storm-route flaws; obtain current advisory details and triage runtime reachability separately before release. Do not run broad forced upgrades as part of this containment.

No live migration execution, Supabase advisor run, RLS integration, browser/device E2E or independent gate certification was performed in this audit. Local containment verification: five new closure tests failed against the original route, then passed after containment. Full npm test passed: 41 Vitest files / 329 tests plus five traffic Node tests. Typecheck passed. Lint passed with zero errors and 32 existing warnings. This proves closure, not a working secure upload.

## Release acceptance checklist

- Reviewed canonical workflow contract and authorized principal/object integration.
- All blocker corrections above, with synthetic integration tests against disposable services.
- Real iOS/Android JPEG/HEIC cases, location fallback, consent, success receipt, offline retry and status tracking.
- Two-resident/HOA/contractor/reviewer permission matrix including revoked membership.
- Concurrent/repeated request effect counts and hash consistency; injected failures at each storage/DB boundary.
- Independent evidence/effects gate completed for exact artifact/evaluation hashes; single-use external approval verified.
- Explicit Doug approval before public activation; retain closed route until the reviewed implementation replaces it.

References: https://github.com/GoodSam-ai/protect-30a/pull/14 ; https://github.com/GoodSam-ai/protect-30a/actions/runs/41242174038 ; https://supabase.com/docs/guides/storage/security/access-control ; https://supabase.com/docs/guides/database/postgres/row-level-security . Supabase documentation was consulted for service-role/RLS/storage semantics; changelog markdown retrieval through web tool was unavailable (unsupported content type). No Supabase feature or schema modification was implemented.
