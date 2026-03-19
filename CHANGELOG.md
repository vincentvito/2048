# Changelog

## [Unreleased] - 2026-03-19

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
- Multiplayer now syncs server-authoritative game state back to client after each move — prevents client/server grid divergence from different random tile placement, fixing "0-0 tie" results

### Changed
- "Play with a Friend" is now one click — immediately generates room + shareable link (no more Create/Join menu)
- Joining a friend's game is link-only — removed manual room code input
- Auth gate allows guests through for friendly mode (ranked still requires sign-in)

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
