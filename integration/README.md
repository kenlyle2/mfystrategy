# PostGlider Competitor Intelligence — Integration Folder

**Generated:** April 10, 2026  
**Pipeline:** Predis.ai → Claude in Chrome extraction → JSON storage → Analysis → Integration spec  
**Status:** Phase 1 complete (Man Flow Yoga / Dean Pohlman, IG + FB)

---

## What's in this folder

| File | What it is |
|---|---|
| `README.md` | This file — navigation and context |
| `mfy_intelligence_report.md` | Full competitor analysis: Man Flow Yoga, Instagram + Facebook, 111/113 posts, 90-day window |
| `postglider_product_integration.md` | How each insight maps to a PostGlider feature, UX copy, and prioritized build list |
| `pipeline_spec.md` | Technical spec for the automated extraction → analysis → insight pipeline |

---

## The core problem being solved

Predis.ai's Competitor Analysis feature (4 tabs: Content Analysis, Content Themes, Hashtag Analysis, Post Performance) shows data but **offers zero conclusions or actionable insights**. A user can see that Man Flow Yoga posted 111 times in 90 days — but Predis.ai does not tell them that 21% of those posts landed on Tuesday and Sunday, the two worst engagement days, costing Dean roughly 15–20% of his total engagement over the period.

PostGlider's intelligence layer sits on top of this data and turns it into decisions.

---

## How the pipeline runs today (manual, Phase 1)

1. Navigate to Predis.ai Competitor Analysis → Tab 4 (Post Performance)
2. Claude in Chrome extracts the full post table (with pagination)
3. Data is structured into `raw_data.json` (see `competitor_data/` in this repo)
4. `code/analyze_competitor.py` runs against the JSON to produce quantified signals
5. Claude synthesizes into a narrative insight report (see `reports/`)
6. Integration docs (this folder) translate insights into PostGlider product decisions

**Next step:** Automate steps 1–3 using a Playwright/Comet workflow triggered by Claude Code.

---

## Competitor scope

| Competitor | Platform | Status | File |
|---|---|---|---|
| Dean Pohlman / Man Flow Yoga | Instagram | ✅ Done | `competitor_data/dean_pohlman_ig/raw_data.json` |
| Dean Pohlman / Man Flow Yoga | Facebook | ✅ Done | `competitor_data/dean_pohlman_fb/raw_data.json` |
| Competitor 2 | TBD | 🔲 Queued | — |
| Competitor 3 | TBD | 🔲 Queued | — |

*Adding 2–3 more competitors will allow sector-wide benchmarks (not just MFY-specific observations).*

---

## Key numbers at a glance

| Signal | Value | Implication |
|---|---|---|
| IG engagement rate | 0.21% avg | Baseline for niche benchmarking |
| FB engagement rate | 0.06% avg | FB is reach, not relationship |
| Carousel IG efficiency | 2.19× avg | Best format by far |
| Single image IG efficiency | 3.11× avg | Highest per-post but rarely used |
| Best IG day | Friday (+36%) | Schedule here first |
| Worst IG day | Sunday (−39%) | Never post |
| Best FB day | Saturday (+152%) | Must-post day |
| Worst FB day | Friday (−40%) | Never post on FB |
| Top-performing post | AI caricature (1.26%) | Personal + playful = highest ceiling |
| Worst content theme | Yoga basics / diet (0.11%) | Audience is numb to it |
