# Facebook Groups Integration

Protect30A v1 supports Facebook Groups engagement through resident-safe,
permission-aware workflows. It does not use unauthorized scraping, credential
sharing, browser automation against private groups, or collection of group
content outside Meta's supported surfaces.

Official Meta references:

- [Graph API v19.0 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/)
- [Introducing Facebook Graph API v19.0 and Marketing API v19.0](https://developers.facebook.com/blog/post/2024/01/23/introducing-facebook-graph-and-marketing-api-v19/)

## v1 Modes

### Manual Curation Mode

Manual curation is included in v1. Admins can manually import or summarize
publicly shareable Facebook Group discussion points into the Protect30A admin
workflow when they have the right to view and reuse that material. Entries
should be attributed, moderated, and edited for resident privacy before being
featured in live engagement views.

### Share-Back Mode

Share-back mode is included in v1. Protect30A can provide approved links,
copy, and summaries that organizers or residents post back into Facebook Groups
from their own accounts. This keeps posting consent with the person who controls
the Facebook account and avoids automated publishing to groups.

### Official API/Webhook Mode

Official API/Webhook mode is not assumed available by default. It requires:

- A Meta app with the relevant product surfaces enabled.
- Permissions supported by the current Meta Graph API.
- App review approval where required.
- Webhook objects and fields that Meta still supports.
- A deployment plan that can be disabled with `ENABLE_FACEBOOK_GROUP_API=false`
  if permissions or supported objects are unavailable.

Use official API/Webhook mode only after Meta confirms that the requested group
objects, permissions, and review paths are supported for the app.

## Meta Groups API Deprecations

Meta's Graph API v19.0 materials announced Facebook Groups API deprecations that
applied to v19 and all versions on April 22, 2024. The affected permissions and
features included `publish_to_groups`, `groups_access_member_info`, and
reviewable Groups API functionality.

Because of those deprecations, Protect30A should treat automated Facebook Group
read/write integrations as future, permission-dependent work. The reliable v1
paths are manual curation and share-back workflows.

## Operating Rules

- Do not scrape Facebook Groups.
- Do not ask residents or admins to share Facebook credentials.
- Do not store private group content unless the source user has permission to
  reuse it and the content is appropriate for Protect30A moderation.
- Do not promise automated group publishing or member import until Meta app
  permissions, review, and supported API objects are confirmed.
- Keep the admin UI copy clear that Facebook Group content is curated manually
  unless official API/Webhook mode is explicitly enabled.

