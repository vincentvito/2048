# Changelog

## [Unreleased] - 2026-03-25

### Added

- SEO content pages: `/how-to-play` (rules and tutorial), `/strategy` (strategy guide with corner method, snake pattern, and multiplayer tips), and `/blog` (article listing)
- Blog section with three initial articles: "How to Win at 2048: The Complete Strategy Guide", "What is ELO Rating in 2048?", and "Multiplayer 2048: Tips for Beginners"
- `sitemap.ts` and `robots.ts` for search engine discoverability
- `/privacy` page with privacy policy covering account data, game data, cookies, third-party services (Supabase, Resend, PartyKit, Google Fonts), guest play, and data deletion rights
- Site footer with links to How to Play, Strategy Guide, Blog, and Privacy Policy, plus a server-rendered "about" blurb with SEO keywords (added to root layout)
- JSON-LD structured data (WebApplication/Game schema) in the document head for rich search results
- `--overlay-neutral` CSS variable across all themes for consistent neutral overlay backgrounds
- Tablet breakpoint (521px-1079px) with dedicated layout rules for body padding, container widths, modal sizing, and multiplayer lobby
- Focus trap in mobile menu drawer with Tab cycling, Escape-to-close, and focus restore on close
- Accessibility: game canvas uses `role="application"` with `tabIndex={0}` for proper keyboard interaction
- Accessibility: leaderboard tabs use `role="tablist"`/`role="tab"` with `aria-selected`
- Accessibility: theme switcher uses `role="group"` with `aria-pressed` on each option
- Accessibility: game mode toggle buttons use `aria-pressed`
- Accessibility: decorative SVG icons marked with `aria-hidden="true"` throughout components
- Accessibility: replaced `outline: none` with `outline: 2px solid transparent` for visible focus rings on inputs and interactive elements
- Visually hidden `<h1>` on main page for screen readers and SEO
- `<main>` landmark wrapper on the home page (was a plain `<div>`)
- Shared `.modal-confirm-body` / `.modal-confirm-title` / `.modal-confirm-desc` / `.modal-confirm-actions` CSS classes for consistent confirm dialog styling
- `.loader` / `.loader-center` CSS classes for consistent spinner styling
- `.auth-success` CSS styles for the post-login redirect page (replaces Tailwind utility classes)
- `.below-board-controls-spaced` and `.grid-size-control-loose` utility classes

### Changed

- Confetti colors in single-player win modal and multiplayer result modal now use the active theme's palette instead of hardcoded colors
- `canvas-confetti` is now dynamically imported in multiplayer (reduces initial bundle size)
- Multiplayer state restore/initial-board retries use `requestAnimationFrame` instead of `setInterval` for smoother application
- Mobile menu drawer breakpoint widened from 600px to 1079px (visible on tablets without desktop sidebar)
- Mobile touch targets for "New Game" button and grid-size options increased to 44px minimum height
- Auth success page uses semantic CSS classes instead of Tailwind utilities
- Confirm dialogs (new game, rejoin match, leave warning) use shared `.modal-confirm-*` classes instead of inline styles
- Multiplayer loader spinners use `.loader-center` class instead of inline margin styles
- Install banner icon has explicit `width`/`height` and `loading="lazy"`
- Auth card shadow uses theme variable `--board-shadow-a` instead of hardcoded `rgba`
- Hardcoded overlay backgrounds replaced with `var(--overlay-neutral)` for theme consistency
- Removed `transition: max-width 0.3s ease` from `.container` (unnecessary layout transition)
- Refactored `HowToPlay` component from client-rendered (useState/useEffect) to server-rendered using native `<details>`/`<summary>`. Instructional text is now crawlable by search engines. Mobile/desktop controls text uses CSS media queries (`pointer: coarse`) instead of JavaScript detection

### Fixed

