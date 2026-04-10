# PostGlider Product Integration — Competitor Intelligence Layer
**Based on:** Man Flow Yoga / Dean Pohlman analysis (IG + FB, Apr 2026)  
**Document type:** Feature spec + UX copy + build priority

---

## The Gap This Fills

Predis.ai shows competitor data across four tabs (Content Analysis, Content Themes, Hashtag Analysis, Post Performance). It shows what happened — post counts, engagement numbers, hashtag lists. It does not tell you what to do.

PostGlider's intelligence layer converts the raw signal into a decision at the moment the user is making content choices: when to post, what format to use, which hashtags to add, what angle to take. The insights don't live in a report tab — they surface inline, in the Generate and Schedule screens, as contextual nudges.

---

## Feature 1: Smart Scheduling — Competitor Day-of-Week Guard

### What it does
When a user schedules a post, PostGlider shows a day-of-week signal derived from competitor data for that platform.

### The signal (from MFY data, IG)
- Wednesday: +29% vs niche avg → green light
- Friday: +36% vs niche avg → green light
- Saturday: +9% → acceptable
- Tuesday: −36% → warn
- Sunday: −39% → warn

### UX copy examples (PostGlider Generate/Schedule screen)

**Scheduling IG post on Tuesday:**
> "Tuesday gets 36% less engagement than average in this niche. Wednesday or Friday will perform significantly better — want to reschedule?"

**Scheduling FB post on Friday:**
> "Friday is typically strong on Instagram but it's the weakest Facebook day in your niche (−40% vs average). Saturday would get you 152% more engagement. Move it?"

**Scheduling IG post on Wednesday:**
> "Wednesday is one of the strongest days in this niche. Good choice. 👍"

### Build notes
- Day-of-week signal is per-platform (IG and FB behave oppositely — Friday is IG's best and FB's worst)
- Store day-of-week engagement index per competitor × platform in the intelligence DB
- Surface as a 1-line nudge above the schedule button, dismissible but logged
- Threshold for warning: >25% below niche avg. Threshold for positive: >20% above.

### Priority: P0 — Highest impact, simplest to build

---

## Feature 2: Format Recommender

### What it does
When a user selects a post format (video, carousel, single image), PostGlider shows how that format performs in the niche relative to alternatives.

### The signal (from MFY data)

| Format | IG Efficiency | FB Efficiency |
|---|---|---|
| Carousel / Album | 2.19× avg | 2.02× avg |
| Single Image | 3.11× avg | 1.00× avg |
| Video | 0.68× avg | 0.96× avg |
| Link (FB only) | n/a | 0.24× avg |

### UX copy examples

**User selects Video on IG:**
> "In this niche, videos get 32% less engagement per post than average. Carousels get 2.2× more. Want to switch formats?"

**User selects Video on FB:**
> "Video performs about the same as single images on Facebook in this niche. Albums/carousels are the only format that outperforms (2×). Worth adding slides?"

**User selects Carousel on IG:**
> "Great choice — carousels get 2.2× the engagement per post vs. video in this niche. Carousels are the best-performing format here."

**User selects Link post on FB:**
> "Facebook suppresses link posts algorithmically. In this niche they get 76% less engagement than video. Consider a native video or image with the link in comments."

