# TODO - Codebase Audit and Improvement Report

## Executive Summary

This codebase already has a solid product direction:

- Single-player gameplay exists and is feature-rich.
- Multiplayer has a real-time PartyKit path.
- Auth, leaderboard, themes, and mobile-specific UX are already present.

The main issues are not missing features, but **architecture quality, trust boundaries, and maintainability**.

The biggest problems are:

- The app is too dependent on very large client components.
- Core game and multiplayer flows are implemented with imperative DOM bridges instead of clean React APIs.
- There is a **mixed architecture** with both current PartyKit multiplayer and older polling/API multiplayer still present.
- Several API routes trust client-provided identifiers while using admin-level database access.
- Styling is centralized in a very large global CSS file, which makes reuse and long-term maintenance harder.
- Accessibility and device support need work, especially for zooming, focus management, and reduced-motion/responsive consistency.
- There is effectively no automated test coverage.

If the goal is a clean, scalable, secure codebase with a great experience on desktop, mobile, single-player, and multiplayer, the top priorities should be:

1. Fix security and authority boundaries.
2. Remove dead/legacy multiplayer paths.
3. Refactor `Game2048.tsx`, `MultiplayerView.tsx`, and `page.tsx` into smaller feature modules.
4. Reduce imperative DOM control and expose proper React/state APIs.
5. Split global styling into reusable UI primitives and feature-level styling.
6. Add tests around the game engine and multiplayer protocol.

---

## Current Strengths

- [x] Real product depth already exists: auth, multiplayer, themes, leaderboard, stats.
- [x] The app uses TypeScript and App Router.
- [x] PartyKit is a better direction than polling-based multiplayer.
- [x] The project already contains useful domain separation in `components`, `hooks`, `lib`, `party`, and `api`.
- [x] Accessibility intent exists in a few places, such as `aria-live` announcements and some modal semantics.

---

## Highest Priority Issues (P0)

### 1. Secure all server mutation endpoints

**Problem**

Several API routes accept `userId` from the client and then use an admin Supabase client or direct DB access:

- `src/app/api/game-state/route.ts`
- `src/app/api/matchmaking/route.ts`
- `src/app/api/player-stats/route.ts`
- `src/app/api/user/username/route.ts`

This creates a dangerous trust model:

- A client can potentially act on behalf of another user by sending a different `userId`.
- Admin clients bypass RLS, so auth mistakes become severe.
- Ranking/stat integrity is vulnerable.

**What to do**

- [x] Resolve the authenticated user on the server from session/cookies, not from request body/query.
- [x] Reject all requests where the acting user is not the authenticated session user.
- [x] Avoid exposing admin-capable write paths unless absolutely necessary.
- [x] Move authenticated writes behind server-owned services with explicit authorization checks.
- [x] Add input validation for all route payloads.
- [ ] Add basic rate limiting for username changes, matchmaking joins, and stats updates.
- [x] Return normalized error responses without leaking internals.

**Why this matters**

Without this change, multiplayer integrity, leaderboard trust, and account data correctness are all weak.

---

### 2. Make multiplayer match state server-authoritative

**Problem**

The PartyKit game server currently trusts client-reported state updates in `party/game.ts`:

- grid
n- score
- won
- gameOver

That means the client can effectively tell the server the result.

**What to do**

- [x] Stop accepting full game truth from the client as authoritative.
- [x] Send only player inputs or validated move events from the client.
- [x] Compute grid, score, merges, `won`, and `gameOver` on the server.
- [x] Validate reconnection state against server-side source of truth.
- [x] Ensure forfeit, timeout, and rematch state are also server-owned.
- [x] Add protocol-level validation for message shape and room membership.

**Why this matters**

This is the single biggest issue for ranked multiplayer fairness.

---

### 3. Remove or isolate the legacy multiplayer implementation

**Problem**

There are two multiplayer stacks in the repo:

Active PartyKit path:

- `src/hooks/usePartyMatchmaking.ts`
- `src/hooks/usePartyGame.ts`
- `party/lobby.ts`
- `party/game.ts`

Older polling/API path:

- `src/hooks/useMatchmaking.ts`
- `src/hooks/useMultiplayerGame.ts`
- `src/app/api/matchmaking/route.ts`
- `src/app/api/game-state/route.ts`

The active UI uses PartyKit, so the older path appears to be legacy. Keeping both increases confusion, maintenance cost, and risk.

**What to do**