- Centered "Sign in with email" and "Play with a Friend" buttons in multiplayer auth gate (added flex centering to `.mp-auth-card`)
- Fixed multiplayer post-match "Menu" and "New Opponent" buttons being hard to read on hover (dark text on dark hover background). Buttons in the result actions row now use dark background with white text, consistent with the primary button style
- Opponent side card now shows a visible `outline` on `:focus-visible` instead of suppressing it

## [Previous] - 2026-03-23

### Added

- Player stats dashboard (`/stats`) — server-rendered page showing profile, ELO rank/tier, KPIs (games played, time played, best score, win rate, favorite mode), score momentum sparkline, next milestones, multiplayer W/L/T snapshot, single-player run library by grid size, best day highlight, and recent activity feed
- `src/features/stats/get-player-stats-dashboard.ts` — server-side data aggregation across `player_stats` and `scores` tables (includes trend analysis, time estimation, and milestone tracking)
- "My Stats" link in DesktopSidebar and MobileMenu for authenticated users (navigates to `/stats`)
- Client-side move preview for server-authoritative multiplayer — plays the tile slide animation locally while waiting for server confirmation, then applies the authoritative state once the animation completes. Prevents premature win triggers, haptic feedback, and screen shake during preview moves
- Authoritative move rollback — if the server doesn't respond within 1.5s, the client restores the pre-move snapshot (grid, score, tiles) so the board never gets stuck in a pending state
- Server-authoritative multiplayer inactivity timeout — after 5 seconds without a successful move, that player loses the match (`party/game.ts` — **requires PartyKit deploy**)

### Fixed

- Server now always sends `your_game_state` back to the mover, even for no-op moves — client preview needs the acknowledgment to resolve pending state. Opponent broadcast and match resolution only fire when state actually changed (`party/game.ts` — **requires PartyKit deploy**)
- Fixed double divider above "Score momentum" panel on stats page — first `.stats-panel` inside `.stats-main-grid` no longer adds its own `border-top` when the grid already provides one
- Fixed missing divider between "Favorite mode" and "Win rate" sections — `.stats-kpi-grid` now has the same `border-top` separator as the other stat sections
- Re-added `user_id` to score inserts in `score-service.ts` — stats page queries by user ID, so scores need the FK populated
- Added missing `ease` keyword to sidebar sign-in/sign-out button transitions
- Removed stale `line-height` and `text-align` overrides on mobile menu buttons
- Removed unused `.modal-btn-share svg` rule
- Changed mobile sign-out trigger from `:active` to `:hover` for consistency
- Removed `:active` scale transform on opponent mini preview (no longer interactive)
- Gated `usePartyGame` WebSocket console.log calls behind `IS_DEV` — production no longer logs every message
- Fixed game board pushed right by left sidebar — safe-area `padding-right` rule was overriding the desktop sidebar offset; scoped to mobile-only
- Restored multiplayer opponent boards without reverting to the older lag-prone rendering path — desktop now shows a read-only opponent board beside the local board, and mobile shows an inline opponent preview below the main board
- Fixed multiplayer HUD/timer regression after the opponent-board restore — the in-game timer, names, scores, and status layout now use the intended multiplayer styling again
- Fixed multiplayer pre-game/invite alignment regression — lobby, friend invite, and matchmaking screens no longer inherit board-layout overrides meant only for the in-game view
- Fixed service worker asset caching so generated CSS/JS chunks are no longer cached cache-first — prevents stale multiplayer layouts from persisting in Firefox and other browsers after deploys
- Fixed multiplayer opponent board occasionally showing stale or fabricated tiles — reconnect restores no longer relay legacy client snapshots to the other player, and read-only opponent boards now render incoming authoritative grid snapshots directly instead of inferring merge animations between network updates
- Doubled emoji particle celebration duration — win (100→200), personal best (90→180), daily best (95→190), and game over (60→120) bursts all last 2x longer
- Fixed multiplayer post-match modal layout — rematch, new-opponent, and menu actions now stack with proper spacing, and the friendly-match “no ELO change” message now has dedicated breathing room instead of crowding the buttons
- Fixed local multiplayer board tiles occasionally disappearing or jumping after moves — authoritative server updates no longer run the client-side merge animation path that could incorrectly spawn a local random tile during reconciliation
- Fixed opponent board updates jumping between authoritative snapshots — multiplayer now forwards the server move direction so read-only opponent boards can animate the same slide direction before applying the authoritative state
- Fixed read-only opponent boards showing local controls — multiplayer preview boards no longer render the `New Game` action

