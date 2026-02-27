"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Game2048 from "@/components/Game2048";
import MultiplayerView from "@/components/MultiplayerView";
import GameOverModal from "@/components/GameOverModal";
import DesktopSidebar from "@/components/DesktopSidebar";
import MobileMenu from "@/components/MobileMenu";
import UsernamePrompt from "@/components/UsernamePrompt";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { getPendingScore, clearPendingScore } from "@/lib/guest-scores";
import { ThemeName } from "@/lib/themes";
import { useSession, signOut, authClient, BetterAuthUser } from "@/lib/auth-client";
import { LeaderboardEntry } from "@/components/Leaderboard";

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
  const devEndGameRef = useRef<(() => void) | null>(null);
  const isDev = process.env.NODE_ENV === 'development';
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardEntry[]>([]);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [activeGridSize, setActiveGridSize] = useState<number>(4);
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [matchActive, setMatchActive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("classic");

  // Better Auth session
  const { data: sessionData, isPending: sessionLoading } = useSession();
  const session = sessionData?.session ?? null;
  const user = (sessionData?.user as BetterAuthUser | undefined) ?? null;

  // Read persisted theme on mount, then apply/persist on every change
  useEffect(() => {
    const saved = localStorage.getItem("2048_theme") as ThemeName | null;
    if (saved && saved !== theme) {
      setTheme(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("2048_theme", theme);
  }, [theme]);

  // Submit pending score when user signs in
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    async function submitPendingScore() {
      const pending = getPendingScore();
      if (!pending) return;

      const supabase = createClient();
      if (!supabase || !user) return;

      const username = user.username || user.email?.split("@")[0] || "Player";
      try {
        const { error } = await supabase.from("scores").insert({
          user_id: user.id,
          username,
          score: pending.score,
          grid_size: pending.gridSize,
        });
        if (!error) {
          clearPendingScore();
          setRefreshTrigger((n) => n + 1);
        } else {
          console.error("[page] Failed to submit pending score:", error.message);
        }
      } catch (err) {
        console.error("[page] Error submitting pending score:", err);
      }
    }

    submitPendingScore();
  }, [user]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Ignore errors
    }
  }, []);

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

  // Disable body scroll on mobile so the page never scrolls —
  // secondary content lives in the mobile menu drawer instead.
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    document.body.classList.add("mobile-no-scroll");
    return () => document.body.classList.remove("mobile-no-scroll");
  }, []);

  const confettiPieces = useMemo(() => generateConfettiPieces(35), [showConfetti]);

  const handleResetReady = useCallback((resetFn: () => void) => {
    gameResetRef.current = resetFn;
  }, []);

  // Save score to Supabase for signed-in users
  const saveScoreToSupabase = useCallback(async (score: number, gridSize: number) => {
    const supabase = createClient();
    if (!supabase || !user) return;
    const username = user.username || user.email?.split("@")[0] || "Player";
    try {
      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        username,
        score,
        grid_size: gridSize,
      });
      if (error) {
        console.error("[page] Failed to save score:", error.message);
      } else {
        setRefreshTrigger((n) => n + 1);
      }
    } catch (err) {
      console.error("[page] Error saving score:", err);
    }
  }, [user]);

  const handleGameOver = useCallback((score: number, gridSize: number) => {
    setCurrentScore(score);
    setGameResult({ open: true, won: false, score, gridSize });
    saveScoreToSupabase(score, gridSize);
  }, [saveScoreToSupabase]);

  const handleGameWon = useCallback((score: number, gridSize: number) => {
    setCurrentScore(score);
    setGameResult({ open: true, won: true, score, gridSize });
    setShowConfetti(true);
    saveScoreToSupabase(score, gridSize);
  }, [saveScoreToSupabase]);

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

  const handleScoresLoaded = useCallback((scores: LeaderboardEntry[]) => {
    setLeaderboardScores(scores);
  }, []);

  const handleGridSizeChange = useCallback((newSize: number) => {
    const wasSingle = gameMode === 'single';
    setActiveGridSize(newSize);
    setGameMode('single');
    setMatchActive(false);

    if (wasSingle) {
      // Already in single-player mode — only toggle size if it actually changed
      const gameContainer = document.querySelector(".game-container") as HTMLElement | null;
      if (gameContainer) {
        const getSize = (gameContainer as unknown as Record<string, () => number>)._getSize;
        const currentSize = getSize?.() ?? 4;
        if (currentSize !== newSize) {
          const toggleSize = (gameContainer as unknown as Record<string, (s: number) => void>)._toggleSize;
          toggleSize?.(newSize);
        }
      }
    }
    // When switching from multi → single, Game2048 will mount fresh
    // and use the initialSize prop (set via activeGridSize)
  }, [gameMode]);

  return (
    <div className="page-layout">
      {/* Desktop sidebar — hidden on mobile */}
      <DesktopSidebar
        user={user}
        currentScore={currentScore}
        activeGridSize={activeGridSize}
        refreshTrigger={refreshTrigger}
        onSignOut={handleSignOut}
        theme={theme}
        onThemeChange={setTheme}
        onScoresLoaded={handleScoresLoaded}
      />

      <div className={`container${gameMode === 'single' && activeGridSize === 8 ? ' container-wide' : ''}`}>
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

        {/* Title - hidden when match is active to save space */}
        {!matchActive && (
          <div className="title-section">
            <h1 className="game-title">2048</h1>
            <p className="game-intro">Join the tiles, get to <strong>2048!</strong></p>
          </div>
        )}

        {/* Game Mode / Grid Controls - hidden during active match */}
        {!matchActive && (
          <div className="below-board-controls" style={{ marginBottom: "20px" }}>
            <div className="grid-size-control" style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`grid-size-option${activeGridSize === 4 && gameMode === 'single' ? " grid-size-active" : ""}`}
                onClick={() => handleGridSizeChange(4)}
              >
                4&times;4 Single
              </button>
              {isSupabaseConfigured() && (
                <button
                  className={`grid-size-option${gameMode === 'multi' ? " grid-size-active" : ""}`}
                  onClick={() => { setActiveGridSize(4); setGameMode('multi'); }}
                >
                  4&times;4 Multi
                </button>
              )}
              <button
                className={`grid-size-option${activeGridSize === 8 && gameMode === 'single' ? " grid-size-active" : ""}`}
                onClick={() => handleGridSizeChange(8)}
              >
                8&times;8 Single
              </button>
            </div>
          </div>
        )}

        {gameMode === 'single' ? (
          <>
            <div style={{ position: "relative", touchAction: "none", display: "flex", justifyContent: "center" }}>
              <Game2048 onGameOver={handleGameOver} onGameWon={handleGameWon} onResetReady={handleResetReady} initialSize={activeGridSize} themeName={theme} onDevEndGameReady={isDev ? (fn) => { devEndGameRef.current = fn; } : undefined} />

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
          </>
        ) : (
          <MultiplayerView onMatchActiveChange={setMatchActive} />
        )}

        <p className="game-hint desktop-hint">
          Use your <strong>arrow keys</strong> to move the tiles.
        </p>

        {/* Mobile menu — hamburger + drawer with leaderboard, auth, how to play */}
        <MobileMenu
          user={user}
          currentScore={currentScore}
          activeGridSize={activeGridSize}
          refreshTrigger={refreshTrigger}
          onSignOut={handleSignOut}
          onSignIn={() => setShowSignInModal(true)}
          theme={theme}
          onThemeChange={setTheme}
        />

        <UsernamePrompt />

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
            isSignedIn={!!user}
          />
        )}
      </div>
    </div>
  );
}
