# 30-Day SEO Plan for The 2048 League

> Target domain: `the2048league.com`
> Start date: 2026-03-25
>
> **For agents:** Read this file at the start of each session. Find the first unchecked `[ ]` task.
> Execute it following the instructions. When done, change `[ ]` to `[x]` and update
> `CHANGELOG.md`. Then move to the next unchecked task. Do not skip ahead.
>
> **RULES (apply to ALL tasks):**
> - Do not use em dashes anywhere (content, metadata, comments). Use commas, periods, or rewrite.
> - Run `npx tsc --noEmit` after every code change to verify no type errors.
> - Update `CHANGELOG.md` after completing each task.
> - Do not repeat tasks that are already checked `[x]`.

---

## Keyword Reference

Use these keywords when writing content, metadata, and titles.

| Keyword | Volume | Competition | Notes |
|---------|--------|-------------|-------|
| 2048 | ~933K | Very High | Brand awareness only |
| 2048 game | ~18.5K | High | Homepage |
| 2048 online | ~4.9K | Medium | Homepage |
| play 2048 | ~3K+ | Medium | Homepage, CTAs |
| 2048 multiplayer | ~1K | Low | Key differentiator |
| 2048 multiplayer online | ~500 | Very Low | Key differentiator |
| play 2048 with friends | ~300 | Very Low | Key differentiator |
| 2048 strategy | ~2K | Medium | Strategy page, blog |
| 2048 tips and tricks | ~1.5K | Medium | Blog content |
| how to win 2048 | ~2K | Medium | Blog content |
| 2048 corner method | ~500 | Low | Strategy page |
| 2048 ELO rating | ~100 | Very Low | Unique to us |
| 2048 competitive ranked | ~100 | Very Low | Unique to us |
| 2048 leaderboard | ~300 | Low | Leaderboard page |
| 2048 high score tips | ~500 | Low | Blog content |
| 2048 game online free | ~1K | Medium | Homepage |
| 2048 8x8 | ~200 | Very Low | Blog content |
| 2048 history | ~500 | Low | Blog content |
| 2048 4096 tile | ~300 | Low | Blog content |

---

## Daily Checklist

### Week 1: Foundation

- [x] **Day 1 (2026-03-25): Initial SEO setup**
  - Created `sitemap.ts` and `robots.ts`
  - Created `/how-to-play` page (server-rendered, with metadata and keywords)
  - Created `/strategy` page (server-rendered, with metadata and keywords)
  - Created `/blog` listing page with 3 articles:
    - `/blog/how-to-win-2048-complete-strategy-guide`
    - `/blog/what-is-elo-rating-2048`
    - `/blog/multiplayer-2048-tips-for-beginners`
  - Added site footer with SEO "about" blurb and links (server-rendered in `layout.tsx`)
  - Added JSON-LD structured data (WebApplication schema) in `<head>`
  - Refactored `HowToPlay` to server-rendered `<details>`/`<summary>` (crawlable)
  - Added content page and blog CSS styles to `globals.css`

- [ ] **Day 2: Meta tags audit**
  Read this file, then follow these instructions:
  1. Read every file under `src/app/` that exports `metadata`. List them all.
  2. For each page, verify:
     - `title` includes the primary target keyword (see table below).
     - `description` is 120-160 characters, includes the primary keyword, and has a call to action.
     - `keywords` array includes 4-8 relevant terms.
     - `openGraph` has `title`, `description`, and `url` set (not just inherited from layout).
     - Blog articles should set `openGraph.type` to `"article"`.
  3. Fix any pages with missing or weak metadata.
  4. Target keywords per page:
     | Page | Primary Keyword | Secondary Keywords |
     |------|----------------|-------------------|
     | `/` | play 2048 online | 2048 game, 2048 multiplayer, 2048 leaderboard |
     | `/how-to-play` | how to play 2048 | 2048 rules, 2048 tutorial, 2048 controls |
     | `/strategy` | 2048 strategy | 2048 tips, how to win 2048, 2048 corner method |
     | `/blog` | 2048 blog | 2048 tips, 2048 news |
     | `/blog/how-to-win-*` | how to win 2048 | 2048 strategy guide, 2048 corner method |
     | `/blog/what-is-elo-*` | 2048 ELO rating | 2048 ranking, competitive 2048 |
     | `/blog/multiplayer-*` | 2048 multiplayer | play 2048 online, 2048 competitive |
  5. Run `npx tsc --noEmit`.
  6. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 3: Performance audit**
  1. Read `src/app/layout.tsx` and verify fonts use `display: "swap"`.
  2. Grep for all `<img>` tags in the codebase. Verify each has `width`, `height`, and `alt`. Fix missing ones.
  3. Grep for inline `style=` objects in TSX files. Convert large inline styles to CSS classes in `globals.css`.
  4. Check if a service worker file exists in `public/` (`sw.js`, `service-worker.js`, etc.). If it caches HTML with `cache-first`, flag for manual review.
  5. Run `npx tsc --noEmit`.
  6. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 4-5: Google Search Console (MANUAL)**
  This cannot be done by an agent. The project owner must:
  1. Go to https://search.google.com/search-console
  2. Add and verify `the2048league.com`
  3. Submit sitemap at `https://www.the2048league.com/sitemap.xml`
  4. Request indexing of all pages
  When done, mark this task `[x]`.

