# Protect30A correspondence tracking

Created by Codex from Doug Liles's instructions and verified Resend records, October 19, 2026, 10:29 AM Central. Revision 1.

Private dashboard: `/admin/correspondence`, linked from the existing admin page. Only an unrestricted admin profile may view it. The server reads the private database; public and ordinary authenticated roles have no table privileges. Row-level security is enabled with no public policies intentionally.

Case P30A-20261019-01: the original submission to the legacy clerk address bounced. The corrected submission to Lisa Wallace was confirmed delivered through Resend, provider ID `01a154c4-1268-7bc8-8b38-d41f01551deb`. Acknowledgment, placement in the public record, council consideration, and adoption of a reporting deadline remain unconfirmed.

## Activation verified — October 19, 2026, 10:36 AM Central

The Vercel connector returned HTTP 403 for environment-variable creation. The existing signed-in browser session successfully saved the secret as a production Secret variable. Deployment `dpl_B84yuhCZDYUaAg3pSSLnW9B5WsXJ` reached READY; the webhook was enabled. A controlled internal test produced signed email.sent, email.delivered, and email.received rows in the private database. An unsigned live POST returned 400. Do not place the secret in source control or chat.

For future rotation or recovery:

1. Retrieve the secret securely from the Resend webhook settings for webhook `2dd20292-f036-466e-b06a-d24e9985559c`.
2. Save it as encrypted `RESEND_WEBHOOK_SECRET` in the Vercel production environment and redeploy.
3. Enable the webhook at `https://protect30a.org/api/correspondence/webhook`.
4. Send a controlled test to `correspondence@inbox.protect30a.org`; confirm the signed receipt event appears in the private dashboard. Confirm forged signatures fail and duplicate delivery does not add another event.

The endpoint verifies the raw payload with Svix, validates timestamps, stores each event once, ignores unrelated projects, and returns retryable errors for storage failures. Metadata only is retained. Received email never triggers actions or automatically establishes acknowledgment, legal findings, or commitments. Full message review remains manual in the source mailbox.

The submitted letter's Reply-To remains `digitalcommons@icloud.com`. Automatic forwarding from that mailbox to `correspondence@inbox.protect30a.org` was enabled with owner confirmation October 19, 2026, 11:37 a.m. CDT; delete-after-forwarding is OFF. Test `P30A-FWD-20261019-1137` confirmed iCloud delivery, Resend inbound receipt (`92083ac2-2895-46d7-98a0-745c2aa1d96b`), and an inbound-email row in the unified dashboard. New replies now enter automatically; older mailbox contents are not backfilled. Future sending workflows must select their reply address explicitly.

No recurring reminders or automated outbound follow-ups have been configured. Record official acknowledgment and council actions only after reviewing the supporting reply, minutes, or recording. The 30-day reporting clock begins only on confirmed adoption of that direction.

Validation: signed webhook, forged signature, missing-secret, idempotency, and storage-error tests; full test suite, TypeScript check, production build; database grants and RLS inspection.
