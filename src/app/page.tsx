"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Game2048 from "@/components/Game2048";
import GameOverModal from "@/components/GameOverModal";
import Leaderboard from "@/components/Leaderboard";
import HowToPlay from "@/components/HowToPlay";

// Generate confetti pieces with random properties (memoized outside component)
function generateConfettiPieces(count: number) {
  const colors = ["#edc22e", "#f2b179", "#f67c5f", "#e8d4b0", "#8f7a66"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    delay: Math.random() * 1.5,
    drift: -30 + Math.random() * 60,
    duration: 2 + Math.random() * 1,
  }));
}

export default function Home(): React.ReactElement {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [gameResult, setGameResult] = useState<{
    open: boolean;
    won: boolean;
    score: number;
    gridSize: number;
  } | null>(null);
  const gameResetRef = useRef<(() => void) | null>(null);
  const [leaderboardScores, setLeaderboardScores] = useState<number[]>([]);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [activeGridSize, setActiveGridSize] = useState<number>(4);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Show swipe hint on first mobile visit
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const hasSeenHint = localStorage.getItem("2048_swipe_hint_seen");
    if (isTouchDevice && !hasSeenHint) {
      setShowSwipeHint(true);
      localStorage.setItem("2048_swipe_hint_seen", "1");
      const timer = setTimeout(() => setShowSwipeHint(false), 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const confettiPieces = useMemo(() => generateConfettiPieces(35), [showConfetti]);

  const handleResetReady = useCallback((resetFn: () => void) => {
    gameResetRef.current = resetFn;
  }, []);

  const handleGameOver = useCallback((score: number, gridSize: number) => {
    setCurrentScore(score);
    setGameResult({ open: true, won: false, score, gridSize });
  }, []);

  const handleGameWon = useCallback((score: number, gridSize: number) => {
    setCurrentScore(score);
    setGameResult({ open: true, won: true, score, gridSize });
    setShowConfetti(true);
  }, []);

  // Auto-hide confetti after animation completes
  useEffect(() => {
    if (!showConfetti) return;
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, [showConfetti]);

  const handleClose = useCallback(() => {
    setGameResult(null);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameResult(null);
    gameResetRef.current?.();
  }, []);

  const handleKeepPlaying = useCallback(() => {
    setGameResult(null);
  }, []);

  const handleScoresLoaded = useCallback((scores: number[]) => {
    setLeaderboardScores(scores);
  }, []);

  const handleGridSizeChange = useCallback((newSize: number) => {
    setActiveGridSize(newSize);
    // Reach into the Game2048 component's internal DOM-attached function
    const gameContainer = document.querySelector(".game-container") as HTMLElement | null;
    if (gameContainer) {
      const toggleSize = (gameContainer as unknown as Record<string, (s: number) => void>)._toggleSize;
      toggleSize?.(newSize);
    }
  }, []);

  return (
    <div className="container">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="confetti-container">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${piece.size * 1.5}px`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                // @ts-expect-error CSS custom property for drift
                "--confetti-drift": `${piece.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Title only */}
      <div className="title-section">
        <h1 className="game-title">2048</h1>
        <p className="game-intro">Join the tiles, get to <strong>2048!</strong></p>
      </div>

      {/* Hero: The game board */}
      <div style={{ position: "relative" }}>
        <Game2048 onGameOver={handleGameOver} onGameWon={handleGameWon} onResetReady={handleResetReady} />

        {/* First-visit swipe tutorial overlay (mobile only) */}
        {showSwipeHint && (
          <div className="swipe-hint-overlay" onClick={() => setShowSwipeHint(false)}>
            <div className="swipe-hint-content">
              <div className="swipe-hint-hand">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a4 4 0 0 0-4 4v6.5" />
                  <path d="M8 11.5V18a4 4 0 0 0 4 4h1a5 5 0 0 0 5-5v-5" />
                  <path d="M12 1a4 4 0 0 1 4 4v8" />
                </svg>
              </div>
              <div className="swipe-hint-arrows">
                <span className="swipe-arrow swipe-arrow-left">&larr;</span>
                <span className="swipe-arrow swipe-arrow-right">&rarr;</span>
                <span className="swipe-arrow swipe-arrow-up">&uarr;</span>
                <span className="swipe-arrow swipe-arrow-down">&darr;</span>
              </div>
              <p className="swipe-hint-text">Swipe to move tiles</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls below the board: grid toggle + new game */}
      <div className="below-board-controls">
        <div className="grid-size-control">
          <button
            className={`grid-size-option${activeGridSize === 4 ? " grid-size-active" : ""}`}
            onClick={() => handleGridSizeChange(4)}
          >
            4&times;4
          </button>
          <button
            className={`grid-size-option${activeGridSize === 8 ? " grid-size-active" : ""}`}
            onClick={() => handleGridSizeChange(8)}
          >
            8&times;8
          </button>
        </div>
        <button
          className="header-new-game-btn"
          onClick={() => gameResetRef.current?.()}
        >
          New Game
        </button>
      </div>

      <p className="game-hint desktop-hint">
        Use your <strong>arrow keys</strong> to move the tiles.
      </p>
      <p className="game-hint mobile-hint">
        <strong>Swipe</strong> to move the tiles.
      </p>

      {/* Supporting content below the fold */}
      <div className="bottom-section">
        <HowToPlay />

        <div className="leaderboard-section">
          <h2 className="section-title">Leaderboard</h2>
          <Leaderboard
            refreshTrigger={refreshTrigger}
            onScoresLoaded={handleScoresLoaded}
            currentScore={currentScore}
            gridSize={activeGridSize}
          />
        </div>
      </div>

      {/* Game over / win modal */}
      {gameResult && (
        <GameOverModal
          open={gameResult.open}
          won={gameResult.won}
          score={gameResult.score}
          gridSize={gameResult.gridSize}
          onClose={handleClose}
          onPlayAgain={handlePlayAgain}
          onKeepPlaying={gameResult.won ? handleKeepPlaying : undefined}
          leaderboardScores={leaderboardScores}
        />
      )}
    </div>
  );
}
