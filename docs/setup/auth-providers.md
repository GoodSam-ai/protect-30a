# Auth Provider Setup

Protect30A uses Supabase Auth for resident sign-in and admin access. Configure
providers in Supabase Auth using the production app URL, Vercel preview URLs,
and each provider's callback requirements.

Official references:

- [Supabase social login](https://supabase.com/docs/guides/auth/social-login)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase custom OAuth/OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [TikTok Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web/)
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)

## Callback URLs

Use this app callback URL for production:

```text
https://protect30a.org/auth/callback
```

Some OAuth providers require the Supabase callback URI instead of, or in
addition to, the app callback URL:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

For Vercel preview deployments, add preview callbacks where the provider
supports additional redirect URLs or wildcard redirect URLs:

```text
https://<preview-host>/auth/callback
```

Keep Supabase Auth redirect allow-list entries aligned with production and
preview hosts. Use exact preview hosts when a provider does not support
wildcards; use wildcard/additional redirect URL support only where both Supabase
and the upstream provider allow it.

## Built-in Supabase Providers

Configure these as Supabase built-in social providers:

- Google
- Apple
- Facebook
- LinkedIn

Each provider needs its client ID and client secret in Supabase. Mirror the
corresponding local and Vercel environment variables from `.env.example` so the
app can render and flag the expected sign-in options.

## Email Magic Links

Enable email sign-in in Supabase Auth so residents can use magic links without a
social account. Confirm that:

- Site URL is `https://protect30a.org`.
- Additional redirect URLs include the production callback and supported Vercel
  preview callback URLs.
- Local development includes the local callback URL used by the dev server.
- Magic-link emails use Protect30A branding and send users back through
  `/auth/callback`.

## TikTok

TikTok is configured as a Supabase custom OAuth/OIDC provider with this provider
identifier:

```text
custom:tiktok
```

Supabase custom provider identifiers must start with `custom:`, and application
code signs users in with provider values such as `custom:tiktok`.

TikTok Login Kit for Web uses:

```text
https://www.tiktok.com/v2/auth/authorize/
```

TikTok redirect URIs must be HTTPS and must match the redirect URIs registered
on the TikTok app. Keep TikTok sign-in behind:

```text
ENABLE_TIKTOK_LOGIN=true
```

Set the flag to `false` in Vercel if TikTok review or redirect configuration is
not ready.

## Instagram

Instagram is configured as a Supabase custom OAuth/OIDC provider with this
provider identifier:

```text
custom:instagram
```

Use Meta's supported Instagram Login/API path only for eligible Instagram
professional accounts: Business, Creator, or other professional account types
supported by Meta. Ordinary residents who do not have eligible Instagram
accounts should still use Google, Apple, Facebook, LinkedIn, TikTok, or email.

Keep Instagram sign-in behind:

```text
ENABLE_INSTAGRAM_LOGIN=true
```

Set the flag to `false` in Vercel if Meta app review, account eligibility, or
redirect configuration is not ready.

## Identity Linking and Callback Testing

Test every provider with the same resident email where possible. Expected
behavior:

- A returning resident with the same verified email should land on the same
  Protect30A profile instead of creating a duplicate resident record.
- `/auth/callback` should exchange the provider response, establish the session,
  and return the resident to the live engagement flow.
- Preview deployments should complete the callback on the preview host used to
  start the sign-in attempt.
- Admin testing should include `doug@goodsam.ai` after the Supabase profile has
  been bootstrapped to `role = 'admin'`.

Before release, test production and at least one Vercel preview callback for
Google, Apple, Facebook, LinkedIn, email magic link, and any enabled custom
providers.