### Week 2: Content Expansion

- [ ] **Day 6: Write "How to Play 2048 with Friends Online"**
  1. Create `src/app/blog/how-to-play-2048-with-friends-online/page.tsx`.
  2. Follow the **Blog Article Template** at the bottom of this file.
  3. Details:
     - Slug: `how-to-play-2048-with-friends-online`
     - Title: "How to Play 2048 with Friends Online"
     - Tag: "Guide"
     - Date: Use today's date (YYYY-MM-DD)
     - Target keywords: "play 2048 with friends", "2048 multiplayer online", "2048 friend invite"
     - Meta description: "Learn how to invite a friend and play 2048 together in real time. Step-by-step guide to creating a room, sharing the link, and starting a match."
     - Sections:
       1. "What is Friendly Mode?" (casual 1v1, no ELO impact)
       2. "How to Create a Room" (click Play with a Friend, room code generated)
       3. "How to Share the Invite" (share link, friend clicks and joins)
       4. "How the Match Works" (same starting board, time limit, highest score wins)
       5. "Tips for Playing with Friends"
     - Internal links: `/how-to-play`, `/strategy`, `/blog/what-is-elo-rating-2048`
     - CTA: "Play Now" -> `/`, "Understand ELO" -> `/blog/what-is-elo-rating-2048`
     - Length: 800-1000 words
  4. Add to `posts` array in `src/app/blog/page.tsx`.
  5. Add slug to `blogSlugs` in `src/app/sitemap.ts`.
  6. Run `npx tsc --noEmit`.
  7. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 7: Write "2048 Game Modes Explained"**
  1. Create `src/app/blog/2048-game-modes-explained/page.tsx`.
  2. Follow the **Blog Article Template**.
  3. Details:
     - Slug: `2048-game-modes-explained`
     - Title: "2048 Game Modes Explained: Single Player, Ranked, and Friendly"
     - Tag: "Guide"
     - Date: Use today's date
     - Target keywords: "2048 game modes", "2048 ranked mode", "2048 single player vs multiplayer"
     - Meta description: "Compare single player, ranked multiplayer, and friendly mode in The 2048 League. Learn what each mode offers and when to use it."
     - Sections:
       1. "Single Player" (no time limit, practice strategy, daily leaderboard)
       2. "Ranked Multiplayer" (account required, ELO matchmaking, same board, time limit)
       3. "Friendly Mode" (no account for guests, invite link, no ELO changes)
       4. "Which Mode Should You Play?" (comparison table: time limit, account, ELO, best for)
     - Internal links: `/how-to-play`, `/strategy`, `/blog/what-is-elo-rating-2048`, `/blog/multiplayer-2048-tips-for-beginners`
     - CTA: "Play Now" -> `/`, "Learn Strategy" -> `/strategy`
     - Length: 800-1000 words
  4. Add to `posts` array in `src/app/blog/page.tsx`.
  5. Add slug to `blogSlugs` in `src/app/sitemap.ts`.
  6. Run `npx tsc --noEmit`.
  7. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 8: Write "2048 Board Sizes: 4x4 vs 8x8"**
  1. Create `src/app/blog/2048-board-sizes-4x4-vs-8x8/page.tsx`.
  2. Follow the **Blog Article Template**.
  3. Details:
     - Slug: `2048-board-sizes-4x4-vs-8x8`
     - Title: "2048 Board Sizes: 4x4 vs 8x8 Grid Comparison"
     - Tag: "Guide"
     - Date: Use today's date
     - Target keywords: "2048 8x8", "2048 board size", "2048 big board", "2048 grid size"
     - Meta description: "Compare the classic 4x4 and the larger 8x8 2048 boards. Learn how strategy, scoring, and difficulty change with board size."
     - Sections:
       1. "The Classic 4x4 Board" (tight space, strategy-intensive)
       2. "The 8x8 Board" (more room, higher scores, longer games)
       3. "Strategy Differences" (corner method adapts, more chain building room)
       4. "Which Should You Play?" (comparison grid: tile count, score range, difficulty, game length)
     - Internal links: `/strategy`, `/how-to-play`
     - CTA: "Play Now" -> `/`, "Strategy Guide" -> `/strategy`
     - Length: 600-800 words
  4. Add to `posts` array in `src/app/blog/page.tsx`.
  5. Add slug to `blogSlugs` in `src/app/sitemap.ts`.
  6. Run `npx tsc --noEmit`.
  7. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 9: Write "Top 10 Mistakes Beginners Make in 2048"**
  1. Create `src/app/blog/top-10-mistakes-beginners-make-in-2048/page.tsx`.
  2. Follow the **Blog Article Template**.
  3. Details:
     - Slug: `top-10-mistakes-beginners-make-in-2048`
     - Title: "Top 10 Mistakes Beginners Make in 2048"
     - Tag: "Strategy"
     - Date: Use today's date
     - Target keywords: "2048 mistakes", "2048 beginner tips", "why I lose at 2048"
     - Meta description: "Struggling with 2048? Here are the 10 most common mistakes beginners make and exactly how to fix each one."
     - Each mistake gets its own `<h2>`:
       1. Swiping randomly without a plan
       2. Not picking a corner
       3. Moving in all four directions equally
       4. Chasing small merges across the board
       5. Leaving the anchor row empty
       6. Putting the biggest tile in the center
       7. Panicking when the board gets crowded
       8. Playing too fast in single player
       9. Ignoring the new tile spawn position
       10. Giving up too early
     - Internal links: `/strategy`, `/how-to-play`, `/blog/how-to-win-2048-complete-strategy-guide`
     - CTA: "Play Now" -> `/`, "Full Strategy Guide" -> `/strategy`
     - Length: 800-1200 words
  4. Add to `posts` array in `src/app/blog/page.tsx`.
  5. Add slug to `blogSlugs` in `src/app/sitemap.ts`.
  6. Run `npx tsc --noEmit`.
  7. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 10-12: Build public /leaderboard page**
  1. Create `src/app/leaderboard/page.tsx` as a server component (no `"use client"`).
  2. Requirements:
     - Export `metadata`: title "2048 Leaderboard: Top Scores and Rankings", keywords "2048 leaderboard", "2048 high scores", "2048 top players".
     - Import `createAdminClient` from `@/lib/supabase-admin`.
     - Fetch top 20 scores from the `scores` table ordered by `score` descending.
     - Render a table: Rank (#), Username, Score, Date.
     - Format scores with `toLocaleString()`, dates with `toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })`.
     - "Back to Game" link at top.
     - CTA at bottom: "Want to see your name here?" with "Play Now" link.
     - Text linking to `/strategy`: "Climb the ranks by mastering 2048 strategy."
     - Handle Supabase not configured (friendly message).
     - Handle empty results ("No scores yet. Be the first to play!").
  3. Use `content-page` and `content-container` CSS classes.
  4. Add `.leaderboard-table` styles to `globals.css` (striped rows, responsive, theme-aware).
  5. Add `/leaderboard` link to footer in `src/components/Footer.tsx`.
  6. Add `/leaderboard` to `src/app/sitemap.ts`.
  7. Run `npx tsc --noEmit`.
  8. Mark this task `[x]` and update `CHANGELOG.md`.

### Week 3: Linking and Outreach

- [ ] **Day 13-14: Internal linking audit**
  1. Read every page under `src/app/` (skip `api/`, `auth/`).
  2. For each page, list all `<Link>` hrefs. Verify each page links to at least 2 other pages.
  3. Add a "Related Articles" section before the CTA in each blog article:
     ```tsx
     <section className="content-section">
       <h2 className="content-heading">Related Articles</h2>
       <ul className="content-list">
         <li><Link href="/blog/SLUG" className="content-inline-link">Title</Link></li>
       </ul>
     </section>
     ```
  4. Verify `/leaderboard` links to `/strategy`.
  5. Verify `/how-to-play` links to `/strategy` and `/blog`.
  6. Verify `/strategy` links to `/how-to-play` and `/blog`.
  7. Run `npx tsc --noEmit`.
  8. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 15-19: Social media and outreach (MANUAL)**
  This cannot be done by an agent. The project owner must:
  1. Create/update Twitter/X profile. Share blog articles and multiplayer feature.
  2. Submit to game directories (CrazyGames, itch.io). Highlight multiplayer and ELO.
  3. Post in r/webgames, r/puzzles with genuine strategy tips and a link. Do not spam.
  4. Consider a Product Hunt launch for competitive 2048 with ELO.
  When done, mark this task `[x]`.

### Week 4: More Content and Optimization

- [ ] **Day 20: Write "The History of 2048"**
  1. Create `src/app/blog/history-of-2048/page.tsx`.
  2. Follow the **Blog Article Template**.
  3. Details:
     - Slug: `history-of-2048`
     - Title: "The History of 2048: From Side Project to Global Phenomenon"
     - Tag: "Culture"
     - Date: Use today's date
     - Target keywords: "2048 history", "who made 2048", "2048 origin", "Gabriele Cirulli"
     - Meta description: "The story of how 2048 went from a weekend side project to one of the most popular puzzle games in the world, and how The 2048 League continues the tradition."
     - Sections:
       1. "The Origin" (Gabriele Cirulli, March 2014, inspired by 1024 and Threes!, open source)
       2. "Going Viral" (millions of players, hundreds of clones, media coverage)
       3. "Why 2048 Endures" (simple rules, deep strategy, quick sessions)
       4. "The 2048 League: Multiplayer Evolution" (competitive play, ELO, real-time)
     - Internal links: `/how-to-play`, `/strategy`, `/blog/what-is-elo-rating-2048`
     - CTA: "Play Now" -> `/`, "Learn the Strategy" -> `/strategy`
     - Length: 600-800 words
  4. Add to `posts` in `src/app/blog/page.tsx`.
  5. Add slug to `blogSlugs` in `src/app/sitemap.ts`.
  6. Run `npx tsc --noEmit`.
  7. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 21: Write "How to Reach the 4096 Tile"**
  1. Create `src/app/blog/how-to-reach-4096-tile/page.tsx`.
  2. Follow the **Blog Article Template**.
  3. Details:
     - Slug: `how-to-reach-4096-tile`
     - Title: "How to Reach the 4096 Tile (and Beyond)"
     - Tag: "Strategy"
     - Date: Use today's date
     - Target keywords: "2048 4096 tile", "2048 high tile", "beyond 2048", "2048 advanced strategy"
     - Meta description: "Reaching 2048 is just the beginning. Learn advanced strategies for building the 4096 tile, 8192, and beyond in 2048."
     - Sections:
       1. "Life After 2048" (game continues, scores multiply, margin shrinks)
       2. "Perfecting the Snake" (flawless pattern mandatory)
       3. "Managing the Second Row" (key difference between 2048 and 4096 players)
       4. "When to Take Risks" (evaluating dangerous swipes)
       5. "The 8192 Tile and Beyond" (near-perfect play, mental endurance)
     - Internal links: `/strategy`, `/blog/how-to-win-2048-complete-strategy-guide`, `/blog/top-10-mistakes-beginners-make-in-2048`
     - CTA: "Play Now" -> `/`, "Master the Basics First" -> `/strategy`
     - Length: 800-1000 words
  4. Add to `posts` in `src/app/blog/page.tsx`.
  5. Add slug to `blogSlugs` in `src/app/sitemap.ts`.
  6. Run `npx tsc --noEmit`.
  7. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 22-23: Add FAQ sections to all blog articles**
  1. Read all blog articles under `src/app/blog/*/page.tsx`.
  2. For each article that does not have a FAQ section, add one before the CTA:
     ```tsx
     <section className="content-section">
       <h2 className="content-heading">Frequently Asked Questions</h2>
       <h3 className="content-subheading">Question here?</h3>
       <p>Answer here.</p>
     </section>
     ```
  3. Add 2-3 FAQs per article. Phrase questions as someone would type into Google:
     - Strategy article: "What is the best strategy for 2048?", "Is 2048 a game of luck or skill?"
     - ELO article: "How does ELO work in 2048?", "Can I lose ELO in friendly matches?"
     - Multiplayer tips: "Can I play 2048 with a friend?", "Is 2048 multiplayer free?"
     - Friends guide: "How do I invite a friend to 2048?", "Do friendly matches affect my rank?"
     - Game modes: "What are the different 2048 game modes?", "Do I need an account to play 2048?"
     - Board sizes: "Is the 8x8 2048 board easier?", "What is the biggest 2048 board?"
     - Beginner mistakes: "Why do I keep losing at 2048?", "What is the number one 2048 tip?"
     - History: "Who created 2048?", "When was 2048 made?"
     - 4096 tile: "Is it possible to get 4096 in 2048?", "What comes after 2048?"
  4. Add any missing internal links.
  5. Run `npx tsc --noEmit`.
  6. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 24-25: Content refresh**
  1. Read all blog articles and content pages.
  2. Check for any broken internal links (href targets that do not have matching pages).
  3. Add internal links to any new pages created since the article was published.
  4. Update the `lastModified` date in `src/app/sitemap.ts` for any updated pages.
  5. Run `npx tsc --noEmit`.
  6. Mark this task `[x]` and update `CHANGELOG.md`.

- [ ] **Day 26-30: Search Console review and next month planning (MANUAL)**
  This cannot be done by an agent. The project owner must:
  1. Review Google Search Console data:
     - Which pages are indexed
     - Which queries generate impressions
     - Click-through rates per page
     - Any crawl errors
  2. Identify "striking distance" keywords (positions 11-20) and plan content for them.
  3. Plan next month's content calendar.
  When done, mark this task `[x]`.

---

## Blog Article Template

Every blog article must follow this exact pattern. Copy and adapt for each new article.

**RULES:**
- Do not use em dashes. Use commas, periods, semicolons, or rewrite.
- Do not add `"use client"`. Pages must be server components.
- Use `&apos;` for apostrophes and `&quot;` for quotes inside JSX text.
- Use `<Link>` from `next/link` for all internal links.
- Run `npx tsc --noEmit` after creating the file.

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ARTICLE TITLE HERE",
  description: "META DESCRIPTION HERE (120-160 chars, include primary keyword)",
  keywords: ["keyword1", "keyword2", "keyword3"],
  openGraph: {
    title: "ARTICLE TITLE HERE",
    description: "META DESCRIPTION HERE",
    url: "https://www.the2048league.com/blog/SLUG-HERE",
    type: "article",
  },
};

