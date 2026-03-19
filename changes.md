# Changes: Faster Direction Switching During Rapid Play

## Reduced Input Blocking on Merge Animation
- **Problem**: Each move blocked input for 120ms (full pulse/wobble duration), even though the tile slide only takes 50ms. During rapid direction changes, the player's next input arrived in that 70ms gap and was silently dropped — felt like lag.
- **Fix**: Input now unlocks after the slide completes (50ms) instead of waiting for the cosmetic pulse to finish (120ms). The merge wobble continues visually but no longer blocks the next move.
- Input-blocking window reduced from 120ms to 50ms (**58% reduction**)
- Game state (add tile, check game over, save) commits at slide-complete so the next move operates on the correct board
- **File**: `src/components/Game2048.tsx` — `animate()` function restructured

---

# Changes: Mobile Menu, Emoji Fix, Install Banner

## Mobile Menu — Leaderboard Priority
- Swapped Leaderboard and Theme sections in the mobile drawer so Leaderboard appears first
- **File**: `src/components/MobileMenu.tsx`

## Emoji Particle Fix
- Root cause: canvas emoji cache used `serif` font, which doesn't trigger emoji glyph fallback on many Android devices and Linux systems — emojis rendered as invisible
- Fixed font to explicit emoji stack: `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif`
- Added `prefers-reduced-motion: reduce` check in `burst()` — particles now respect OS motion sensitivity
- **File**: `src/components/EmojiParticles.tsx`

## Install Banner Improvements
- Dismiss cooldown increased from 7 days to **30 days**
- New `"2048_install_accepted"` localStorage key — if user installs, banner **never** shows again
- If user clicks Install but dismisses the native browser prompt, treated as a regular dismiss (30-day cooldown)
- Already-installed detection (`display-mode: standalone`) was already correct — no change needed
- **File**: `src/components/InstallBanner.tsx`

---

# Changes: OTP Input Overflow Fix & New Game Confirmation

## OTP Input Overflow Fix
- OTP digit boxes now scale responsively using `clamp()` instead of fixed `50px` width
  - Width: `clamp(38px, 12vw, 50px)`, Height: `clamp(46px, 14vw, 58px)`
  - Gap: `clamp(6px, 2vw, 10px)`, Font: `clamp(20px, 7vw, 28px)`
  - Container gets `max-width: 100%` to prevent horizontal overflow
- **Files**: `src/app/globals.css` (`.otp-boxes`, `.otp-box`)

## New Game Confirmation Modal
- Clicking "New Game" while a game is in progress now shows a confirmation dialog
- Tracks game-in-progress state via move feedback (any successful move marks the game as active)
- Modal uses existing `Modal` + `Button` components with proper `aria-labelledby` and focus trap
- "Keep Playing" (secondary) and "New Game" (primary) actions
- No confirmation shown if the board is freshly initialized or game already ended
- Score ref resets on new game start and on Play Again from game-over modal
- **Files**: `src/features/single-player/SinglePlayerScreen.tsx`

---

# Changes: Design Audit & Comprehensive Quality Fixes

## Overview

Full design audit across accessibility, performance, theming, and responsive design — followed by systematic fixes via `/colorize`, `/harden`, `/normalize`, and `/optimize` passes. 65 issues identified, 50+ fixed.

## Colorize — Contrast & Theme Fixes

### Button Contrast (WCAG AA — was failing in 3/4 themes)
- **Classic**: Button gradient darkened `#f59e0b→#d97706` → `#b45309→#92400e` (3.19:1 → 5.02–7.09:1)
- **Ocean**: `#22d3ee→#0891b2` → `#0e7490→#155e75` (3.68:1 → 5.36–7.27:1)
- **Forest**: `#4ade80→#16a34a` → `#15803d→#166534` (3.30:1 → 5.02–7.13:1)
- All button gradients changed from `accent-light→accent` to `bg-button→bg-button-hover`

