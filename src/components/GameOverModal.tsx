"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import {
  getPersonalBest,
  savePersonalBest,
  incrementGamesPlayed,
  recordScore,
  getGamesPlayed,
  savePendingScore,
} from "@/lib/guest-scores";

interface GameOverModalProps {
  open: boolean;
  won: boolean;
  score: number;
  gridSize: number;
  onClose: () => void;
  onPlayAgain: () => void;
  onKeepPlaying?: () => void;
  leaderboardScores?: number[];
}

export default function GameOverModal({
  open,
  won,
  score,
  gridSize,
  onClose,
  onPlayAgain,
  onKeepPlaying,
  leaderboardScores,
}: GameOverModalProps): React.ReactElement | null {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: manage focus when modal opens and trap Tab navigation within modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onPlayAgain();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    },
    [onPlayAgain]
  );

  useEffect(() => {
    if (!open) return;

    // Focus the first interactive element (Play Again button) when modal opens
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstBtn = modalRef.current.querySelector<HTMLElement>(
          'button:not([disabled])'
        );
        firstBtn?.focus();
      }
    }, 50);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open) {
      setShowEmail(false);
      setEmail("");
      setEmailSent(false);
      setSending(false);

      // Track personal best
      const best = getPersonalBest(gridSize);
      const newBest = savePersonalBest(gridSize, score);
      setPersonalBest(Math.max(best, score));
      setIsNewBest(newBest);

      // Track games played and record score
      const count = incrementGamesPlayed();
      setGamesPlayed(count);
      recordScore(score, gridSize);

      // Calculate leaderboard rank preview
      if (leaderboardScores && leaderboardScores.length > 0) {
        const rank = leaderboardScores.filter((s) => s > score).length + 1;
        // Only show rank if within top 20
        if (rank <= 20) {
          setLeaderboardRank(rank);
        } else {
          setLeaderboardRank(null);
        }
      } else {
        // No leaderboard data: if configured, user would be #1
        if (isSupabaseConfigured()) {
          setLeaderboardRank(1);
        } else {
          setLeaderboardRank(null);
        }
      }
    }
  }, [open, score, gridSize, leaderboardScores]);

  async function handleSendMagicLink() {
    if (!email.trim() || sending) return;

    const supabase = createClient();
    if (!supabase) return;

    // Cache the score before auth redirect so it survives navigation
    savePendingScore(score, gridSize);

    setSending(true);
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });
      setEmailSent(true);
    } finally {
      setSending(false);
    }
  }

  /**
   * Sign in with Google OAuth.
   * NOTE: Google OAuth must be configured in the Supabase dashboard
   * (Project Settings > Auth > Providers > Google) for this to work.
   */
  async function handleGoogleSignIn() {
    const supabase = createClient();
    if (!supabase) return;

    // Cache the score before auth redirect so it survives navigation
    savePendingScore(score, gridSize);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
  }

  if (!open) return null;

  const configured = isSupabaseConfigured();

  // Ordinal suffix helper
  function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-title"
      aria-describedby="game-result-score"
      onClick={onClose}
    >
      <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {/* Win/Loss visual distinction */}
        <div className={`modal-result-banner ${won ? "modal-result-win" : "modal-result-lose"}`}>
          <h2 id="game-result-title" className="modal-result">{won ? "You Win!" : "Game Over"}</h2>
        </div>

        <div id="game-result-score" className="modal-score">{score.toLocaleString()}</div>

        <div className="modal-meta">
          <span className="modal-badge">
            {gridSize}&times;{gridSize}
          </span>
          {isNewBest && (
            <span className="modal-new-best">New Best!</span>
          )}
        </div>

        {/* Personal best display */}
        {personalBest > 0 && !isNewBest && (
          <p className="modal-best">
            Personal Best: {personalBest.toLocaleString()}
          </p>
        )}

        {/* Games played milestone */}
        {gamesPlayed > 0 && gamesPlayed % 10 === 0 && (
          <p className="modal-milestone">
            {gamesPlayed} games played!
          </p>
        )}

        {/* Leaderboard rank preview - social proof motivation */}
        {configured && leaderboardRank !== null && (
          <div className="modal-rank-preview">
            <span className="modal-rank-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L10.09 5.26L14.75 5.94L11.375 9.23L12.18 13.87L8 11.67L3.82 13.87L4.625 9.23L1.25 5.94L5.91 5.26L8 1Z" fill="currentColor" />
              </svg>
            </span>
            <span className="modal-rank-text">
              {"You'd be "}
              <strong>{ordinal(leaderboardRank)}</strong>
              {" on today's board!"}
            </span>
          </div>
        )}

        {/* PRIMARY actions: Play Again / Keep Playing */}
        <div className="modal-primary-actions">
          <button
            type="button"
            className="modal-btn-play-again"
            onClick={onPlayAgain}
          >
            Play Again
          </button>
          {won && onKeepPlaying && (
            <button
              type="button"
              className="modal-btn-secondary"
              onClick={onKeepPlaying}
            >
              Keep Playing
            </button>
          )}
        </div>

        {/* SECONDARY: Sign-in for leaderboard (only if Supabase is configured) */}
        {configured && !showEmail && !emailSent && (
          <>
            <div className="modal-divider">or</div>

            {/* Google OAuth sign-in button */}
            <button
              type="button"
              className="modal-btn-google"
              onClick={handleGoogleSignIn}
            >
              <svg className="modal-btn-google-icon" width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div className="modal-divider">or</div>

            <button
              type="button"
              className="modal-btn-leaderboard"
              onClick={() => setShowEmail(true)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="modal-btn-icon">
                <path d="M4 12V10M8 12V8M12 12V6M2 4L8 2L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign in with email
            </button>
          </>
        )}

        {showEmail && !emailSent && (
          <div className="modal-email-section">
            <div className="modal-divider">sign in with email</div>
            <input
              type="email"
              className="modal-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMagicLink();
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-secondary"
                onClick={() => setShowEmail(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={handleSendMagicLink}
                disabled={sending || !email.trim()}
              >
                {sending ? "Sending..." : "Send Magic Link"}
              </button>
            </div>
          </div>
        )}

        {emailSent && (
          <div className="modal-email-section">
            <p className="modal-success">
              Check your email for a magic link!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
