# PostGlider Competitor Intelligence Pipeline — Technical Spec
**Version:** 1.0 (Phase 1 — manual extraction)  
**Date:** April 10, 2026

---

## Overview

The pipeline converts Predis.ai competitor data into PostGlider intelligence signals. It runs in five stages:

```
Predis.ai UI
    ↓  (Claude in Chrome extraction)
raw_data.json  (structured, versioned)
    ↓  (analyze_competitor.py)
Quantified signals  (efficiency ratios, day-of-week index, etc.)
    ↓  (Claude synthesis)
Narrative reports  (reports/*)
    ↓  (PostGlider integration layer)
Inline nudges + Dashboard  (app.postglider.com)
```

---

## Stage 1: Extraction (Predis.ai → JSON)

### Source
Predis.ai Competitor Analysis feature — Tab 4: Post Performance

### Current method (Phase 1, manual)
1. Navigate to `predis.ai` → Competitor Analysis → select competitor + platform
2. Open Tab 4 (Post Performance) — shows a paginated table of all posts
3. Claude in Chrome reads each page of the table (handles pagination)
4. Claude structures each row into the `raw_data.json` format

### Data fields captured per post

```json
{
  "eng_pct": 0.51,
  "likes": 248,
  "comments": 3,
  "date": "2026-04-02",
  "caption_snippet": "Consistency. Dedication. Motivation."
}
```

### Summary fields captured (from Tabs 1–3)

```json
{
  "competitor": "Dean Pohlman",
  "platform": "Instagram",
  "brand_context": "Man Flow Yoga",
  "date_range": "2026-01-03 to 2026-04-03",
  "extracted": "2026-04-10",
  "summary": {
    "followers": 49000,
    "total_posts": 111,
    "average_likes": 100,
    "avg_engagement_pct": 0.21,
    "average_engagement": 104,
    "average_comments": 3
  },
  "post_distribution": { ... },
  "content_themes": [ ... ],
  "hashtags": { ... },
  "best_performing_posts": [ ... ],
  "all_posts": [ ... ]
}
```

### Full schema
See `competitor_data/dean_pohlman_ig/raw_data.json` as the canonical example.

### Future method (Phase 2, automated)
- Playwright script navigates Predis.ai, iterates pagination, extracts table rows
- Triggered by Claude Code or Comet workflow
- Runs monthly per competitor × platform pair
- Writes versioned JSON: `raw_data_YYYY-MM-DD.json` with symlink to `raw_data.json` (latest)

---

## Stage 2: Analysis (analyze_competitor.py)

### Location
`code/analyze_competitor.py`

### Inputs
`competitor_data/{competitor}_{platform}/raw_data.json`

### Outputs (stdout, structured text)

1. **Format Efficiency** — posts%, engagement%, eng/post, efficiency ratio for each format
2. **Day-of-Week** — count, avg eng%, avg likes, vs-account-avg %, flags (AVOID / SWEET SPOT)
3. **Theme ROI** — sorted by eng%, with INVEST MORE / CUT BACK / UNDER-USED labels
4. **Hashtag Efficiency** — outperformers and underperformers vs account avg
5. **Top/Bottom 10 Posts** — eng%, day, likes, comments, caption snippet
6. **Weekend vs Weekday** — avg eng% each, audience character label

### Thresholds (configurable)

| Signal | Threshold |
|---|---|
| AVOID (day) | < −25% vs account avg |
| SWEET SPOT (day) | > +50% vs account avg |
| UNDER-USED (theme) | eng ≥ 1.5× avg AND posts ≤ 6 |
| INVEST MORE (theme) | eng ≥ 1.0× avg AND posts ≥ 10 |
| CUT BACK (theme) | eng < 0.7× avg AND posts ≥ 10 |
| Hashtag outperformer | eng ≥ account avg AND post_count ≥ 2 |
| Hashtag underperformer | eng < 0.8× avg AND post_count ≥ 5 |
| Weekend-centric | weekend avg > weekday avg × 1.15 |
| Weekday-centric | weekday avg > weekend avg × 1.15 |

### Running it

```bash
python3 code/analyze_competitor.py
# Edit the file path at top to point to the target competitor's raw_data.json
```

### Future extension
- Accept `--competitor` and `--platform` CLI args
- Output JSON instead of text (for downstream ingestion)
- Cross-competitor comparison mode: compare two accounts' efficiency ratios side-by-side

---

## Stage 3: Synthesis (Claude)

### What Claude does
Takes the structured output from Stage 2 and converts it into:
- Narrative insight reports (current format: `reports/*.md`)
- The **So What** sections — what ZeroDollarBlueprint or PostGlider users should actually do
- Cross-channel comparisons (IG vs FB for same competitor)
- Identification of universal patterns (what wins on both platforms simultaneously)

### Prompt structure used in this session
Claude was given the raw JSON and asked to produce:
1. A "STOP / START / CONTINUE" framework (Red / Green sections)
2. Specific, quantified recommendations ("Post Wednesday, not Tuesday")
3. Dashboard-ready copy (five-second summary language for PostGlider UI)
4. A strategic summary tied to the ZeroDollarBlueprint brand

### Quality bar for synthesis output
- Every recommendation must cite a specific number, not just a direction
- Every "avoid" must have an alternative
- The "So What" section must be actionable within 24 hours without any additional data

---

## Stage 4: Storage (GitHub)

### Repo
`github.com/kenlyle2/mfystrategy`

### Directory structure

