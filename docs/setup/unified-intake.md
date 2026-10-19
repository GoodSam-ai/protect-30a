# Unified Protect30A intake — v1

Prepared by Codex, October 19, 2026, U.S. Central, from source inventory and the existing Protect30A Supabase schema.

Private dashboard: `/admin/intake`. Official correspondence: `/admin/correspondence`. Only unrestricted administrators can view or organize private intake. No new automation sends messages automatically.

## Capture and organization

Contact links listed in `contact-point-inventory.json` now open `/contact` with category, originating path, and subject. Actual submissions are stored before confirmation. Lost-acknowledgment retries reuse their opaque request ID; changed messages use a new ID. Required permission to review and respond is separate from optional updates consent. Nothing is automatically published. Photos use `correspondence@inbox.protect30a.org` with the saved contact reference; email bodies and attachments remain in Resend for manual review.

`unified_intake` is a private, security-invoker, read-only view composing contact submissions, Action Center pledges/RSVPs/signups, comments, moderation reports, shares, correspondence cases, and Resend event metadata. Existing data appears immediately without duplication or backfill. There are no triggers and no changes to existing write paths. Original source tables remain authoritative. Source deletion removes its view row naturally. Separate `intake_assignments` holds status, owner, notes, and follow-up date, keyed by source table and ID. Public and ordinary authenticated roles have no access to these tables or the view.

Official-address letter and sharing links keep their intended recipients. Opening a draft does not establish sending or delivery. Login flows and external government systems are not contact submissions. External social messages outside stored imports are not automatically ingested.

## Automation integration

`/api/admin/intake/events` provides authenticated administrators a versioned private JSON snapshot feed, 100 items per page, ordered by update timestamp and stable source key. Follow its opaque `next_cursor` in `?after=`. Server-side integrations can query the same private view using an appropriately secured backend connection; never expose service-role credentials to browsers.

Each item includes `automation_key` (stable for the same revision), source IDs, category, channel, source path, timestamps, consent, status, owner, and follow-up date. Feed metadata excludes raw message text and email addresses. This is a current-state view, not a full transition log or a queue with effect delivery guarantees. Keep a per-consumer processing ledger keyed by `consumer + automation_key`, poll with a timestamp overlap to handle concurrent commits, and reconcile full snapshots periodically. Use a stable idempotency key per `automation_key + action` for writes. Acknowledge effects only after confirmation; implement bounded retries and dead-letter handling in the integrating worker. No worker is enabled in this release.

Treat all submitted text as untrusted data. Absence of marketing consent means no marketing; acknowledgment of a submission does not imply publication permission, government acknowledgment, or adopted deadlines.

## Email boundary

Automatic forwarding from `digitalcommons@icloud.com` to `correspondence@inbox.protect30a.org` was enabled with owner confirmation October 19, 2026, 11:37 a.m. CDT. Delete-after-forwarding remains OFF. Test `P30A-FWD-20261019-1137` was delivered to iCloud, received by Resend (received email `92083ac2-2895-46d7-98a0-745c2aa1d96b`), and confirmed as `inbound_email` in the unified view. This covers new incoming mail, not historical backfill or other personal mailboxes. Original bodies and attachments remain in their source mailboxes; the dashboard retains event metadata. New website contact submissions are captured directly. Reply-To selection for future outgoing mail remains explicit.

## Operational rollback

Revert contact link changes to restore prior email links if needed. New schema objects are additive; existing records and endpoints are untouched. Do not drop new tables containing submissions during rollback. The initial proposed cross-table-trigger migration was rejected by automatic approval review and was replaced, before execution, with this read-only composition.