- [x] Decide which multiplayer architecture is the source of truth.
- [x] If PartyKit is final, delete the polling-based hooks and API routes.
- [x] Remove any dead references and related debug paths.
- [x] Document the chosen architecture in `README.md`.

**Why this matters**

A clean codebase cannot keep two competing networking systems unless both are intentionally supported.

---

### 4. Remove or protect debug endpoints and excessive production logging

**Problem**

There is a public debug route:

- `src/app/api/debug/matchmaking/route.ts`

There is also very heavy logging in:

- `party/lobby.ts`
- `party/game.ts`
- API routes

This can expose internals, generate noisy logs, and leak operational details.

**What to do**

- [x] Remove debug routes from production builds, or guard them behind environment checks and authentication.
- [x] Replace raw `console.log` spam with a structured logger.
- [x] Log only what is actionable.
- [x] Never log sensitive identifiers or IP/user metadata unless necessary.

---

## Architecture and Code Structure (P1)

### 5. Break up `src/app/page.tsx`

**Problem**

`src/app/page.tsx` is a large client page coordinating:

- auth session
- theme persistence
- swipe hint
- confetti
- score saving
- reconnect modal
- single/multi mode switching
- game result modal
- sidebar/menu composition

This creates a high-coupling root component.

**What to do**

- [x] Convert the top-level page into a thin shell.
- [x] Extract a `GameShell` client component.
- [x] Split single-player orchestration from multiplayer orchestration.
- [x] Move theme persistence into a dedicated hook/provider.
- [x] Move result modal state into a dedicated single-player feature module.
- [x] Replace DOM lookups like `document.querySelector('.game-canvas')` and `.game-container` with refs and explicit APIs.

**Suggested target**

- `src/features/single-player/SinglePlayerGame.tsx`
- `src/features/multiplayer/MultiplayerScreen.tsx`
- `src/features/theme/useThemePreference.ts`
- `src/features/game-shell/GameShell.tsx`

---

### 6. Break up `src/components/MultiplayerView.tsx`

**Problem**

`MultiplayerView.tsx` is extremely large and currently handles:

- auth state
- player stats loading
- matchmaking
- friend-room flow
- reconnect flow
- rematch logic
- ELO result processing
- mobile opponent modal
- leave modal
- result modal
- inline styles and UI rendering

This is too much responsibility for one component.

**What to do**

- [x] Split lobby flow from in-game flow.
- [ ] Split friend room creation/join into dedicated components.
- [x] Split mobile opponent preview and expanded modal into reusable components.
- [x] Split match result modal into its own component.
- [x] Split multiplayer HUD into its own component.
- [ ] Move ELO side effects into a dedicated hook or server action.
- [ ] Centralize derived multiplayer state in a feature hook.

**Suggested target**

- `src/features/multiplayer/lobby/MultiplayerLobby.tsx`
- `src/features/multiplayer/lobby/FriendRoomPanel.tsx`
- `src/features/multiplayer/game/MultiplayerBoardLayout.tsx`
- `src/features/multiplayer/game/MultiplayerHud.tsx`
- `src/features/multiplayer/game/MatchResultModal.tsx`
- `src/features/multiplayer/hooks/useMultiplayerSession.ts`

---

### 7. Refactor `src/components/Game2048.tsx` into engine + renderer + controller

**Problem**

`Game2048.tsx` is very large and mixes:

- game rules
- rendering
- animations
- storage
- input handling
- parent control API
- multiplayer sync
- accessibility announcements
- debug utilities

It also relies on custom properties attached to DOM elements:

- `_updateState`
- `_init`
- `_keepPlaying`
- `_toggleSize`
- `_getSize`
- `_rerender`

This is a major maintainability smell.

**What to do**

- [x] Extract the 2048 engine into pure functions with no DOM access.
- [ ] Extract rendering logic into a canvas renderer hook or utility.
- [ ] Extract keyboard/touch input into a dedicated hook.
- [ ] Extract local persistence into a dedicated hook.
- [x] Replace DOM-private methods with a typed imperative handle via `forwardRef`/`useImperativeHandle`, or better, a controlled component API.
- [x] Remove `window.__devPreviewTiles` and `window.__devAlmostGameOver` globals.

**Suggested target**

- `src/features/game-engine/engine.ts`
- `src/features/game-engine/types.ts`
- `src/features/game-engine/useGameController.ts`
- `src/features/game-canvas/useCanvasBoard.ts`
- `src/features/game-persistence/useSavedGame.ts`
- `src/features/game-input/useSwipeAndKeyboard.ts`