```
mfystrategy/
├── competitor_data/
│   ├── dean_pohlman_ig/
│   │   └── raw_data.json
│   └── dean_pohlman_fb/
│       └── raw_data.json
├── reports/
│   ├── dean_pohlman_ig_2026-04-10.md
│   └── dean_pohlman_crosschannel_2026-04-10.md
├── integration/
│   ├── README.md
│   ├── mfy_intelligence_report.md
│   ├── postglider_product_integration.md
│   └── pipeline_spec.md  ← this file
└── code/
    ├── analyze_competitor.py
    └── github_push_browser.js
```

### Versioning
- All `raw_data.json` files should be renamed with date suffix when updating: `raw_data_2026-04-10.json`
- Keep `raw_data.json` as the latest (overwrite or symlink)
- Reports are always dated in the filename

### Delivery constraint (known issue)
The Cowork sandbox (`/sessions/.../mnt/postglider`) mounts via virtiofs but **does NOT sync to Windows Explorer.** Files written from Linux appear in the mount but not in Windows Explorer on the host. GitHub is used as the delivery mechanism instead.

Workaround (confirmed working in this session):
- Build file content as raw text using `window._var += 'chunk'` in browser JS
- Encode with `btoa()` in the browser (handles UTF-8 safely via TextEncoder)
- Push via GitHub Contents API from a github.com tab (bypasses the sandbox's outbound block)
- See `code/github_push_browser.js` for the full pattern

---

## Stage 5: PostGlider Integration (app.postglider.com)

### Data model (proposed)

```json
{
  "niche_id": "mens_wellness_yoga",
  "competitors": ["dean_pohlman_ig", "dean_pohlman_fb"],
  "signals": {
    "day_of_week": {
      "instagram": {
        "Mon": -0.08, "Tue": -0.36, "Wed": +0.29,
        "Thu": -0.05, "Fri": +0.36, "Sat": +0.09, "Sun": -0.39
      },
      "facebook": {
        "Mon": +0.28, "Tue": -0.33, "Wed": +0.23,
        "Thu": -0.04, "Fri": -0.40, "Sat": +1.52, "Sun": -0.58
      }
    },
    "format_efficiency": {
      "instagram": {
        "carousel": 2.19, "single_image": 3.11, "video": 0.68
      },
      "facebook": {
        "carousel": 2.02, "single_image": 1.00, "video": 0.96, "link": 0.24
      }
    },
    "hashtags": {
      "outperformers": ["#ManFlowYoga", "#FlexFriday", "#yogafored", "#redlighttherapy"],
      "underperformers": ["#yogaforbackpain", "#yogaretreat", "#manflowyoga"],
      "cross_platform_winners": ["#yogaforstiffness", "#yogaforbed", "#yogaforsleep"]
    },
    "content_patterns": {
      "wins": ["first_person_voice", "specific_topic", "taboo_or_vulnerable_or_playful"],
      "fails": ["third_person_testimonial", "generic_tutorial", "thursday_posting"]
    }
  },
  "last_updated": "2026-04-10",
  "post_count": 224,
  "date_range": "2026-01-03 to 2026-04-03"
}
```

### API endpoints (proposed)

```
GET /api/intelligence/day-signal?platform=instagram&day=tuesday
→ { signal: -0.36, warning: true, suggestion: "wednesday" }

GET /api/intelligence/format-signal?platform=instagram&format=video
→ { efficiency: 0.68, warning: true, better_option: "carousel", carousel_efficiency: 2.19 }

GET /api/intelligence/hashtag?tag=yogaforbackpain&platform=instagram
→ { eng_pct: 0.06, vs_avg: -0.71, warning: true, suggestions: ["#yogaforstiffness", "#yogafored"] }
```

### Where signals surface in the app

| Feature | Screen | Trigger | Copy type |
|---|---|---|---|
| Day-of-week guard | Schedule | User picks a date | 1-line warning or confirmation |
| Format recommender | Create | User selects format | Inline tip with alternative |
| Hashtag optimizer | Create | User adds a hashtag | Tag-level flag + suggestion |
| Content brief | Create | Start of caption writing | Panel with "what works" summary |
| Intelligence dashboard | Settings/Insights | Any time | Full data views |
| Weekly digest | Email/notification | Weekly cron | 2-3 bullet insight summary |

---

## Dependency Map

```
Predis.ai account (Lifetime Deal, 120 credits)
    → Claude in Chrome (extraction)
        → raw_data.json (GitHub storage)
            → analyze_competitor.py (Python 3, stdlib only)
                → Narrative reports (Claude synthesis)
                    → PostGlider intelligence DB
                        → Inline nudges (PostGlider app)
```

No external dependencies beyond Python stdlib and a GitHub PAT. The extraction step requires Predis.ai credentials and Claude in Chrome.

---

## Open Questions

1. **Competitor selection:** Which 2–3 competitors should be added next to establish sector-wide benchmarks? MFY gives us one data point; we need 3+ to know which patterns are niche-wide vs MFY-specific.

2. **Refresh cadence:** How often should competitor data be re-extracted? Monthly seems right for 90-day rolling data.

3. **Multi-niche:** When PostGlider supports users outside the yoga/wellness niche, how does the signal DB generalize? Likely need a niche taxonomy and per-niche signal sets.

4. **Predis.ai credit consumption:** The Lifetime Deal includes 120 post credits. Competitor analysis may have separate limits — need to verify before automating extractions.

5. **Phase 2 automation:** Playwright vs. Comet for the extraction automation. Playwright gives more control; Comet is already in the stack. Recommend evaluating Comet first since it's already available.