### Build notes
- Format efficiency index: calculated as (format's avg eng) / (account-level avg eng), stored per platform
- Surface at format selection step in the content creation flow
- Show the specific multiplier, not just "good" or "bad" — users trust numbers over labels
- Do not block — inform and offer a quick switch

### Priority: P0 — Directly counters the biggest mistake (80% video in an anti-video niche)

---

## Feature 3: Hashtag Optimizer

### What it does
When a user adds hashtags to a post, PostGlider cross-references each tag against the competitor hashtag performance database and flags underperformers, suggests replacements.

### The signal (IG underperformers with 5+ posts in niche)

| Tag | Eng% | vs Avg | Action |
|---|---|---|---|
| #yogaforbackpain | 0.06% | −71% | Replace |
| #yogaretreat | 0.07% | −67% | Replace |
| #yogaworkshop | 0.07% | −67% | Replace |
| #bettermanpodcast | 0.11% | −48% | Replace |
| #manflowyoga | 0.15% | −29% | Reconsider |
| #yogaformen | 0.17% | −19% | Reconsider |

### The signal (IG outperformers, use more)

| Tag | Eng% | vs Avg | Action |
|---|---|---|---|
| #ManFlowYoga | 0.46% | +119% | Suggest |
| #FlexFriday | 0.44% | +110% | Suggest |
| #yogafored | 0.37% | +76% | Suggest |
| #redlighttherapy | 0.37% | +76% | Suggest |
| #yogaforstiffness | 0.32% | +52% | Suggest |
| #yogaforsex | 0.33% | +57% | Suggest |
| #weightlifting | 0.33% | +57% | Suggest |
| #yogaforsleep | 0.30% | +43% | Suggest |

### Cross-platform tags (work on both IG and FB)
`#yogaforstiffness`, `#yogaforbed`, `#yogaforsleep`, `#yogafored`, `#erectiledysfuntion`

### UX copy examples

**User adds #yogaforbackpain:**
> "This tag underperforms in your niche by 71%. Competitors using it get 0.06% engagement vs. the 0.21% average. Try #yogaforstiffness (0.32%) or #yogafored (0.37%) instead."

**User adds #manflowyoga:**
> "Your main competitor's branded tag — it actually underperforms his own average by 29%. This hashtag pool is probably saturated with his content."

### Build notes
- Hashtag DB: tag → platform → (eng_pct, post_count, last_updated)
- Flag if eng_pct < 0.8 × account_avg AND post_count ≥ 5 (data-backed, not anecdotal)
- Suggest replacement from same semantic cluster (pain → stiffness; general yoga → specific outcome)
- Cross-platform tags deserve a "works on both" badge
- The outcome-specific + slightly taboo pattern should inform future tag suggestions even for tags not yet in DB

### Priority: P1 — High impact, requires hashtag DB build

---

## Feature 4: Content Brief Intelligence

### What it does
Before writing a caption, PostGlider surfaces the content DNA of what works (and what fails) in the niche, derived from top/bottom post analysis.

### The winning pattern (from MFY top 10 posts)

Every post in the top 10 shares at least two of:
1. **First-person voice** — "I did X" or "I'm feeling X," not "Our members say..."
2. **Specific topic** — Not "yoga tips," but "yoga for erectile dysfunction" or "AI caricature of me"
3. **One of these emotional registers:** Taboo/health-sensitive | Playful/unexpected | Personal vulnerability | Real-time moment

### The failure pattern (from MFY bottom 10 posts)

Every post in the bottom 10 shares:
1. **Third-person testimonial** — "Paul says..." / "Jason had shoulder surgery..."
2. **Posted on Thursday** (7 of 10 bottom posts were Thursday)
3. **Generic health advice** framed without personal stake

### UX copy examples

**In the caption writing screen, contextual tip:**
> "Top posts in this niche use first-person voice on a specific, slightly unexpected topic. 'I tried yoga for erectile dysfunction' outperforms 'Here's a workout for back pain' by 5×."

**When content brief includes a testimonial:**
> "Third-person testimonials are the lowest-performing post type in this niche (0.01–0.04% avg engagement). Try opening with a strong first-person line, then bringing in the member's story."

**When writing a generic tutorial:**
> "Generic tutorials ('5 yoga poses for back pain') get 0.11% engagement in this niche — 48% below average. Anchoring the same content with a specific hook ('I fixed my back in 30 days') typically performs 3–5× better."

### Priority: P1 — Highest differentiation value, requires synthesis of post-level data

---

## Feature 5: Competitor Intelligence Dashboard

### What it does
A dedicated section (likely under Settings or Insights) where users can see the full competitive picture for their niche: format efficiency, day-of-week heatmap, theme ROI table, hashtag performance matrix.

### Views

**Format Efficiency View**
Bar chart: format × platform × efficiency ratio. Shows the carousel/video gap visually.

**Day-of-Week Heatmap**
7 × 2 grid (days × platforms). Color-coded green/yellow/red. Separate view per platform because they diverge.

**Theme ROI Table**
Content themes sorted by engagement %. INVEST MORE / CUT BACK / UNDER-USED labels from the analysis script.

**Hashtag Matrix**
Searchable. Tag → IG performance → FB performance → recommendation. Filter by "cross-platform winners."

### Data source
The JSON files in `competitor_data/` feed directly into these views. The analysis script produces the efficiency ratios; the dashboard visualizes them.

### Priority: P2 — Nice to have in V1, required for V2

---

## Feature 6: Automated Insight Digest (Weekly)

### What it does
A weekly summary delivered to the user (email or in-app notification) that surfaces one or two actionable intelligence findings from the past week's competitor data update.

### Example digest

**Week of April 14, 2026**
> **Your niche is shifting toward carousel format.** In the past 30 days, carousel posts in the men's wellness / yoga niche are outperforming video by 2.2× on Instagram. You have 0 carousels scheduled for next week and 4 videos.
>
> **Saturday is underutilized on Facebook.** Competitors' Saturday posts get 152% more engagement than their weekday average — but only 10% of their content lands on Saturdays. You have no Facebook content scheduled for this Saturday.

### Priority: P2 — Retention feature, builds over time

---

## Implementation Sequence

### Phase 1 (now → 4 weeks): Data layer
- Standardize `raw_data.json` schema (already done for MFY)
- Add 2–3 more competitors to establish sector benchmarks (not just one account's quirks)
- Store day-of-week, format efficiency, hashtag performance in a queryable structure

### Phase 2 (4–8 weeks): Inline nudges
- Build day-of-week guard (Feature 1) into Schedule screen
- Build format recommender (Feature 2) into Create screen
- Both use static competitor data; no real-time scraping needed

### Phase 3 (8–16 weeks): Hashtag optimizer + Content brief
- Build hashtag DB and optimizer (Feature 3)
- Add content brief intelligence panel (Feature 4)
- Automate Predis.ai extraction (Playwright/Comet) so data refreshes monthly

### Phase 4 (16+ weeks): Dashboard + digest
- Build full competitor intelligence dashboard (Feature 5)
- Build weekly digest (Feature 6)
- Consider building a public "niche benchmark" report as a lead magnet

---

## The ZeroDollarBlueprint Angle

PostGlider's primary use case (for the first competitor set) is ZeroDollarBlueprint — a longevity / men's wellness brand positioning against the expensive biohacking market. The MFY competitor data is directly applicable:

- MFY's audience responds best to personal vulnerability, taboo health topics, and unexpected personal moments → ZeroDollarBlueprint's "I found the cheap path" is exactly this DNA
- MFY's worst content is generic yoga tutorials and back-pain basics → ZeroDollarBlueprint should not compete on tutorial volume; compete on point of view
- The hashtag gap is real: #yogaforstiffness, #yogaforsex, #yogaforsleep all dramatically outperform #yogaforbackpain in the same niche — and ZeroDollarBlueprint can own these before the algorithm saturates them

**The PostGlider advantage:** ZeroDollarBlueprint will know what's working before Dean Pohlman knows what's hurting him.
