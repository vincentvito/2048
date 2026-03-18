"use client";

import React, { useState, useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import {
  getPersonalBest,
  savePersonalBest,
  incrementGamesPlayed,
  recordScore,
  savePendingScore,
} from "@/lib/guest-scores";
import EmailSignIn from "./EmailSignIn";
import { LeaderboardEntry } from "./Leaderboard";
import Modal from "@/components/ui/Modal";

interface GameOverModalProps {
  open: boolean;
  won: boolean;
  score: number;
  gridSize: number;
  onClose: () => void;
  onPlayAgain: () => void;
  onKeepPlaying?: () => void;
  leaderboardScores?: LeaderboardEntry[];
  isSignedIn?: boolean;
  boardScreenshot?: string;
  currentUsername?: string;
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
  boardScreenshot,
  currentUsername,
}: GameOverModalProps): React.ReactElement | null {
  const [showEmail, setShowEmail] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [rankContext, setRankContext] = useState<{
    above: LeaderboardEntry | null;
    below: LeaderboardEntry | null;
  } | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setShowEmail(false);

      const best = getPersonalBest(gridSize);
      const newBest = savePersonalBest(gridSize, score);
      setPersonalBest(Math.max(best, score));
      setIsNewBest(newBest);

      const count = incrementGamesPlayed();
      setGamesPlayed(count);
      recordScore(score, gridSize);

      if (leaderboardScores && leaderboardScores.length > 0) {
        const rank = leaderboardScores.filter((s) => s.score > score).length + 1;
        if (rank <= 20) {
          setLeaderboardRank(rank);
          const others = [...leaderboardScores]
            .filter((s) => !currentUsername || s.username !== currentUsername)
            .sort((a, b) => b.score - a.score);
          const aboveEntries = others.filter((s) => s.score > score);
          setRankContext({
            above: aboveEntries.length > 0 ? aboveEntries[aboveEntries.length - 1] : null,
            below: others.find((s) => s.score <= score) || null,
          });
        } else {
          setLeaderboardRank(null);
          setRankContext(null);
        }
      } else {
        if (isSupabaseConfigured()) {
          setLeaderboardRank(1);
          setRankContext(null);
        } else {
          setLeaderboardRank(null);
          setRankContext(null);
        }
      }
    }
  }, [open, score, gridSize, leaderboardScores, currentUsername]);

  const handleShare = async () => {
    const text = won
      ? `I reached 2048 with a score of ${score.toLocaleString()}! Can you beat it?\nhttps://the2048league.com`
      : `I scored ${score.toLocaleString()} in 2048! Can you beat my score?\nhttps://the2048league.com`;

    const getImageFile = async (): Promise<File | null> => {
      if (!boardScreenshot) return null;
      try {
        const response = await fetch(boardScreenshot);
        const blob = await response.blob();
        return new File([blob], "2048-board.png", { type: "image/png" });
      } catch {
        return null;
      }
    };

    if (navigator.share) {
      try {
        const imageFile = await getImageFile();
        if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({ text, files: [imageFile] });
        } else {
          await navigator.share({ text });
        }
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  const configured = isSupabaseConfigured();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="game-result-title"
      describedBy="game-result-score"
    >
      <div className={`modal-result-banner ${won ? "modal-result-win" : "modal-result-lose"}`}>
        <h2 id="game-result-title" className="modal-result">
          {won ? "You Win!" : "Game Over"}
        </h2>
      </div>

      <div id="game-result-score" className="modal-score">
        {score.toLocaleString()}
      </div>

      <div className="modal-meta">
        <span className="modal-badge">
          {gridSize}&times;{gridSize}
        </span>
        {isNewBest && <span className="modal-new-best">New Best!</span>}
      </div>

      {personalBest > 0 && !isNewBest && (
        <p className="modal-best">Personal Best: {personalBest.toLocaleString()}</p>
      )}

      {gamesPlayed > 0 && gamesPlayed % 10 === 0 && (
        <p className="modal-milestone">{gamesPlayed} games played!</p>
      )}

      {configured && leaderboardRank !== null && (
        <div className="modal-rank-context">
          <div className="modal-rank-header">
            <span className="modal-rank-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1L10.09 5.26L14.75 5.94L11.375 9.23L12.18 13.87L8 11.67L3.82 13.87L4.625 9.23L1.25 5.94L5.91 5.26L8 1Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="modal-rank-text">
              {isSignedIn ? (
                <>
                  <strong>{ordinal(leaderboardRank)}</strong>
                  {" on today's board!"}
                </>
              ) : (
                <>
                  {"You'd be "}
                  <strong>{ordinal(leaderboardRank)}</strong>
                  {" on today's board!"}
                </>
              )}
            </span>
          </div>
          {rankContext && (rankContext.above || rankContext.below) && (
            <div className="modal-rank-list">
              {rankContext.above && (
                <div className="modal-rank-row modal-rank-row-other">
                  <span className="modal-rank-pos">{ordinal(leaderboardRank - 1)}</span>
                  <span className="modal-rank-name">{rankContext.above.username}</span>
                  <span className="modal-rank-score">
                    {rankContext.above.score.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="modal-rank-row modal-rank-row-you">
                <span className="modal-rank-pos">{ordinal(leaderboardRank)}</span>
                <span className="modal-rank-name">You</span>
                <span className="modal-rank-score">{score.toLocaleString()}</span>
              </div>
              {rankContext.below && (
                <div className="modal-rank-row modal-rank-row-other">
                  <span className="modal-rank-pos">{ordinal(leaderboardRank + 1)}</span>
                  <span className="modal-rank-name">{rankContext.below.username}</span>
                  <span className="modal-rank-score">
                    {rankContext.below.score.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="modal-primary-actions">
        <button type="button" className="modal-btn-play-again" onClick={onPlayAgain}>
          Play Again
        </button>
        {won && onKeepPlaying && (
          <button type="button" className="modal-btn-secondary" onClick={onKeepPlaying}>
            Keep Playing
          </button>
        )}
      </div>

      <button
        type="button"
        className={`modal-btn-share${shareCopied ? " modal-btn-share-copied" : ""}`}
        onClick={handleShare}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {shareCopied ? "Copied!" : "Share"}
      </button>

      {configured && !isSignedIn && !showEmail && (
        <>
          <div className="modal-divider">or</div>
          <button
            type="button"
            className="modal-btn-leaderboard"
            onClick={() => setShowEmail(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="modal-btn-icon">
              <path
                d="M4 12V10M8 12V8M12 12V6M2 4L8 2L14 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
    </Modal>
  );
}
