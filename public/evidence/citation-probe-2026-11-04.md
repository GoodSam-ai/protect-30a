# Controlled citation support probe

Recorded: 2026-11-04T16:27:23.170908-06:00 (America/Chicago).

Four selected answers were generated with retrieval and checked against their cited pages in a separate pass by the same assistant. This is **not** a test of organic AI citations or an independent reviewer. Baseline captured before this publication.

Result: **4 of 4 selected answers supported by their cited pages**; 0 partial, 0 unsupported. This small, deliberately selected sample is not a general accuracy estimate.

## P30A-1

Prompt: According to Protect30A’s current MS4 review, is Walton County’s current permit coverage verified?

Answer: Protect30A says current permit coverage remains unverified in its review; it does not claim an independent compliance determination. [Source](https://protect30a.org/ms4)

Verdict: **supported**. The short-answer section expressly states the coverage limit; the header separately disclaims an independent compliance determination.

Supporting excerpt: “current permit coverage, filing timeliness and compliance remain unverified in this review”.

Retrieval: Direct HTTPS, 200; search retrieval failed.

## P30A-2

Prompt: When Protect30A’s summary conflicts with an official record, which source does its source library say controls?

Answer: Protect30A’s source library says the original official source controls when it conflicts with a Protect30A summary. [Source](https://protect30a.org/source-library)

Verdict: **supported**. The Original records section explicitly covers conflicts with statutes, notices and agency records.

Supporting excerpt: “the original source controls”.

Retrieval: Search tool turn21view1 plus direct HTTPS, 200.

## GC-1

Prompt: Does Good Combinator describe Sponsor Matchmaker as a live record of successful sponsorships or a demonstration?

Answer: Good Combinator labels Sponsor Matchmaker a demonstration using sample data. That page does not establish completed sponsorship outcomes. [Source](https://goodcombinator.ai/about)

Verdict: **supported**. The program card is explicitly labeled demonstration and sample data. The second sentence limits inference from that card rather than asserting no sponsorship exists elsewhere.

Supporting excerpt: “Demonstration · Sample data”.

Retrieval: Search tool initial turn21view2; second verification turn22view0.

## GC-2

Prompt: Does the current Good Combinator research page provide a quantified outcome, or describe the work and evidence expected?

Answer: The reviewed research page describes scoped research work and expected evidence types. It does not present a quantified result on that page. [Source](https://goodcombinator.ai/research)

Verdict: **supported**. The page describes a bounded research sprint and expected proof. Inspection of the complete returned page found no measured outcome; this is limited to the reviewed page, not all Good Combinator work.

Supporting excerpt: “Proof should include datasets, experiments, evaluations, reproducible artifacts, or fielded outputs.”.

Retrieval: Search tool initial turn21view3; second verification turn22view1.

## Limits

- This controlled test supplied or selected source pages; it does not measure spontaneous source selection, organic AI citation frequency or search ranking.
- It does not test separate ChatGPT, Google AI Mode, Perplexity or other consumer answer engines.
- Support means the cited webpage supports the answer; it does not independently verify the underlying agency records, program performance or real-world facts.
- Same-assistant checking can miss errors; independent review remains desirable.
- Search retrieval could not open the MS4 URL while direct HTTPS did, so this probe does not establish crawler/index eligibility.
- Sites are being revised in parallel; findings describe retrieved baseline page versions at the recorded time.
