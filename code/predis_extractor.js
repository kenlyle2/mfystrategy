/**
 * predis_extractor.js
 * Playwright script to extract competitor analysis data from Predis.ai
 * and write structured raw_data.json for use with analyze_competitor.py
 *
 * Usage:
 *   node predis_extractor.js --competitor "Dean Pohlman" --platform instagram --output ./competitor_data/dean_pohlman_ig/raw_data.json
 *
 * Prerequisites:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Auth:
 *   Set PREDIS_EMAIL and PREDIS_PASSWORD env vars, OR pass --cookies path/to/cookies.json
 *   (cookies.json can be exported from a logged-in session via browser devtools)
 *
 * Observed from manual Claude in Chrome extraction session (April 10, 2026):
 *   - Target URL: https://app.predis.ai/app/competitor
 *   - 4 tabs: Content Analysis, Content Themes, Hashtag Analysis, Post Performance
 *   - Tab 4 (Post Performance) paginated: 30 posts/page, "next page" button pattern
 *   - Scroll target area: center of page ~[711, 400] in 1280px viewport
 *   - Page load wait: 3s initial, 2s between tab clicks, 2s after pagination
 *   - 111 IG posts / 113 FB posts extracted across 4 pages each
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// --- CLI args ---
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const COMPETITOR_NAME = getArg('--competitor') || 'Dean Pohlman';
const PLATFORM       = getArg('--platform') || 'instagram';   // 'instagram' | 'facebook'
const OUTPUT_PATH    = getArg('--output') || './raw_data.json';
const COOKIES_PATH   = getArg('--cookies') || null;

const PREDIS_URL = 'https://app.predis.ai/app/competitor';
const POSTS_PER_PAGE = 30;

// --- Helpers ---
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function parseEngPct(str) {
  // Predis.ai shows engagement as "0.51%" — strip % and parse
  if (!str) return null;
  return parseFloat(str.replace('%', '').trim()) || null;
}

function parseCount(str) {
  // Handles "1,234" or "1.2K" or plain "234"
  if (!str) return null;
  str = str.trim().replace(/,/g, '');
  if (str.toLowerCase().endsWith('k')) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || null;
}

function parseDate(str) {
  // Predis.ai shows dates like "Jan 3, 2026" or "2026-01-03" — normalize to ISO
  if (!str) return null;
  try { return new Date(str).toISOString().split('T')[0]; } catch { return str.trim(); }
}

// --- Main ---
async function main() {
  const browser = await chromium.launch({ headless: false }); // set true for production
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  // Load saved cookies if provided (preferred — avoids re-login every run)
  if (COOKIES_PATH && fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8'));
    await context.addCookies(cookies);
    console.log('Loaded cookies from', COOKIES_PATH);
  }

  const page = await context.newPage();

  // --- Step 1: Navigate to Predis.ai competitor page ---
  console.log('Navigating to Predis.ai...');
  await page.goto(PREDIS_URL, { waitUntil: 'networkidle' });
  await wait(3000);

  // If redirected to login, handle credentials
  if (page.url().includes('login') || page.url().includes('signin')) {
    console.log('Login required...');
    await page.fill('input[type="email"]', process.env.PREDIS_EMAIL || '');
    await page.fill('input[type="password"]', process.env.PREDIS_PASSWORD || '');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await wait(3000);

    // Save cookies for next run
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_PATH || './predis_cookies.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies saved for future runs');
  }

  // --- Step 2: Select competitor and platform ---
  // TODO: Predis.ai has a competitor selector dropdown at the top of the page.
  // The selector label/placeholder observed was something like "Select competitor"
  // You may need to click it and type/select the competitor name.
  // If you've already set up the competitor in Predis.ai, it should be in the dropdown.
  //
  // Example (adjust selectors based on actual DOM):
  //   await page.click('[data-testid="competitor-selector"]');
  //   await page.click(`text="${COMPETITOR_NAME}"`);
  //   await wait(2000);
  //
  // Platform toggle (Instagram / Facebook) observed as a button row at top:
  //   await page.click(`button:has-text("${PLATFORM === 'instagram' ? 'Instagram' : 'Facebook'}")`);
  //   await wait(2000);

  console.log(`TODO: Select competitor "${COMPETITOR_NAME}" and platform "${PLATFORM}"`);
  console.log('Waiting for manual selection (30s)... automate this once selectors confirmed');
  await wait(30000); // Remove once selectors above are confirmed

  // --- Step 3: Extract Tab 1 — Summary stats ---
  console.log('Extracting Tab 1: Summary...');
  const summaryText = await page.textContent('body');
  const summary = parseSummaryFromText(summaryText, PLATFORM);

  // --- Step 4: Navigate to Tab 2 — Content Themes ---
  console.log('Navigating to Tab 2: Content Themes...');
  // In manual session: found tab by text "Content Themes" or "2. Content Themes"
  await page.click('text=Content Themes');
  await wait(2000);

  const themesText = await page.textContent('body');
  const themes = parseThemesFromText(themesText);
  console.log(`  Extracted ${themes.length} content themes`);

  // --- Step 5: Navigate to Tab 3 — Hashtag Analysis ---
  console.log('Navigating to Tab 3: Hashtag Analysis...');
  await page.click('text=Hashtag Analysis');
  await wait(2000);

  const hashtagText = await page.textContent('body');
  const hashtags = parseHashtagsFromText(hashtagText);
  console.log(`  Extracted ${hashtags.length} hashtags`);

  // --- Step 6: Navigate to Tab 4 — Post Performance (paginated) ---
  console.log('Navigating to Tab 4: Post Performance...');
  await page.click('text=Post Performance');
  await wait(3000);

  const allPosts = [];
  let pageNum = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`  Extracting posts page ${pageNum}...`);

    // Scroll down to ensure all rows are rendered
    await page.mouse.wheel(0, 400);
    await wait(500);
    await page.mouse.wheel(0, 400);
    await wait(500);

    const pageText = await page.textContent('body');
    const pagePosts = parsePostsFromText(pageText, allPosts.length);
    allPosts.push(...pagePosts);
    console.log(`    Got ${pagePosts.length} posts (total: ${allPosts.length})`);

    // Check for next page button
    // In manual session: found via text "next page" / "Go to next page"
    // Pagination showed "1-30 of 111" style counter
    const nextBtn = await page.$('button[aria-label*="next" i], button:has-text("Next"), [data-testid="pagination-next"]');
    if (nextBtn) {
      const isDisabled = await nextBtn.getAttribute('disabled');
      if (isDisabled !== null) {
        hasNextPage = false;
        console.log('  Last page reached (next button disabled)');
      } else {
        await nextBtn.click();
        await wait(2000);
        pageNum++;
      }
    } else {
      hasNextPage = false;
      console.log('  No next page button found — assuming last page');
    }
  }

  console.log(`Total posts extracted: ${allPosts.length}`);

  // --- Step 7: Assemble raw_data.json ---
  const rawData = {
    competitor: COMPETITOR_NAME,
    platform: PLATFORM.charAt(0).toUpperCase() + PLATFORM.slice(1),
    brand_context: summary.brand_context || '',
    date_range: summary.date_range || '',
    extracted: new Date().toISOString().split('T')[0],
    summary: {
      followers: summary.followers,
      total_posts: allPosts.length,
      average_likes: summary.avg_likes,
      avg_engagement_pct: summary.avg_engagement_pct,
      average_engagement: summary.avg_engagement,
      average_comments: summary.avg_comments
    },
    post_distribution: buildPostDistribution(allPosts),
    content_themes: themes,
    hashtags: { top_hashtags: hashtags },
    best_performing_posts: allPosts.slice().sort((a, b) => b.eng_pct - a.eng_pct).slice(0, 5),
    all_posts: allPosts
  };

  // --- Step 8: Write output ---
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rawData, null, 2));
  console.log(`\nWrote ${allPosts.length} posts to ${OUTPUT_PATH}`);

  await browser.close();
}

// --- Parse helpers ---

function parseSummaryFromText(text, platform) {
  const followers = parseCount((text.match(/(\d[\d,\.]+[kK]?)\s*Followers/i) || [])[1]);
  const avg_engagement_pct = parseEngPct((text.match(/([\d\.]+%)\s*(?:Avg\s+)?Engagement/i) || [])[1]);
  const avg_likes = parseCount((text.match(/([\d,]+)\s*(?:Avg\s+)?Likes/i) || [])[1]);
  const avg_comments = parseCount((text.match(/([\d,]+)\s*(?:Avg\s+)?Comments/i) || [])[1]);
  return { followers, avg_engagement_pct, avg_likes, avg_comments, avg_engagement: null, brand_context: '', date_range: '' };
}

function parseThemesFromText(text) {
  return []; // stub — implement based on actual page text structure
}

function parseHashtagsFromText(text) {
  return []; // stub
}

function parsePostsFromText(text, offset) {
  // Recommended: use page.$$eval() on table cells instead of text parsing.
  // See comments in main() above for the $$eval pattern.
  return []; // stub
}

function buildPostDistribution(posts) {
  return {};
}

main().catch(err => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