export default function COMPONENT_NAME() {
  return (
    <main className="content-page">
      <div className="content-container content-container-narrow">
        <Link href="/blog" className="content-back-link">
          &larr; Back to Blog
        </Link>

        <article className="blog-article">
          <header className="blog-article-header">
            <span className="blog-post-tag">TAG</span>
            <h1 className="content-title">ARTICLE TITLE HERE</h1>
            <time className="blog-article-date" dateTime="YYYY-MM-DD">
              MONTH DAY, YEAR
            </time>
          </header>

          <p className="content-intro">
            INTRO PARAGRAPH (2-3 sentences, include primary keyword naturally)
          </p>

          <section className="content-section">
            <h2 className="content-heading">Section Title</h2>
            <p>Section content here.</p>
          </section>

          {/* Repeat sections as needed */}

          <section className="content-section">
            <h2 className="content-heading">Frequently Asked Questions</h2>
            <h3 className="content-subheading">Question phrased as a Google search?</h3>
            <p>Answer here.</p>
            <h3 className="content-subheading">Another question?</h3>
            <p>Answer here.</p>
          </section>

          <section className="content-section">
            <h2 className="content-heading">Related Articles</h2>
            <ul className="content-list">
              <li>
                <Link href="/blog/RELATED-SLUG" className="content-inline-link">
                  Related Article Title
                </Link>
              </li>
            </ul>
          </section>

          <section className="content-section content-cta">
            <h2 className="content-heading">CTA HEADING</h2>
            <p>CTA text here.</p>
            <div className="content-cta-buttons">
              <Link href="/" className="content-btn-primary">
                Play Now
              </Link>
              <Link href="/RELATED-PAGE" className="content-btn-secondary">
                Secondary CTA
              </Link>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
```

**After creating the article, also do these two edits:**

1. In `src/app/blog/page.tsx`, add to the `posts` array (reverse-chronological order):
```ts
{
  slug: "SLUG-HERE",
  title: "ARTICLE TITLE",
  description: "SHORT DESCRIPTION FOR LISTING",
  date: "YYYY-MM-DD",
  tag: "TAG",
},
```

2. In `src/app/sitemap.ts`, add the slug to `blogSlugs`:
```ts
const blogSlugs = [
  // ... existing slugs
  "SLUG-HERE",
];
```
