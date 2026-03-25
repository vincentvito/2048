# 30-Day SEO Plan for The 2048 League

> Target domain: `the2048league.com`
> Start date: 2026-03-25
> IMPORTANT: Do not use em dashes anywhere in content, titles, descriptions, or meta tags. Use commas, periods, or rewrite the sentence instead.

---

## Keyword Research Summary

### Primary Keywords (high volume)

| Keyword | Monthly Volume | Competition | Priority |
|---------|---------------|-------------|----------|
| 2048 | ~933K | Very High | Awareness |
| 2048 game | ~18.5K | High | Homepage |
| 2048 online | ~4.9K | Medium | Homepage |
| play 2048 | ~3K+ | Medium | Homepage |

### Long-Tail Keywords (lower competition, high intent)

| Keyword | Estimated Volume | Competition | Priority |
|---------|-----------------|-------------|----------|
| 2048 multiplayer | ~1K | Low | High |
| 2048 multiplayer online | ~500 | Very Low | High |
| play 2048 with friends | ~300 | Very Low | High |
| 2048 strategy | ~2K | Medium | High |
| 2048 tips and tricks | ~1.5K | Medium | High |
| how to win 2048 | ~2K | Medium | High |
| 2048 corner method | ~500 | Low | Medium |
| 2048 ELO rating | ~100 | Very Low | Medium |
| 2048 competitive ranked | ~100 | Very Low | High |
| 2048 leaderboard | ~300 | Low | Medium |
| 2048 high score tips | ~500 | Low | Medium |
| 2048 game online free | ~1K | Medium | Medium |

### Unique Differentiators (almost zero competition)

- "2048 ranked multiplayer"
- "2048 ELO system"
- "competitive 2048 league"
- "2048 real-time multiplayer"
- "play 2048 ranked online"

These are the strongest SEO angles because no other 2048 site offers real-time ELO-ranked multiplayer.

---

## Week 1 (Days 1-7): Technical Foundation

### Day 1-2: Google Search Console and Indexing

**What to do:**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add and verify `the2048league.com` as a property
3. Submit the sitemap at `https://www.the2048league.com/sitemap.xml`
4. Request indexing of the homepage
5. Request indexing of `/how-to-play`, `/strategy`, `/blog`, and all three blog articles

**Why:** The site currently has zero pages indexed. Nothing else matters until Google knows the site exists.

### Day 2-3: Make the Landing Page Crawlable

**What to do:**
1. Refactor the `HowToPlay` component (`src/components/HowToPlay.tsx`) to use native HTML `<details>`/`<summary>` instead of React `useState`. Remove the `"use client"` directive and the `useEffect` for mobile detection (use CSS media queries instead). This makes the instructional text visible to crawlers.
2. Add a server-rendered content section below the game on the homepage. This section should include:
   - A short paragraph (2-3 sentences) describing what The 2048 League is. Target keywords: "play 2048 online", "2048 multiplayer", "2048 leaderboard".
   - Links to `/how-to-play`, `/strategy`, and `/blog`.
   - This must be rendered server-side. If `page.tsx` is `"use client"`, create a separate server component and import it, or add the content to `layout.tsx` conditionally.
3. Add JSON-LD structured data (Game schema) to the homepage `<head>`. Use Next.js metadata API or a `<script type="application/ld+json">` tag in the layout. Include: name, description, url, genre, numberOfPlayers, applicationCategory.

**Technical notes:**
- The current `page.tsx` is entirely `"use client"`, so any text inside it is invisible to crawlers that do not execute JavaScript.
- The footer (in `layout.tsx`) is already server-rendered and crawlable.
- Blog pages and content pages (`/how-to-play`, `/strategy`, `/blog/*`) are already server-rendered.

### Day 4-5: Meta Tags Audit

**What to do:**
1. Review all page metadata for keyword inclusion. Each page should have a unique `<title>` and `<meta name="description">` that includes the primary target keyword for that page.
2. Verify Open Graph and Twitter Card tags are set on every page (they are currently set on the layout level but should be overridden per page for better social sharing).
3. Ensure all blog article pages have `article` Open Graph type instead of `website`.

**Current pages and their target keywords:**

| Page | Target Keywords | Status |
|------|----------------|--------|
| `/` (homepage) | play 2048 online, 2048 game, 2048 multiplayer | Needs server-rendered content |
| `/how-to-play` | how to play 2048, 2048 rules, 2048 tutorial | Done |
| `/strategy` | 2048 strategy, 2048 tips, how to win 2048 | Done |
| `/blog` | 2048 blog, 2048 tips | Done |
| `/blog/how-to-win-2048-complete-strategy-guide` | how to win 2048, 2048 strategy guide | Done |
| `/blog/what-is-elo-rating-2048` | 2048 ELO rating, 2048 ranking system | Done |
| `/blog/multiplayer-2048-tips-for-beginners` | 2048 multiplayer, 2048 online tips | Done |

