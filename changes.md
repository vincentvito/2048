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