---

### 8. Introduce feature-oriented folders

**Problem**

The current `components`, `hooks`, and `lib` folders are okay for a small app, but the project has already outgrown a flat structure.

**What to do**

- [x] Group files by feature rather than only by technical type.
- [x] Keep shared UI separate from feature-specific code.
- [x] Keep transport/protocol code close to multiplayer feature code.

**Suggested structure**

```text
src/
  app/
  components/ui/
  features/
    auth/
    leaderboard/
    multiplayer/
    single-player/
    theme/
  lib/
    auth/
    db/
    utils/
  party/
```

---

## React Best Practices (P1)

### 9. Reduce imperative DOM coupling

**Problem**

The code often bypasses React using:

- `document.querySelector`
- custom properties attached to DOM nodes
- `querySelector('.game-container')`
- MutationObserver for theme sync
- `setTimeout` retries to wait for DOM APIs

This makes the component graph harder to reason about.

**What to do**

- [x] Replace DOM lookups with refs.
- [x] Replace DOM-private methods with typed React contracts.
- [ ] Replace retry loops with explicit lifecycle or state-based synchronization.
- [x] Move theme state into context/provider instead of observing `document.documentElement`.

---

### 10. Eliminate `eslint-disable` effect workarounds

**Problem**

There are effects that intentionally skip dependency correctness.

This usually means the component contract is too implicit.

**What to do**

- [x] Refactor effects until dependency arrays are correct.
- [x] Use refs only where stale closures are intentionally required.
- [x] Avoid one-time initialization effects that depend on mutable outer behavior.

---

### 11. Narrow `use client` boundaries

**Problem**

Many components are client components, including the page root.

Some parts truly need the client, but other parts are mostly static shell/composition.

**What to do**

- [ ] Keep the game board and interactive auth/multiplayer pieces client-side.
- [ ] Move non-interactive shell/layout content to server components where practical.
- [ ] Avoid putting the entire route tree behind one large client boundary.

**Why this matters**

This improves rendering clarity, bundle size, and maintainability.

---

### 12. Centralize shared types and utility derivations

**Problem**

User/session-related types are duplicated.

Example:

- `src/lib/auth-client.ts`
- `src/components/MobileMenu.tsx`

Display-name derivation logic is also repeated in multiple places.

**What to do**

- [x] Export one canonical user-facing type.
- [x] Add a shared `getDisplayName(user)` utility.
- [x] Keep API response types in shared files instead of inline duplication.

---

## Reusable Components and UI System (P1)

### 13. Create reusable UI primitives

**Problem**

The codebase repeats modal, button, card, divider, and section patterns.

Examples appear across:

- `GameOverModal.tsx`
- `MultiplayerView.tsx`
- `UsernamePrompt.tsx`
- `MobileMenu.tsx`
- `DesktopSidebar.tsx`

**What to do**

- [x] Create shared primitives for `Modal`, `Button`, `Card`, `Section`, `Spinner`, `EmptyState`, and `Badge`.
- [x] Use one consistent modal implementation with focus trap and close semantics.
- [x] Standardize button variants instead of repeating style overrides inline.

**Suggested shared UI**

- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `components/ui/card.tsx`
- `components/ui/spinner.tsx`
- `components/ui/empty-state.tsx`

---

### 14. Unify duplicated desktop/mobile content

**Problem**

`DesktopSidebar` and `MobileMenu` both render overlapping sections:

- auth
- leaderboard
- how to play
- theme switcher

That means duplicated maintenance and inconsistent UX risk.

**What to do**

- [ ] Extract shared sidebar/menu content into reusable section components.
- [ ] Keep only layout/container differences between desktop and mobile.
- [ ] Ensure both views use the same data and empty/loading states.

---

## Styling and Theming (P1)

### 15. Split `src/app/globals.css`

**Problem**

`globals.css` is extremely large and acts as the styling home for the whole app.

This makes:

- reuse harder
- dead CSS harder to detect
- component ownership less clear
- regressions more likely

**What to do**

- [ ] Keep only true global tokens/resets in `globals.css`.
- [ ] Move feature styles into CSS modules or feature-specific files.
- [ ] Prefer a shared design token layer and small component styles.
- [ ] Avoid ad hoc inline style objects where utility classes or reusable classes are better.

---

