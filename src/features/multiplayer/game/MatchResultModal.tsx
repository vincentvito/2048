"use client";

import React, { useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

/** Generate confetti pieces for win celebration */
function generateConfetti(count: number) {
  const colors = ["#fbbf24", "#f59e0b", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 5,
    rotation: Math.random() * 360,
    delay: Math.random() * 1.2,
    drift: -25 + Math.random() * 50,
    duration: 1.8 + Math.random() * 1,
  }));
}

interface MatchResultModalProps {
  show: boolean;
  resultTitle: string;
  resultSubtitle: string | null;
  resultBannerClass: string;
  myName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  localWon: boolean;
  isTie: boolean;
  hasForfeit: boolean;
  gameMode: "ranked" | "friendly";
  localEloDelta: number | null;
  localEloAfter: number | null;
  localEloRank: { name: string } | null;
  localWantsRematch: boolean;
  opponentWantsRematch: boolean;
  opponentConnected: boolean;
  inviteUrl?: string;
  onRequestRematch: () => void;
  onShareInvite?: () => void;
  onNewOpponent: () => void;
  onLeave: () => void;
}

export default function MatchResultModal({
  show,
  resultTitle,
  resultSubtitle,
  resultBannerClass,
  myName,
  opponentName,
  myScore,
  opponentScore,
  localWon,
  isTie,
  hasForfeit,
  gameMode,
  localEloDelta,
  localEloAfter,
  localEloRank,
  localWantsRematch,
  opponentWantsRematch,
  opponentConnected,
  inviteUrl,
  onRequestRematch,
  onShareInvite,
  onNewOpponent,
  onLeave,
}: MatchResultModalProps) {
  const eloChangeClass = isTie
    ? "mp-elo-change mp-elo-change-neutral"
    : localWon
      ? "mp-elo-change mp-elo-change-positive"
      : "mp-elo-change mp-elo-change-negative";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const confettiPieces = useMemo(() => generateConfetti(30), [show, localWon]);

  return (
    <Modal open={show} labelledBy="match-result-title" className="mp-result-card-inner">
      {localWon && !isTie && (
        <div className="confetti-container" aria-hidden="true">
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.5}px`,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                // @ts-expect-error CSS custom property for drift
                "--confetti-drift": `${p.drift}px`,
              }}
            />
          ))}
        </div>
      )}
      <div className={`mp-result-banner ${resultBannerClass}`}>
        <h2 id="match-result-title" className="mp-result-title">
          {resultTitle}
        </h2>
        {resultSubtitle && (
          <p className={`mp-result-subtitle ${hasForfeit ? "mp-result-forfeit-text" : ""}`}>
            {resultSubtitle}
          </p>
        )}
      </div>

      <div className="mp-result-scores">
        <div className={`mp-score-column ${localWon && !isTie ? "mp-score-winner" : ""}`}>
          <span className="mp-score-name">{myName}</span>
          <span className="mp-score-value">{myScore.toLocaleString()}</span>
          {localWon && !isTie && <span className="mp-score-badge">Winner</span>}
        </div>
        <div className="mp-score-vs">VS</div>
        <div className={`mp-score-column ${!localWon && !isTie ? "mp-score-winner" : ""}`}>
          <span className="mp-score-name">{opponentName}</span>
          <span className="mp-score-value">{opponentScore.toLocaleString()}</span>
          {!localWon && !isTie && <span className="mp-score-badge">Winner</span>}
        </div>
      </div>

      {gameMode === "ranked" && localEloDelta !== null && (
        <div className="mp-elo-section">
          <span className={eloChangeClass}>
            {localEloDelta >= 0 ? "+" : ""}
            {localEloDelta} ELO
          </span>
          {localEloRank && localEloAfter !== null && (
            <div className="mp-elo-rank-row" style={{ padding: 0 }}>
              <span className={`elo-rank-badge elo-rank-${localEloRank.name.toLowerCase()}`}>
                {localEloRank.name}
              </span>
              <span className="mp-elo-rating">{localEloAfter} ELO</span>
            </div>
          )}
        </div>
      )}

      {gameMode === "friendly" && (
        <p className="mp-friendly-label">Friendly Match — no ELO change</p>
      )}

      {opponentWantsRematch && !localWantsRematch && (
        <p className="mp-rematch-hint" role="status" aria-live="polite">
          {opponentName} wants a rematch!
        </p>
      )}

      <div className="mp-result-actions-stack">
        <Button variant="primary" fullWidth onClick={onRequestRematch} disabled={localWantsRematch}>
          {localWantsRematch
            ? opponentWantsRematch
              ? "Starting..."
              : "Waiting for opponent..."
            : "Rematch"}
        </Button>
        {localWantsRematch && !opponentConnected && gameMode === "friendly" && onShareInvite && (
          <>
            <p className="mp-rematch-hint">Opponent left — share the link to invite them back</p>
            <Button variant="secondary" fullWidth onClick={onShareInvite}>
              Share Invite Link
            </Button>
          </>
        )}
        <div className="mp-result-actions-row">
          {gameMode === "ranked" && (
            <Button variant="secondary" onClick={onNewOpponent}>
              New Opponent
            </Button>
          )}
          <Button variant="secondary" onClick={onLeave}>
            Menu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