### Changed

- Desktop layout split into two sidebars — Leaderboard on the left, Menu (auth, themes, toggles, how to play) on the right. 296px wide each with 24px edge inset and gutter, shown at `min-width: 1080px`. No vertical border lines — sidebars float with padding. Mobile menu extended to cover up to 1079px
- Replaced text title (`h1` "2048" + subtitle) with transparent brand logo (`/2048-brand-nobg.png`) via `next/image`
- Replaced brand image and regenerated all icons/favicons from `2048-brand-nobg.png` (transparent background) — updated PWA icons (512, 192), apple-touch-icon, favicons (32, 16), Next.js icon, and OG brand image
- Game board now centers between both sidebars via `margin: 0 auto` on container (removed flex centering on page-layout)
- Safe-area padding scoped to `max-width: 1079px` so it doesn't override desktop sidebar offsets
- Modal and install banner centering now accounts for both sidebars
- Multiplayer stats score color now uses `--accent` instead of `--text-primary`
- Slightly increased `.mp-stats-pill-win` border opacity (0.2 → 0.25)
- Normalized line endings (CRLF → LF) across config and documentation files
- Multiplayer in-game layout now supports opponent visibility again while preserving the centered desktop shell — desktop uses a side-by-side local/opponent board split, and mobile uses a compact inline opponent card with expandable detail view
- Multiplayer in-game shell now uses a compact side opponent rail on both desktop and mobile, refreshed HUD/stats card styling, and `Racing Sans One` typography for the `VS` / opponent presentation

### Removed

- Unused `ThemeName` import from MultiplayerView

## [Previous] - 2026-03-20

### Added

- Shareable invite links for "Play with a Friend" — click to generate a link, share it, friend opens it and auto-joins
- `/play/[code]` route with OG metadata for rich link previews ("Join my 2048 match!")
- Guest play support — non-authenticated users can play friendly matches (no ELO, stats, or leaderboard scores saved)
- `src/lib/room-code.ts` — shared room code utilities (generate, validate, build invite URL)
- "Share Invite Link" button on match result modal when opponent disconnects in friendly mode — lets the remaining player re-send the invite
- `useGameFeedback` hook — centralized haptic + emoji particle feedback (replaces duplicated code in SinglePlayerScreen and MultiplayerView)
- Haptic feedback and emoji particle animations now work in multiplayer matches (merge haptics, game over/win bursts)

### Fixed

- Server now sends opponent's initial board state at game start — opponent board no longer appears empty until their first move
- Auto-join via invite link waits for session to load — logged-in users no longer briefly connect as "Guest" with wrong identity
- HUD scores initialize from server state immediately — no longer shows 0 until first move
- Invite link now opens directly on multiplayer screen (was briefly showing single player)
- `usePartyGame` hook no longer tears down WebSocket when ELO/name/gameMode changes — only reconnects on room change. Prevents opponent state messages from being lost during unnecessary reconnections
- Moved reconnection state sync from `onConnect` to `handleJoin` — server now sends game state only after the player identifies themselves, preventing premature/duplicate `game_start` messages
- Server rejects moves before game starts or with fewer than 2 players (`handleMove` guard)
- Fixed abandoned room state persisting after all players disconnect — server now resets match state (players, bot intervals, flags) when the last player leaves and clears stale state on new join if no active connections remain
- Server sends `your_state` to reconnecting players immediately after re-join — restores their grid/score without waiting for the next move
- Fixed restored local game state being re-sent to server on every render — `sendGameState` is now only called once during the initial restore (guarded by `suppressStateRef`)
- Added merge detection for server-authoritative multiplayer moves — `Game2048` now diffs previous/next grid to compute `maxMerge` and fires `onMoveFeedback` for haptic feedback in multiplayer
- Reverted build script to `next build` only — PartyKit deploys separately via `npm run party:deploy` (requires GitHub auth, cannot run in Vercel CI)

