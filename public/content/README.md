# `/content/` — editable site data

These JSON files are the **content layer** for Protect30A. They hold meetings, records, projects, place aliases, sponsors, episodes, toolkit downloads, and per-district data. The website reads them at runtime through `assets/content.js`. **You do not need to be a developer to edit them** — but you do need to follow the honesty and compliance rules below, because everything here is public.

---

## How to edit safely (non-developer workflow)

1. **Open the file on GitHub** (browse to `content/…` and click the pencil ✏️ "Edit" icon).
2. **Make your change** directly in the browser. Keep the JSON valid: every `{ }` and `[ ]` must be balanced, strings need double quotes `"like this"`, and rows are separated by commas (no trailing comma after the last one).
3. **Propose the change** — GitHub creates a branch and a Pull Request (PR).
4. **Vercel builds a Preview** automatically and posts a preview link on the PR. Click it and check your change renders correctly.
5. **Merge to `main`** → it goes to production.

> Tip: if the site breaks after an edit, it's almost always a JSON syntax error (a missing comma or quote). Paste the file into any "JSON validator" to find it.

Each file starts with a `"_readme"` string explaining its exact schema. **Read that first.**

---

## Non-negotiable content rules

These aren't style preferences — they keep us legally clean and trustworthy.

### 1. "Noticed" vs "projected" — never blur them
- **`status: "noticed"`** = a real, officially-noticed public meeting with a checkable agenda source. Only use this when you can point to the agenda.
- **`status: "projected"`** = a milestone we *expect* from the plan timeline that has **not** been officially scheduled. Every projected row must carry a note like `"[INFERRED from plan timeline]"`.
- Do **not** upgrade a projected item to noticed until it actually appears on an official agenda.

### 2. Flag anything unconfirmed
- Use **`"[UNVERIFIED]"`** in a note (or inline in text) whenever a fact hasn't been confirmed against a primary source.
- Use **`"[ILLUSTRATIVE]"`** for example/concept content (e.g., candidate projects that need engineering review).
- The DEP Grant **LPA0381** row is the model: it is marked `confidence: "inferred"` with an `[UNVERIFIED]` note until we have the executed agreement.
- Basin/lake associations in `places.json` and district files are `[UNVERIFIED]` until confirmed against an authoritative hydrologic map.

### 3. Never add per-property dollar figures
- Do **not** put "$X per home/parcel/year" anywhere. Program-level planning estimates are OK **only** if clearly labeled as estimates.
- This protects against implying an assessment amount that hasn't been adopted.

### 4. Say "special assessment", not "tax"
- The funding mechanism is a **dedicated special assessment** (benefit-received basis), not a tax. Keep that language everywhere.

### 5. Public records, no PII
- Everything here is a public record (Florida Ch. 119). **Do not** add personal information (private emails, phone numbers, names of private individuals without consent). Email *templates* are fine; real constituents' data is not.

### 6. Cite precisely
- Prefer exact citations: statute sections (e.g., `FS § 197.3632`), grant IDs (`LPA0381`), resolution numbers, and real source URLs. A general county/DEP homepage is an acceptable placeholder **only** when flagged for replacement with the specific record.

---

## File map

| File | What it holds |
|---|---|
| `meetings.json` | Meeting calendar (noticed BCC cadence + projected milestones) |
| `records-manifest.json` | Index of public records / statutes / grants behind the plan |
| `projects.json` | Candidate + completed projects by basin/district (not an adopted plan) |
| `places.json` | Neighborhood/alias → district-slug lookup |
| `sponsors.json` | Community sponsor logo wall |
| `episodes.json` | Podcast/video segments |
| `toolkit.json` | Downloadable resident/stakeholder resources |
| `district-data/<slug>.json` | Per-district detail (worked example: `grayton-blue-mountain.json`) |

`<slug>` and any `districtSlug` / `district_slug` field **must** match a real district route slug (e.g. `grayton-blue-mountain`, `santa-rosa-beach-gulf-place-dune-allen`, `seagrove-seaside-watercolor`, `watersound-seacrest-prominence-origins`).