### 16. Replace Google font CSS import with `next/font`

**Problem**

Fonts are imported in CSS using `@import url(...)`.

This is worse than `next/font` for performance and consistency.

**What to do**

- [x] Switch to `next/font/google`.
- [x] Apply fonts from `layout.tsx`.
- [x] Remove render-blocking CSS imports.

---

### 17. Normalize theming strategy

**Problem**

Theming exists in both:

- CSS custom properties in `globals.css`
- JS theme definitions in `src/lib/themes.ts`

This duplication increases drift risk.

**What to do**

- [ ] Choose a single source of truth for theme tokens.
- [ ] Generate the alternate representation if both are needed.
- [x] Avoid needing DOM mutation observation just to detect theme changes.

---

## Multiplayer UX and Device Experience (P1)

### 18. Improve reconnect and connection-state UX

**Problem**

Reconnect logic currently depends on timeouts and DOM restoration heuristics.

This can feel fragile during real network interruptions.

**What to do**

- [ ] Show explicit reconnecting state with countdown/retry messaging.
- [x] Persist enough state server-side to resume reliably.
- [ ] Avoid hidden timeout-based failure assumptions when possible.
- [ ] Surface connection quality and reconnect progress more clearly.

---

### 19. Improve mobile and accessibility support

**Problem**

`src/app/layout.tsx` disables zoom with:

- `maximumScale: 1`
- `userScalable: false`

This is an accessibility problem.

There are also custom dialogs/drawers without a shared accessibility contract.

**What to do**

- [x] Remove zoom restrictions.
- [x] Use accessible modal/drawer primitives.
- [x] Add consistent focus trap and focus return.
- [x] Add visible focus states for keyboard users.
- [x] Respect `prefers-reduced-motion` for confetti and board animations.
- [ ] Test landscape mobile, small screens, and tablets explicitly.
- [x] Add safe-area handling for notched devices.

---

### 20. Strengthen single-player and multiplayer feedback states

**Problem**

There are good UX ideas already, but the experience can be made more robust:

- loading states are inconsistent
- disabled states are often style-based only
- some transitions rely on implicit timing
- multiplayer status text could be clearer

**What to do**

- [ ] Standardize loading, empty, error, and reconnect states.
- [x] Avoid inline style-based disabled UX when a variant system would be clearer.
- [ ] Improve opponent connection messaging and rematch messaging.
- [ ] Add clearer distinction between ranked and friendly states.
- [ ] Consider spectating/replay-ready architecture if multiplayer grows.

---

## Data Integrity and Auth Flow (P2)

### 21. Improve username update flow

**Problem**

`src/app/api/user/username/route.ts` creates a new `pg` pool per request and writes directly to the Better Auth user table.

There is also no visible uniqueness/reserved-name strategy.

**What to do**

- [x] Reuse a shared DB connection/pool.
- [x] Enforce username uniqueness.
- [x] Add reserved-word checks.
- [x] Normalize casing rules and display rules.
- [ ] Move validation into a shared schema used by both client and server.

---

### 22. Consolidate score/stats write paths

**Problem**

Score saving, pending-score recovery, guest score storage, and multiplayer stat updates are spread across multiple components and routes.

**What to do**

- [x] Create one score/stats service layer.
- [x] Separate guest-local persistence from authenticated persistence.
- [x] Ensure multiplayer ELO/stat updates happen from a trusted server-side result source.
- [x] Avoid duplicating username derivation in score writes.

---

## Code Quality and Maintainability (P2)

### 23. Reduce inline styles and ad hoc UI logic

**Problem**

Large components contain many inline `style={{ ... }}` blocks.

This reduces consistency and makes styling harder to scale.

**What to do**

- [ ] Replace repeated inline styles with class-based variants or reusable components.
- [ ] Keep exceptional dynamic styles minimal and localized.

---

### 24. Remove unfinished or placeholder APIs

**Problem**

There are placeholder or incomplete paths, for example:

- `getLeaderboardByElo()` returns an empty array with a TODO.

**What to do**

- [x] Either implement these paths fully or remove them until needed.
- [x] Avoid leaving dead-end public APIs in the shared library layer.

---

### 25. Improve documentation

**Problem**

The architecture choices are not obvious from the codebase alone.

**What to do**

- [x] Document the gameplay architecture.
- [x] Document the multiplayer protocol and room lifecycle.
- [x] Document auth/session assumptions.
- [x] Document environment variables and which ones are safe for client exposure.
- [x] Add a short feature ownership map.