### Day 6-7: Performance and Core Web Vitals

**What to do:**
1. Run a Lighthouse audit on every page. Target scores: Performance > 90, Accessibility > 95, SEO > 95.
2. Ensure all images have `width`, `height`, and `alt` attributes.
3. Check that fonts use `display: swap` (already configured in `layout.tsx`).
4. Verify that the service worker does not cache HTML pages aggressively (check `sw.js` or service worker config).
5. Test mobile usability in Chrome DevTools at 375px width.

---

## Week 2 (Days 8-14): Content Expansion

### Day 8-9: Publish Two New Blog Articles

**Article 1: "How to Play 2048 with Friends Online"**
- Target keywords: "play 2048 with friends", "2048 multiplayer online", "2048 friend invite"
- Content: Step-by-step guide on using the friendly match feature. Explain how to create a room, share the invite link, and play. Include screenshots or diagrams if possible.
- Length: 800-1200 words
- Internal links: Link to `/how-to-play` for rules, `/strategy` for tips, `/blog/what-is-elo-rating-2048` to explain that friendly matches do not affect ELO.

**Article 2: "2048 Game Modes Explained: Single Player, Ranked, and Friendly"**
- Target keywords: "2048 game modes", "2048 ranked mode", "2048 single player vs multiplayer"
- Content: Compare single-player, ranked multiplayer, and friendly multiplayer. Explain what each mode offers, when to use each, and how scoring/ranking differs.
- Length: 800-1200 words
- Internal links: Link to strategy guide, ELO article, and how-to-play page.

**Instructions for writing:**
- Do not use em dashes. Use commas, periods, or restructure the sentence.
- Write in a direct, informative tone. Short paragraphs (2-4 sentences max).
- Use `<h2>` for main sections, `<h3>` for subsections.
- Every article needs: metadata with title/description/keywords/openGraph, a "Back to Blog" link, and a CTA section at the bottom linking to the game.
- Add the new articles to the `posts` array in `/blog/page.tsx` and to `sitemap.ts`.

### Day 10-11: Publish Two More Blog Articles

**Article 3: "2048 Board Sizes: 4x4 vs 8x8 Grid Comparison"**
- Target keywords: "2048 8x8", "2048 board size", "2048 big board"
- Content: Compare the standard 4x4 grid with the 8x8 mode. How strategy changes, scoring differences, difficulty comparison.
- Length: 600-1000 words

**Article 4: "Top 10 Mistakes Beginners Make in 2048"**
- Target keywords: "2048 mistakes", "2048 beginner tips", "why I lose at 2048"
- Content: Common errors (random swiping, abandoning corner, ignoring edge row, etc.) with explanations of why they hurt and what to do instead.
- Length: 800-1200 words

### Day 12-14: Add a Public Leaderboard Page

**What to do:**
1. Create a server-rendered `/leaderboard` page that fetches and displays the top 20 scores.
2. This page should include:
   - Title: "2048 Leaderboard - Top Scores"
   - Target keywords: "2048 leaderboard", "2048 high scores", "2048 top players"
   - A table showing rank, username, score, and date
   - Tabs for "Today" and "All Time" (can be client-side tabs, but the default tab content must be server-rendered)
   - A CTA to play the game
3. Add to navigation footer and sitemap.
4. Add JSON-LD structured data if applicable.

**Why:** A public leaderboard page is highly linkable content. Players share their rankings, and "2048 leaderboard" is a keyword with real search volume.

---

## Week 3 (Days 15-21): Link Building and Social

### Day 15-16: Internal Linking Audit

**What to do:**
1. Review every page and ensure it links to at least 2 other pages on the site.
2. Add contextual links within blog article body text (not just CTAs at the bottom).
3. Ensure the `/leaderboard` page links to strategy content ("Want to improve your rank? Read our strategy guide").
4. Ensure `/how-to-play` links to `/strategy` and vice versa.
5. Add "Related Articles" links at the bottom of each blog post linking to 1-2 other relevant articles.

### Day 17-18: Social Media Presence

**What to do:**
1. Create or update social media profiles for The 2048 League on Twitter/X and at least one other platform.
2. Share each blog article with a short description and link.
3. Share the multiplayer feature specifically, since "play 2048 with friends" is a unique selling point.
4. Add social media links to the site footer.

### Day 19-21: External Outreach