### Semantic Color Variables (new)
Added per-theme CSS variables for consistent semantic colors:
- `--color-danger`: `#dc2626` (light) / `#f87171` (midnight) — fixes 3.03:1 failure on dark bg
- `--color-success`: `#15803d` (light) / `#4ade80` (midnight) — fixes 2.20:1 failure on Classic
- `--color-connected`: `#047857` (light) / `#34d399` (midnight) — fixes 3.38:1 failure
- `--text-on-accent`: `#ffffff` (all themes) — single variable for text on colored surfaces

### Midnight Theme Toned Down
- `--accent-glow` opacity: 0.3 → 0.15
- `--title-glow` opacity: 0.5 → 0.3
- Title gradient: removed pink (`#ec4899`), now purple-only (`#8b5cf6`, `#c4b5fd`)

### Hardcoded Colors Replaced
- 18× `#dc2626` → `var(--color-danger)`
- 4× `#059669` → `var(--color-connected)`
- 4× `#16a34a` → `var(--color-success)`
- 1× `#22c55e` → `var(--color-success)`
- Modal card border: `rgba(251,191,36,0.15)` → `var(--accent-border-medium)`
- Google button border: `rgba(217,119,6,0.2)` → `var(--bg-card-border)`
- Google button hover/active: hardcoded amber → `var(--accent-bg-subtle)` / `var(--accent-bg-light)`
- Ghost CTA text: `var(--accent)` (3.07:1 fail) → `var(--text-secondary)` (6.84:1)
- `boardGlow` animation: `infinite` → single play on load
- Win/loss stat pill Midnight overrides: hardcoded hex → `var(--color-success/danger)`

### Files Changed
- `src/app/globals.css` — theme variables, button gradients, semantic colors
- `src/lib/themes.ts` — bgButton/bgButtonHover values for Classic, Ocean, Forest
- `src/features/multiplayer/game/LeaveWarningModal.tsx` — inline danger color
- `src/features/single-player/SinglePlayerScreen.tsx` — DEV button colors

---

## Harden — Accessibility Fixes (22 issues)

### Form Labels & Error Association
- **EmailSignIn.tsx**: `<label htmlFor="signin-email">`, `aria-describedby` on inputs → error messages, `role="alert"` on errors, `aria-busy` on verify button, `<fieldset>`+`<legend>` wrapping OTP boxes, `aria-label` per digit
- **UsernamePrompt.tsx**: `<label htmlFor="username-input">`, `aria-describedby="username-error"`, `role="alert"` on error

### aria-live Regions
- **MultiplayerHud.tsx**: `aria-live="polite" aria-atomic="true"` on timer, `role="status" aria-live="polite"` on status bar
- **OpponentPreview.tsx**: `role="status" aria-live="assertive"` on disconnection overlay
- **MatchResultModal.tsx**: `role="status" aria-live="polite"` on rematch notification

### Keyboard & ARIA
- **OpponentPreview.tsx**: `onKeyDown` handler for Enter/Space on mini preview, `aria-label="Close opponent board"` on close button, `role="dialog" aria-modal="true"` on expanded view
- **MultiplayerHud.tsx**: `title` → `aria-label` on connection status, `aria-hidden` on decorative blob
- **MobileMenu.tsx**: `aria-expanded={open}` on hamburger trigger
- **DesktopSidebar.tsx**: `aria-label="Game menu"` on `<aside>`
- **HowToPlay.tsx**: `aria-controls="how-to-play-content"` + matching `id`, `aria-hidden="true"` on all 3 instruction SVGs

### Decorative Elements
- **SinglePlayerScreen.tsx**: `aria-hidden="true"` on confetti container

### Infrastructure
- **globals.css**: Added `.sr-only` utility class

---

## Normalize — Theming Consistency

- Replaced 30+ hardcoded white text colors (`#ffffff`, `#fff`, `white`) → `var(--text-on-accent)`
- Removed duplicate `@keyframes pulse` definition (was defined twice with different values)

---

## Optimize — Performance

- **Leaderboard.tsx**: Realtime subscription stabilized with ref pattern (no longer recreates on tab/trigger change), INSERT events debounced at 500ms
- **globals.css**: `backdrop-filter: none` added to `prefers-reduced-motion: reduce` for modals/overlays (removes expensive GPU compositing)
- **globals.css**: `boardGlow` changed from infinite to single play (reduces continuous paint cost)

---

