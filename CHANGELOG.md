# Changelog

## [Unreleased] - 2026-03-18

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

### Documentation
- Rewrote `README.md` with stack, setup instructions, architecture overview, multiplayer protocol, auth model, and project structure
- Created `.env.example` with all required environment variables