**What to do:**
1. Submit The 2048 League to browser game directories and aggregators (e.g., CrazyGames, itch.io, etc.).
2. Post in relevant Reddit communities (r/2048, r/webgames, r/puzzles) with genuine value-add content, not just self-promotion. Share strategy tips and mention the site.
3. Look for "best 2048 games" or "2048 alternatives" listicle articles and reach out to authors about including The 2048 League, highlighting the unique multiplayer and ELO features.
4. If you have a Product Hunt account, consider a launch for the multiplayer feature.

---

## Week 4 (Days 22-30): Optimization and Monitoring

### Day 22-23: Publish Two More Blog Articles

**Article 5: "The History of 2048: From Side Project to Global Phenomenon"**
- Target keywords: "2048 history", "who made 2048", "2048 origin"
- Content: Brief history of the original game by Gabriele Cirulli, how it went viral, and how The 2048 League builds on that legacy with multiplayer.
- Length: 600-1000 words

**Article 6: "How to Reach the 4096 Tile (and Beyond)"**
- Target keywords: "2048 4096 tile", "2048 high tile", "beyond 2048"
- Content: Advanced strategies for pushing past 2048. How the game changes at higher tile values, what to prioritize, and common pitfalls.
- Length: 800-1200 words

### Day 24-25: Analyze Search Console Data

**What to do:**
1. Log into Google Search Console and review:
   - Which pages are indexed
   - Which queries are generating impressions
   - Click-through rates per page
   - Any crawl errors or indexing issues
2. Identify pages with high impressions but low clicks. Improve their title tags and meta descriptions to increase CTR.
3. Identify queries where the site ranks on page 2 (positions 11-20). These are "striking distance" keywords. Create or improve content targeting those queries.

### Day 26-27: Content Refresh

**What to do:**
1. Update existing blog articles with any new information or improved sections.
2. Add internal links to any new pages created since the articles were published.
3. Update the `lastModified` date in `sitemap.ts` for any updated pages.
4. If any blog articles are underperforming, consider:
   - Expanding them with more detail
   - Adding a FAQ section at the bottom (targets featured snippet queries)
   - Improving the intro paragraph to better match search intent

### Day 28-30: Review and Plan Next Month

**What to do:**
1. Compile a report of:
   - Total indexed pages (target: all pages indexed)
   - Total impressions and clicks from Search Console
   - Top 10 queries driving traffic
   - Backlinks acquired (use Search Console or a free tool like Ahrefs Webmaster Tools)
2. Identify what worked and what did not.
3. Plan the next month's content calendar based on:
   - Keywords with growing impressions but low clicks (optimize meta)
   - Keywords with zero coverage (create new content)
   - Content gaps identified by reviewing competitor sites (play2048.co, 2048game.com, play2048.pro)

---

## Content Calendar Summary

| Day | Task |
|-----|------|
| 1-2 | Google Search Console setup, sitemap submission |
| 2-3 | Make homepage crawlable, add structured data |
| 4-5 | Meta tags audit across all pages |
| 6-7 | Lighthouse audit, Core Web Vitals fixes |
| 8-9 | Publish: "Play 2048 with Friends" + "Game Modes Explained" |
| 10-11 | Publish: "4x4 vs 8x8 Grid" + "Top 10 Beginner Mistakes" |
| 12-14 | Build public /leaderboard page |
| 15-16 | Internal linking audit |
| 17-18 | Social media setup and sharing |
| 19-21 | External outreach (directories, Reddit, listicles) |
| 22-23 | Publish: "History of 2048" + "Reaching 4096 Tile" |
| 24-25 | Search Console analysis, striking distance keywords |
| 26-27 | Content refresh, add FAQs, update sitemap dates |
| 28-30 | Monthly review, plan next month |

---

## Blog Article Specifications (for all new articles)

Every blog article must follow these rules:

1. **File location:** `src/app/blog/[slug]/page.tsx`
2. **Server-rendered:** No `"use client"` directive. The page must be a server component.
3. **Metadata:** Export a `metadata` object with `title`, `description`, `keywords`, and `openGraph` (including `url` and `title`).
4. **Structure:**
   - "Back to Blog" link at the top
   - `<article>` wrapper with class `blog-article`
   - Header with tag, title, and date
   - Intro paragraph with class `content-intro`
   - Sections with `content-section` class, `<h2>` headings with `content-heading` class
   - CTA section at the bottom with links to the game and related content
5. **Internal links:** Every article must link to at least 2 other pages on the site using `<Link>` from `next/link` with class `content-inline-link`.
6. **Blog index:** Add the new article to the `posts` array in `src/app/blog/page.tsx`.
7. **Sitemap:** Add the new slug to the `blogSlugs` array in `src/app/sitemap.ts`.
8. **No em dashes.** Use commas, periods, semicolons, or restructure sentences instead.
9. **Tone:** Direct, informative, conversational. Short paragraphs (2-4 sentences). No filler or fluff.
10. **Length:** 600-1200 words depending on topic depth.
