# Changelog

## [Unreleased] - 2026-03-17

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

### Architecture
- Extracted pure game engine to `src/lib/game-engine.ts` — shared between browser and PartyKit server
- Created feature-based folder structure (`src/features/auth`, `theme`, `single-player`, `multiplayer`)
- Centralized `AppUser` type and `getDisplayName()` utility — eliminated 3 duplicate interface definitions
- Created `ThemeProvider` React context — replaced MutationObserver-based theme detection
- Refactored `Game2048` to use `forwardRef`/`useImperativeHandle` — replaced DOM-private methods (`_updateState`, `_init`, `_keepPlaying`, `_toggleSize`, `_getSize`, `_rerender`)
- Split `page.tsx` into thin shell (215 lines) + `SinglePlayerScreen` component
- Extracted `MatchResultModal`, `LeaveWarningModal`, `MultiplayerHud`, `OpponentPreview` from `MultiplayerView`
- Created shared UI primitives: `Modal` (with focus trap + focus return), `Button` (4 variants), `Spinner`, `Badge`
- Created `score-service.ts` — consolidated score saving and pending score submission
- Updated `bot-game.ts` to import from shared game engine instead of duplicating move logic
- Updated multiplayer protocol: added `move`, `your_initial_state`, `your_game_state` message types

### Accessibility
- Removed zoom restrictions (`maximumScale: 1`, `userScalable: false`) from viewport
- Added `prefers-reduced-motion` support — disables confetti animations and reduces transition durations
- Added `:focus-visible` styles with accent-colored outlines for all interactive elements
- Added `env(safe-area-inset-*)` padding for notched devices
- Shared `Modal` component includes focus trap, Escape close, `aria-modal`, and focus restoration

### Performance
- Switched to `next/font/google` for Fredoka and Nunito (eliminates render-blocking CSS import)
- Removed redundant `sendGameState` on every multiplayer move (server-authoritative `sendMove` handles it)

### Bug Fixes
- Fixed blank canvas after screen off/on — added `visibilitychange` listener to re-render
- Fixed orientation change causing game freeze — debounced resize handler (150ms)
- Reduced redundant WebSocket traffic in multiplayer (was sending both `state_update` and `move` per action)

### Documentation
- Rewrote `README.md` with stack, setup instructions, architecture overview, multiplayer protocol, auth model, and project structure
- Created `.env.example` with all required environment variables
