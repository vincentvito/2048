"use client";

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

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
  gameMode: 'ranked' | 'friendly';
  localEloDelta: number | null;
  localEloAfter: number | null;
  localEloRank: { name: string } | null;
  localWantsRematch: boolean;
  opponentWantsRematch: boolean;
  onRequestRematch: () => void;
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
  onRequestRematch,
  onNewOpponent,
  onLeave,
}: MatchResultModalProps) {
  const eloChangeClass = isTie
    ? 'mp-elo-change mp-elo-change-neutral'
    : localWon
      ? 'mp-elo-change mp-elo-change-positive'
      : 'mp-elo-change mp-elo-change-negative';

  return (
    <Modal open={show} labelledBy="match-result-title" className="mp-result-card-inner">
      <div className={`mp-result-banner ${resultBannerClass}`}>
        <h2 id="match-result-title" className="mp-result-title">{resultTitle}</h2>
        {resultSubtitle && (
          <p className={`mp-result-subtitle ${hasForfeit ? 'mp-result-forfeit-text' : ''}`}>
            {resultSubtitle}
          </p>
        )}
      </div>

      <div className="mp-result-scores">
        <div className={`mp-score-column ${localWon && !isTie ? 'mp-score-winner' : ''}`}>
          <span className="mp-score-name">{myName}</span>
          <span className="mp-score-value">{myScore.toLocaleString()}</span>
          {localWon && !isTie && <span className="mp-score-badge">Winner</span>}
        </div>
        <div className="mp-score-vs">VS</div>
        <div className={`mp-score-column ${!localWon && !isTie ? 'mp-score-winner' : ''}`}>
          <span className="mp-score-name">{opponentName}</span>
          <span className="mp-score-value">{opponentScore.toLocaleString()}</span>
          {!localWon && !isTie && <span className="mp-score-badge">Winner</span>}
        </div>
      </div>

      {gameMode === 'ranked' && localEloDelta !== null && (
        <div className="mp-elo-section">
          <span className={eloChangeClass}>
            {localEloDelta >= 0 ? '+' : ''}{localEloDelta} ELO
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

      {gameMode === 'friendly' && (
        <p className="mp-friendly-label">Friendly Match — no ELO change</p>
      )}

      {opponentWantsRematch && !localWantsRematch && (
        <p className="mp-rematch-hint">{opponentName} wants a rematch!</p>
      )}

      <div className="mp-result-actions-stack">
        <Button
          variant="primary"
          fullWidth
          onClick={onRequestRematch}
          disabled={localWantsRematch}
        >
          {localWantsRematch
            ? opponentWantsRematch ? 'Starting...' : 'Waiting for opponent...'
            : 'Rematch'}
        </Button>
        <div className="mp-result-actions-row">
          {gameMode === 'ranked' && (
            <Button variant="secondary" onClick={onNewOpponent}>New Opponent</Button>
          )}
          <Button variant="secondary" onClick={onLeave}>Menu</Button>
        </div>
      </div>
    </Modal>
  );
}