### Documentation

- Expanded README deploy section with detailed PartyKit instructions — explains when to deploy, how GitHub auth works, and how to keep `NEXT_PUBLIC_PARTYKIT_HOST` in sync between PartyKit and Vercel

### Changed

- "Play with a Friend" is now one click — immediately generates room + shareable link (no more Create/Join menu)
- Joining a friend's game is link-only — removed manual room code input
- Auth gate allows guests through for friendly mode (ranked still requires sign-in)
- Multiplayer Game2048 now runs in fully server-authoritative mode — client sends move direction only, server computes grid/score/tiles, client renders server state. Eliminates client/server grid divergence and fixes "0-0 tie" results

### Removed

- Room code display and manual code entry UI (replaced by invite links)
- "Create Room" / "Join Room" choice screen (friend-menu)

## [Previous] - 2026-03-18

### Security

- All API mutation routes now resolve user from session cookies instead of client-provided `userId`
- Created shared `getAuthenticatedUser()` helper for consistent server-side auth
- Added input validation to all API route payloads (`player-stats`, `active-match`, `leaderboard`, `username`)
- Normalized error responses — no internal details leaked to clients
- Username route now enforces uniqueness (case-insensitive) and blocks reserved words
- Username route reuses a shared DB pool instead of creating one per request
- Multiplayer match state is now **server-authoritative** — clients send move directions, server computes grid/score/win/loss
- Server generates initial boards for multiplayer matches (prevents client manipulation)
- Match results determined by server-computed state, not client-reported scores

### Removed

- Deleted legacy polling-based multiplayer (`useMatchmaking.ts`, `useMultiplayerGame.ts`)
- Deleted legacy API routes (`/api/matchmaking`, `/api/game-state`)
- Deleted public debug endpoint (`/api/debug/matchmaking`)
- Removed `getLeaderboardByElo()` placeholder that returned empty array
- Removed `window.__devPreviewTiles` and `window.__devAlmostGameOver` dev globals
- Removed verbose `console.log` statements from PartyKit server files (replaced with dev-gated logging)
- Removed render-blocking Google Fonts CSS `@import`
- Removed 12 unnecessary `useEffect` hooks (replaced with derived values and direct ref assignment)
- Removed 3 state variables that were redundant mirrors of props (`showResultModal`, `botOpponent`, `show`)

### Architecture

- Extracted pure game engine to `src/lib/game-engine.ts` — shared between browser and PartyKit server
- Created feature-based folder structure (`src/features/auth`, `theme`, `single-player`, `multiplayer`)
- Centralized `AppUser` type and `getDisplayName()` utility — eliminated 3 duplicate interface definitions
- Created `ThemeProvider` React context — replaced MutationObserver-based theme detection
- Refactored `Game2048` to use `forwardRef`/`useImperativeHandle` — replaced DOM-private methods (`_updateState`, `_init`, `_keepPlaying`, `_toggleSize`, `_getSize`, `_rerender`)
- Refactored `SinglePlayerScreen` to use `forwardRef`/`useImperativeHandle` — replaced static property mutation
- Split `page.tsx` into thin shell (~210 lines) + `SinglePlayerScreen` component
- Extracted `MatchResultModal`, `LeaveWarningModal`, `MultiplayerHud`, `OpponentPreview` from `MultiplayerView`
- Created shared UI primitives: `Modal` (with focus trap + focus return), `Button` (4 variants), `Spinner`, `Badge`
- Created `score-service.ts` — consolidated score saving and pending score submission
- Updated `bot-game.ts` to import from shared game engine instead of duplicating move logic
- Updated multiplayer protocol: added `move`, `your_initial_state`, `your_game_state` message types

