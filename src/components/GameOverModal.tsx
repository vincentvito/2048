"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import {
  getPersonalBest,
  savePersonalBest,
  incrementGamesPlayed,
  recordScore,
  savePendingScore,
} from "@/lib/guest-scores";
import EmailSignIn from "./EmailSignIn";

interface GameOverModalProps {
  open: boolean;
  won: boolean;
  score: number;
  gridSize: number;
  onClose: () => void;
  onPlayAgain: () => void;
  onKeepPlaying?: () => void;
  leaderboardScores?: number[];
  isSignedIn?: boolean;
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
  isSignedIn,
}: GameOverModalProps): React.ReactElement | null {
  const [showEmail, setShowEmail] = useState(false);
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
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
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
        if (rank <= 20) {
          setLeaderboardRank(rank);
        } else {
          setLeaderboardRank(null);
        }
      } else {
        if (isSupabaseConfigured()) {
          setLeaderboardRank(1);
        } else {
          setLeaderboardRank(null);
        }
      }
    }
  }, [open, score, gridSize, leaderboardScores]);

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

        {/* SECONDARY: Sign-in for leaderboard (only if Supabase is configured and not already signed in) */}
        {configured && !isSignedIn && !showEmail && (
          <>
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

        {configured && !isSignedIn && showEmail && (
          <EmailSignIn
            variant="modal"
            onBeforeSend={() => savePendingScore(score, gridSize)}
            onCancel={() => setShowEmail(false)}
          />
        )}
      </div>
    </div>
  );
}
