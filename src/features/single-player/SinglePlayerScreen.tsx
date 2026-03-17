"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Game2048, { type Game2048Handle } from "@/components/Game2048";
import GameOverModal from "@/components/GameOverModal";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { useTheme } from "@/features/theme/ThemeProvider";
import { type AppUser, getDisplayName } from "@/features/auth/types";
import { LeaderboardEntry } from "@/components/Leaderboard";

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

interface SinglePlayerScreenProps {
  user: AppUser | null;
  activeGridSize: number;
  refreshTrigger: number;
  onRefresh: () => void;
  onScoreChange: (score: number) => void;
  leaderboardScores: LeaderboardEntry[];
}

export default function SinglePlayerScreen({
  user,
  activeGridSize,
  refreshTrigger,
  onRefresh,
  onScoreChange,
  leaderboardScores,
}: SinglePlayerScreenProps) {
  const { theme } = useTheme();
  const gameRef = useRef<Game2048Handle>(null);
  const gameResetRef = useRef<(() => void) | null>(null);
  const devEndGameRef = useRef<(() => void) | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  const [gameResult, setGameResult] = useState<{
    open: boolean;
    won: boolean;
    score: number;
    gridSize: number;
    boardScreenshot?: string;
  } | null>(null);
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

  const saveScoreToSupabase = useCallback(async (score: number, gridSize: number) => {
    const supabase = createClient();
    if (!supabase || !user) return;
    const username = getDisplayName(user);
    try {
      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        username,
        score,
        grid_size: gridSize,
      });
      if (!error) onRefresh();
    } catch {
      // best-effort
    }
  }, [user, onRefresh]);

  const captureBoardScreenshot = useCallback((): string | undefined => {
    return gameRef.current?.getCanvasDataURL() ?? undefined;
  }, []);

  const handleGameOver = useCallback((score: number, gridSize: number) => {
    const boardScreenshot = captureBoardScreenshot();
    onScoreChange(score);
    setGameResult({ open: true, won: false, score, gridSize, boardScreenshot });
    saveScoreToSupabase(score, gridSize);
  }, [saveScoreToSupabase, captureBoardScreenshot, onScoreChange]);

  const handleGameWon = useCallback((score: number, gridSize: number) => {
    const boardScreenshot = captureBoardScreenshot();
    onScoreChange(score);
    setGameResult({ open: true, won: true, score, gridSize, boardScreenshot });
    setShowConfetti(true);
    saveScoreToSupabase(score, gridSize);
  }, [saveScoreToSupabase, captureBoardScreenshot, onScoreChange]);

  useEffect(() => {
    if (!showConfetti) return;
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, [showConfetti]);

  /** Expose the Game2048Handle so the parent can call toggleSize. */
  const getGameRef = useCallback(() => gameRef.current, []);
  // Attach to window-level for parent access via callback
  // (parent uses handleGridSizeChange which needs getSize/toggleSize)
  React.useEffect(() => {
    (SinglePlayerScreen as any)._gameRef = gameRef;
  });

  return (
    <>
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

      <div style={{ position: "relative", touchAction: "none", display: "flex", justifyContent: "center" }}>
        <Game2048
          ref={gameRef}
          onGameOver={handleGameOver}
          onGameWon={handleGameWon}
          onResetReady={handleResetReady}
          initialSize={activeGridSize}
          themeName={theme}
          onDevEndGameReady={isDev ? (fn) => { devEndGameRef.current = fn; } : undefined}
        />

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

      <div className="below-board-controls">
        <button className="header-new-game-btn" onClick={() => gameResetRef.current?.()}>
          New Game
        </button>
        {isDev && (
          <button className="header-new-game-btn" style={{ background: '#dc2626' }} onClick={() => devEndGameRef.current?.()}>
            DEV: End Game
          </button>
        )}
      </div>

      {gameResult && (
        <GameOverModal
          open={gameResult.open}
          won={gameResult.won}
          score={gameResult.score}
          gridSize={gameResult.gridSize}
          onClose={() => setGameResult(null)}
          onPlayAgain={() => { setGameResult(null); gameResetRef.current?.(); }}
          onKeepPlaying={gameResult.won ? () => setGameResult(null) : undefined}
          leaderboardScores={leaderboardScores}
          isSignedIn={!!user}
          boardScreenshot={gameResult.boardScreenshot}
          currentUsername={user?.username || user?.email?.split("@")[0]}
        />
      )}
    </>
  );
}