### React Best Practices

- Replaced 8 ref-sync `useEffect` hooks in Game2048 with direct assignment during render (per React docs)
- Replaced `showResultModal` state + effect with derived value from `isMatchResolved` in MultiplayerView
- Replaced `botOpponent` state + effect with `useMemo` derivation from `opponentInfo` in MultiplayerView
- Replaced `show` state + effect with computed value in UsernamePrompt (`!isPending && user && !user.username`)
- Fixed every-render effect (missing dependency array) in SinglePlayerScreen
- Removed redundant `sendGameState` call on every multiplayer move (server-authoritative `sendMove` handles it)

### Accessibility

- Removed zoom restrictions (`maximumScale: 1`, `userScalable: false`) from viewport
- Added `prefers-reduced-motion` support — disables confetti animations and reduces transition durations
- Added `:focus-visible` styles with accent-colored outlines for all interactive elements
- Added `env(safe-area-inset-*)` padding for notched devices
- Shared `Modal` component includes focus trap, Escape close, `aria-modal`, and focus restoration

### Performance

- Switched to `next/font/google` for Fredoka and Nunito (eliminates render-blocking CSS import)
- Removed redundant WebSocket traffic — multiplayer no longer sends both `state_update` and `move` per action
- Debounced canvas resize handler (150ms) to prevent rapid redraws on orientation change

### Bug Fixes

- Fixed blank canvas after screen off/on — added `visibilitychange` listener to re-render canvas
- Fixed orientation change causing game freeze — debounced resize handler prevents cascading redraws
- Fixed UsernamePrompt not auto-hiding after username save (now derived from session state)
- Renamed `middleware.ts` to `proxy.ts` per Next.js 16 deprecation (function renamed from `middleware` to `proxy`)
- Fixed score not recorded in leaderboard after continuing past 2048 — score is now saved when the game truly ends (game over, play again, or new game) instead of at the moment 2048 is reached
- Fixed "All Time" leaderboard tab returning 400 — API now accepts `alltime` tab parameter
- Fixed OTP email sending failing in local development — OTP code is logged to the console when no Resend API key is configured
- Fixed game becoming unresponsive after browser resize or mobile tab switch — the `animating` flag could get stuck `true` when a resize interrupted a mid-move animation, causing `move()` to silently reject all input. Resize and visibility handlers now forcefully clear the animation lock.
- Fixed grid going blank after resize or returning from a hidden tab — the `tiles` render array could desync from the `grid` source of truth. Both handlers now rebuild tiles from grid data and re-render. Separated `recalcCanvas()` (dimension-only) from `setSizeInternal()` (full grid reset) so resizing never destroys game state.
- Fixed active-match API returning 500 for users without player stats — changed `.single()` to `.maybeSingle()` so missing rows return null instead of erroring
- Fixed score insert failing silently for Better Auth users — `scores.user_id` is a UUID FK referencing Supabase `auth.users`, but Better Auth uses text IDs. Removed `user_id` from score inserts since the leaderboard only needs `username`.
- Fixed game board not centered when desktop sidebar is visible — container now uses `flex: 1` to fill remaining space after sidebar offset

### Features