# Changes: Resend Email via Supabase Auth Hook

## Overview

OTP emails are sent through a **Supabase Edge Function** that intercepts Supabase Auth's "Send Email" hook. When `signInWithOtp()` is called, Supabase calls our Edge Function instead of sending its default email. The function builds a game-themed HTML email and sends it via **Resend**. The Resend API key stays as a Supabase secret — the Next.js app doesn't need it.

## Architecture

```
Client                          Supabase Auth                    Edge Function              Resend
  │                                  │                               │                        │
  ├─ signInWithOtp({ email }) ──────►│                               │                        │
  │                                  ├─ Auth Hook (Send Email) ─────►│                        │
  │                                  │                               ├─ POST resend.com/emails─►│
  │                                  │                               │                        ├─ Delivers email
  │                                  │   Stores OTP internally       │                        │
  │                                  │◄──────── 200 OK ──────────────┤                        │
  │◄──────── { success } ───────────┤                               │                        │
  │                                  │                               │                        │
  │  User enters 6-digit code       │                               │                        │
  ├─ verifyOtp({ email, token }) ──►│                               │                        │
  │◄──────── session ────────────────┤                               │                        │
```

## What Changed

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/send-email/index.ts` | Edge Function — receives Auth hook webhook, builds game-themed email, sends via Resend API |

### Modified Files

| File | Change |
|------|--------|
| `src/components/GameOverModal.tsx` | Removed Google OAuth, replaced magic link with OTP code entry UI, added error handling |
| `src/components/MultiplayerView.tsx` | Same auth changes for multiplayer login screen |
| `src/app/globals.css` | Added `.modal-error` style |
| `src/app/page.tsx` | Hides "4x4 Multi" button when Supabase is not configured |

### Removed

- **Google OAuth** — `handleGoogleSignIn`, Google button, Google SVG icon
- **Magic link flow** — no more redirects, everything is in-page OTP

---

## Setup Steps

### 1. Link Supabase project (if not already)

```bash
npx supabase link --project-ref vqipyshqxxfudocqrbgt
```

### 2. Set secrets

Use the same Resend API key from market-hustle:

```bash
npx supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE
npx supabase secrets set RESEND_FROM_EMAIL="2048 Game <noreply@yourdomain.com>"
```

> The `SEND_EMAIL_HOOK_SECRET` is auto-generated when you configure the hook in step 4.

### 3. Deploy the Edge Function

```bash
npx supabase functions deploy send-email --no-verify-jwt
```

> `--no-verify-jwt` is required because Supabase Auth calls this function internally via webhook, not with a user JWT.

### 4. Configure the Auth Hook

1. Go to **Supabase Dashboard** → **Authentication** → **Hooks (Beta)**
2. Enable **Send Email** hook
3. Set hook type to **Supabase Edge Functions**
4. Select the `send-email` function
5. Save — Supabase generates the `SEND_EMAIL_HOOK_SECRET` automatically and passes it to the function

### 5. Configure OTP in Auth settings

1. Go to **Supabase Dashboard** → **Authentication** → **Email**
2. Make sure **Enable Email OTP** is on
3. Set OTP expiry to **600 seconds** (10 minutes)

---

## Email Design

The OTP email matches the game's visual identity:

- **Header**: Brown background (`#92400e`) with a "2048" logo styled as a game tile
- **OTP digits**: Each digit rendered as an individual tile (`#fef3c7` background, `#78350f` text, `#fde68a` border) — looks like the in-game tiles
- **Expiry badge**: Amber pill showing "Expires in 10 minutes"
- **Footer**: Light amber (`#fef3c7`) with tagline
- **Layout**: Table-based with inline styles for maximum email client compatibility

## Why Auth Hook vs API Routes

| | Auth Hook (current) | Custom API Routes |
|---|---|---|
| Resend key location | Supabase secret | `.env.local` |
| OTP management | Supabase handles it | Manual (DB table, hashing, expiry) |
| Email sending | Edge Function | Next.js API route |
| Extra dependencies | None in Next.js | `resend` npm package |
| DB changes needed | None | `otp_codes` table |
| Code complexity | 1 file (Edge Function) | 2 API routes + DB schema |
