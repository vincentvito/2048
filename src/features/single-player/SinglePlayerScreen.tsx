"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import Game2048, { type Game2048Handle } from "@/components/Game2048";
import GameOverModal from "@/components/GameOverModal";
import { saveScore } from "@/lib/score-service";
import { useTheme } from "@/features/theme/ThemeProvider";
import { type AppUser } from "@/features/auth/types";
import { LeaderboardEntry } from "@/components/Leaderboard";
import { useParticles } from "@/components/EmojiParticles";
import { useWebHaptics } from "web-haptics/react";
import { isHapticsEnabled } from "@/hooks/useHapticsEnabled";

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

/** Handle exposed to parent for grid size toggling. */
export interface SinglePlayerHandle {
  getSize: () => number;
  toggleSize: (newSize: number) => void;
}

const SinglePlayerScreen = forwardRef<SinglePlayerHandle, SinglePlayerScreenProps>(
  function SinglePlayerScreen(
    { user, activeGridSize, refreshTrigger, onRefresh, onScoreChange, leaderboardScores },
    ref
  ) {
    const { theme } = useTheme();
    const { burst } = useParticles();
    const haptic = useWebHaptics();
    const triggerHaptic = useCallback(
      (preset: "light" | "medium" | "heavy" | "selection" | "success" | "error") => {
        if (isHapticsEnabled()) haptic.trigger(preset);
      },
      [haptic]
    );
    const gameRef = useRef<Game2048Handle>(null);
    const gameResetRef = useRef<(() => void) | null>(null);
    const devEndGameRef = useRef<(() => void) | null>(null);
    const devTriggerWinRef = useRef<(() => void) | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        getSize: () => gameRef.current?.getSize() ?? 4,
        toggleSize: (newSize: number) => gameRef.current?.toggleSize(newSize),
      }),
      []
    );
    const isDev = process.env.NODE_ENV === "development";

    const [gameResult, setGameResult] = useState<{
      open: boolean;
      won: boolean;
      score: number;
      gridSize: number;
      boardScreenshot?: string;
    } | null>(null);
    // Track the unsaved winning score so we can submit it if the player resets
    // before the game naturally ends.
    const unsavedWinRef = useRef<{ score: number; gridSize: number } | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showSwipeHint, setShowSwipeHint] = useState(false);

    // Show swipe hint on first mobile visit (always in dev for debugging)
    useEffect(() => {
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const hasSeenHint = localStorage.getItem("2048_swipe_hint_seen");
      if (isDev || (isTouchDevice && !hasSeenHint)) {
        setShowSwipeHint(true);
        if (!isDev) localStorage.setItem("2048_swipe_hint_seen", "1");
        const timer = setTimeout(() => setShowSwipeHint(false), 5000);
        return () => clearTimeout(timer);
      }
    }, [isDev]);

    const confettiPieces = useMemo(() => generateConfettiPieces(35), [showConfetti]);

    const handleResetReady = useCallback((resetFn: () => void) => {
      gameResetRef.current = resetFn;
    }, []);

    const saveScoreToSupabase = useCallback(
      async (score: number, gridSize: number) => {
        if (!user) return;
        const success = await saveScore(user, score, gridSize);
        if (success) onRefresh();
      },
      [user, onRefresh]
    );

    const captureBoardScreenshot = useCallback((): string | undefined => {
      return gameRef.current?.getCanvasDataURL() ?? undefined;
    }, []);

    const handleGameOver = useCallback(
      (score: number, gridSize: number) => {
        const boardScreenshot = captureBoardScreenshot();
        onScoreChange(score);
        setGameResult({ open: true, won: false, score, gridSize, boardScreenshot });
        unsavedWinRef.current = null; // game ended naturally — save the final score
        saveScoreToSupabase(score, gridSize);

        // Check if this score beats today's leaderboard best
        const dailyBest = leaderboardScores.length > 0 ? leaderboardScores[0].score : 0;
        if (score > dailyBest && dailyBest > 0) {
          burst("dailyBest");
          triggerHaptic("heavy");
        } else {
          burst("gameOver");
          triggerHaptic("error");
        }
      },
      [saveScoreToSupabase, captureBoardScreenshot, onScoreChange, leaderboardScores, burst, triggerHaptic]
    );

    const handleGameWon = useCallback(
      (score: number, gridSize: number) => {
        const boardScreenshot = captureBoardScreenshot();
        onScoreChange(score);
        setGameResult({ open: true, won: true, score, gridSize, boardScreenshot });
        setShowConfetti(true);
        // Don't save yet — the player may keep playing and reach a higher score.
        // Track it so we can save if they reset without hitting game over.
        unsavedWinRef.current = { score, gridSize };

        burst("win");
        triggerHaptic("success");
      },
      [captureBoardScreenshot, onScoreChange, burst, triggerHaptic]
    );

    const handleMoveFeedback = useCallback(
      (maxMerge: number, moved: boolean) => {
        if (!moved || maxMerge === 0) return;
        if (maxMerge >= 256) {
          triggerHaptic("medium");
        } else {
          triggerHaptic("selection");
        }
      },
      [triggerHaptic]
    );

    /** Save the unsaved winning score (if any) before starting a new game. */
    const flushUnsavedWin = useCallback(() => {
      const pending = unsavedWinRef.current;
      if (pending) {
        unsavedWinRef.current = null;
        saveScoreToSupabase(pending.score, pending.gridSize);
      }
    }, [saveScoreToSupabase]);

    useEffect(() => {
      if (!showConfetti) return;
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    }, [showConfetti]);

    return (
      <>
        {/* Confetti overlay */}
        {showConfetti && (
          <div className="confetti-container" aria-hidden="true">
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

        <div
          style={{
            position: "relative",
            touchAction: "none",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Game2048
            ref={gameRef}
            onGameOver={handleGameOver}
            onGameWon={handleGameWon}
            onMoveFeedback={handleMoveFeedback}
            onResetReady={handleResetReady}
            initialSize={activeGridSize}
            themeName={theme}
            onDevEndGameReady={
              isDev
                ? (fn) => {
                    devEndGameRef.current = fn;
                  }
                : undefined
            }
            onDevTriggerWinReady={
              isDev
                ? (fn) => {
                    devTriggerWinRef.current = fn;
                  }
                : undefined
            }
          />

          {showSwipeHint && (
            <div className="swipe-hint-overlay" onClick={() => setShowSwipeHint(false)}>
              <div className="swipe-hint-content">
                <div className="swipe-hint-hand">
                  <span className="swipe-hint-emoji">👆</span>
                </div>
                <p className="swipe-hint-text">Swipe to move tiles</p>
              </div>
            </div>
          )}
        </div>

        <div className="below-board-controls">
          <button
            className="header-new-game-btn"
            onClick={() => {
              flushUnsavedWin();
              gameResetRef.current?.();
            }}
          >
            New Game
          </button>
          {isDev && (
            <>
              <button
                className="header-new-game-btn"
                style={{ background: "var(--color-success)" }}
                onClick={() => devTriggerWinRef.current?.()}
              >
                DEV: Win Setup
              </button>
              <button
                className="header-new-game-btn"
                style={{ background: "var(--color-danger)" }}
                onClick={() => devEndGameRef.current?.()}
              >
                DEV: End Game
              </button>
            </>
          )}
        </div>

        {gameResult && (
          <GameOverModal
            open={gameResult.open}
            won={gameResult.won}
            score={gameResult.score}
            gridSize={gameResult.gridSize}
            onClose={() => setGameResult(null)}
            onPlayAgain={() => {
              flushUnsavedWin();
              setGameResult(null);
              gameResetRef.current?.();
            }}
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
);

export default SinglePlayerScreen;