- Added emoji particle burst system (`EmojiParticles.tsx`) — canvas-based particle engine with physics (gravity, drag, rotation, scale easing) and pre-cached emoji rendering
- Added haptic feedback via `web-haptics` — triggers on tile merges (selection tick for small, medium buzz for 256+), plus win/game over/daily best events. Plain slides with no merge produce no haptic. Silently no-ops on unsupported platforms.
- Emoji burst + haptic events: win (🎉🏆⭐ + success), beat daily leaderboard (👑🥇🏆 + heavy), game over (💀😵🫠 + error)
- Added "Emoji Effects" and "Haptic Feedback" toggles in both desktop sidebar and mobile menu — both persisted to localStorage, both enabled by default
- Replaced broken SVG swipe hint with animated `👆` emoji that swipes in 4 directions with semi-transparent backdrop
- Added skeleton loading placeholder for the game board — prevents layout shift (small square → full board) on page load by reserving the correct dimensions with a pulsing placeholder until the canvas initializes
- Fixed board not centered in sidebar layout — safe-area `padding-left` rule was overriding the sidebar offset; removed conflicting rule
- Fixed board overflowing viewport on mobile — canvas size now constrained by both width AND height (reserves 300px for header/buttons/browser chrome), uses `100dvh` for dynamic viewport height
- Fixed hamburger menu overlapping game board — moved above install banner with safe-area-inset-bottom offset
- Fixed install banner covered by browser toolbar — raised z-index and padding for safe area

### PWA & SEO

- Made the app a Progressive Web App — web app manifest (`manifest.ts`), service worker, and install banner for "Add to Home Screen"
- Service worker v2: only caches static assets (images), never HTML or API responses — prevents stale content issues
- Added automatic update detection — when a new service worker activates, a persistent "New version available [Refresh]" toast appears in both browser and installed PWA mode
- Install banner only shows when applicable — on Android when `beforeinstallprompt` fires, on iOS immediately with share instructions, never on desktop
- Install banner styled as a floating centered card above the hamburger menu to avoid overlap
- Cropped brand image to square and generated PWA icons (192x192, 512x512, apple-touch-icon)
- Added comprehensive SEO metadata — OpenGraph, Twitter card, keywords, apple-web-app-capable, theme-color
- Added security headers via `next.config.ts` — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, plus no-cache for service worker
- Created `public/` folder with favicon, brand image, and PWA icons
- Replaced default Vercel favicon with 2048 League brand icon (auto-generated 16x16, 32x32, 48x48 from brand)
- Added landscape orientation blocker on mobile — shows "rotate to portrait" overlay when screen width < 900px in landscape
- Manifest specifies `orientation: "portrait"` for installed PWA mode

### Local Development

- Added local Supabase support — `npm run db:start`, `db:stop`, `db:reset`, `db:status` scripts
- Created proper migration ordering with Supabase timestamp format — all migrations now apply cleanly on `db reset`
- Added missing `scores` table migration (`20240101000000_scores.sql`) and consolidated `profiles` + scores RLS into `20240101000001_profiles_and_scores_setup.sql`
- Removed standalone `supabase-migration.sql` (content merged into numbered migrations)
- Added `supabase` CLI as a dev dependency for local database management
- Added dev-only "DEV: Win Setup" button — places two 1024 tiles for easy win-flow testing

### Code Quality

- Added Prettier for consistent code formatting — double quotes, 2-space indent, 100 char width, trailing commas, LF endings
- Added `eslint-config-prettier` to prevent ESLint/Prettier rule conflicts
- Added `.editorconfig` for consistent editor settings across the team
- Added `npm run format` and `npm run format:check` scripts
- Formatted all 48 source files
- Fixed 9 ESLint errors: recursive `useCallback` in EmojiParticles (switched to ref pattern), `let` → `const` for non-reassigned variable, `<a>` → `<Link>` for internal navigation
- Cleaned up unused variables: `displaySize`, `handleSizeToggle`, `showSignInModal`, `EngineState`, `DEFAULT_ELO`, `sessionCookie`
- Fixed `es-abstract` transitive dependency issue breaking ESLint

### Dependencies

- Added `sonner` for toast notifications — error toasts shown on leaderboard fetch failures and timeouts
- Added `web-haptics` for haptic feedback on mobile devices
- Added `prettier` and `eslint-config-prettier` as dev dependencies
- Added `supabase` as dev dependency for local database management

### Documentation

- Rewrote `README.md` with stack, setup instructions, architecture overview, multiplayer protocol, auth model, and project structure
- Created `.env.example` with all required environment variables
