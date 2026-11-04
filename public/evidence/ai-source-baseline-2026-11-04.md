# Public retrieval and measurement baseline
Reviewed November 4, 2026, approximately 4:24 p.m. Central. Publisher: Protect30A. Analyst: AI-assisted review for Doug Liles.

This is a bounded audit of public access, tracking code and search retrieval. It does not evaluate environmental compliance, educational effectiveness, commercial results, or independent AI-answer accuracy.

## Observed results

| Check | Protect30A | Good Combinator |
|---|---|---|
| Homepage HTTP response | 200 | 200 |
| Target evidence page HTTP response | /ms4: 200 | /research: 200 |
| robots.txt | 200; general allow | 200; general and explicit OAI-SearchBot allow |
| Existing analytics code | /assets/traffic.js injects Vercel Web Analytics | /assets/main.js bundles Vercel Analytics 2.0.1 |
| Analytics script delivery | /_vercel/insights/script.js: 200 | /_vercel/insights/script.js: 200 |
| Visitors, page views, AI referrals | Not obtained | Not obtained |
| Verified indexed-page count | Not obtained | Not obtained |
| Independent answer-engine citation accuracy | Not measured | Not measured |

A delivered analytics script does not prove event ingestion. Existing tracking should be checked before adding anything.

## Search spot checks

Exact prompts and returned URL order are preserved in [the JSON baseline](ai-source-baseline-2026-11-04.json). The search tool's returned order must not be described as Google or Bing rank.

| Engine | Exact query | Exact target in returned results |
|---|---|---|
| system2_search_query | site:protect30a.org/ms4 | No; homepage, source library and other site pages returned |
| system2_search_query | site:goodcombinator.ai/research | No; homepage and site directory returned |
| system2_search_query | "Walton County" "MS4" "Protect30A" | No results returned |
| system2_search_query | "Good Combinator" "research" evidence | No; homepage and directory returned with other sites |

A second search engine was checked using site:protect30a.org/ms4 "Walton", site:goodcombinator.ai/research "Research", and "Protect30A" "FLR04E084". Neither target page appeared in its combined returned set. These observations establish a retrieval baseline; they do not establish that either page is unindexed.

## Citation checks and limits

Three search-source descriptions were checked against current homepage wording: Protect30A's nongovernment identity; Good Combinator's GROW/FDE/Foundry pathway; and Good Combinator's visible April 27 footer date. All three matched the page wording observed at review. The date check verifies displayed text, not the actual revision date.

These were selected source-support checks, not independent AI answer sessions and not a representative accuracy sample. No platform-wide citation-accuracy percentage is claimed.

For an actual citation test, save each independent answer verbatim with engine, model/mode, exact prompt, timestamp and cited URLs. Score each attributed claim against the source: supported, partially supported, unsupported or unavailable. Report supported/evaluable claims, with partial and unavailable results separately. Also record target citation presence and uncited claims. Reuse the same prompts after implementation.

## Analytics access

No Search Console or Google Analytics connector was exposed. Vercel's legacy GET /v2/observability/schema endpoint returned 404 "Observability Data not found", including with the known team scope. No separate Web Analytics report tool was exposed. A newer metrics CLI fallback was described by the tool, but the Vercel CLI was not installed. No dashboards or private analytics exports were obtained.

Unknown data is recorded as null in JSON, never zero. Existing Protect30A analytics removes query strings and fragments before sending page URLs; do not add tracking that exposes inquiry details. Good Combinator's workflow dataLayer events do not by themselves establish downstream collection.

## Next reproducible measurements

1. Export daily Vercel Web Analytics page views, visitors, referrers and landing pages for an identical fixed reporting interval. Retain raw exports, timezone and filters; exclude internal QA when feasible.
2. Inspect verified Search Console/Bing properties for sitemap processing, indexing, impressions and clicks. Inspect /ms4 and /research individually.
3. Run a fixed neutral prompt suite in independent answer engines. Example prompts: "What do publicly available records establish about Walton County, Florida's current MS4 permit coverage? Cite original evidence and distinguish unresolved questions."; "What public evidence can I inspect before choosing Good Combinator's AI training or research services? Distinguish demonstrations, requirements and measured outcomes."
4. Compare the same prompts and reporting windows after publication. Keep crawler access, retrieval, citation accuracy, referrals and real outcomes as separate measures.

## Sources

Live HTTP/HTML inspection: [Protect30A](https://protect30a.org/), [MS4](https://protect30a.org/ms4), [Protect30A tracking source](https://protect30a.org/assets/traffic.js), [Good Combinator](https://goodcombinator.ai/), [Research](https://goodcombinator.ai/research), and [Good Combinator bundle](https://goodcombinator.ai/assets/main.js). Search tool reference IDs and exact returned URLs are preserved in JSON for session traceability; these IDs are not durable public URLs.

This self-published audit is not independent validation of either organization.