---

## Testing and Reliability (P0/P1)

### 26. Add unit tests for the 2048 engine

**Problem**

There are no actual automated tests in the repo.

The most critical business logic is the game engine itself.

**What to do**

- [ ] Add tests for merge rules.
- [ ] Add tests for move resolution in all directions.
- [ ] Add tests for score calculation.
- [ ] Add tests for win and game-over detection.
- [ ] Add tests for 4x4 and 8x8 behavior.

---

### 27. Add multiplayer protocol and server tests

**What to do**

- [ ] Test join/rejoin flows.
- [ ] Test disconnect/reconnect behavior.
- [ ] Test timeout handling.
- [ ] Test forfeit handling.
- [ ] Test rematch flows.
- [ ] Test that unauthorized state/result manipulation is impossible.

---

### 28. Add route/auth integration tests

**What to do**

- [ ] Verify routes reject unauthenticated mutation requests.
- [ ] Verify users cannot mutate other users' records.
- [ ] Verify username validation and uniqueness rules.
- [ ] Verify leaderboard queries and date filtering.

---

### 29. Add end-to-end coverage

**What to do**

- [ ] Single-player: start game, move, win, lose, resume.
- [ ] Auth: sign in, set username, save score.
- [ ] Multiplayer ranked: queue, match, play, resolve, rematch.
- [ ] Multiplayer friendly: create/join room, reconnect, leave.
- [ ] Mobile flows: drawer, swipe hint, gameplay gestures.

---

## Recommended Cleanup Order

### Phase 1 - Security and architecture

- [x] Lock down all server mutation routes with real session-based authorization.
- [x] Make PartyKit authoritative for ranked multiplayer results.
- [x] Remove legacy polling multiplayer code and routes.
- [x] Remove or protect debug endpoints.

### Phase 2 - Major refactor for maintainability

- [x] Split `Game2048.tsx` into engine/controller/renderer/input/persistence.
- [x] Split `MultiplayerView.tsx` into feature components and hooks.
- [x] Split `page.tsx` into a thin shell plus feature orchestration.
- [x] Centralize shared types and service-layer fetchers.

### Phase 3 - UI system and UX polish

- [x] Extract shared UI primitives.
- [ ] Break `globals.css` into smaller owned style layers.
- [x] Replace font `@import` with `next/font`.
- [x] Improve mobile accessibility, zoom, motion preferences, and focus handling.

### Phase 4 - Reliability

- [ ] Add unit, integration, and E2E tests.
- [ ] Add CI checks for lint, typecheck, and test execution.

---

## Concrete File-by-File Priorities

### Immediate refactor targets

- [x] `src/components/Game2048.tsx`
- [x] `src/components/MultiplayerView.tsx`
- [x] `src/app/page.tsx`
- [ ] `src/app/globals.css`
- [x] `party/game.ts`

### Immediate security targets

- [x] `src/app/api/game-state/route.ts` (deleted — legacy)
- [x] `src/app/api/matchmaking/route.ts` (deleted — legacy)
- [x] `src/app/api/player-stats/route.ts` (secured — session-based auth)
- [x] `src/app/api/user/username/route.ts` (secured — shared pool, uniqueness, reserved words)
- [x] `src/app/api/debug/matchmaking/route.ts` (deleted)

### Likely delete-or-archive targets

- [x] `src/hooks/useMatchmaking.ts` (deleted)
- [x] `src/hooks/useMultiplayerGame.ts` (deleted)
- [x] `src/app/api/game-state/route.ts` (deleted — PartyKit replaces it)
- [x] `src/app/api/matchmaking/route.ts` (deleted — PartyKit replaces it)

---

## Final Assessment

### Current codebase status

- Product maturity: **good**
- Code structure cleanliness: **medium-low**
- React best-practice alignment: **medium-low**
- Reusability: **medium**
- Security posture: **low for competitive multiplayer**
- Mobile/accessibility quality: **medium**
- Testability: **low**

### What success looks like after cleanup

- A thin page shell with clearly separated single-player and multiplayer features.
- A pure, tested game engine shared across single-player and multiplayer.
- A server-authoritative multiplayer flow that does not trust client-reported results.
- Shared UI primitives and smaller feature components.
- A minimal global CSS layer with reusable component styles.
- Strong auth checks and safer database write paths.
- A smoother and more accessible experience across desktop, tablet, and mobile.
