# Protect30A

Community stormwater plan and live engagement platform for South Walton's 30A corridor.

**Live site:** https://protect30a.org/

## Development

```bash
npm install
npm run dev
```

The current homepage and `/show` page are preserved as legacy static HTML under `public/legacy/` and served through Next.js rewrites. New interactive routes live under `/live`, `/live/[slug]`, and `/admin`.
