"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import SinglePlayerScreen from "@/features/single-player/SinglePlayerScreen";
import MultiplayerView from "@/components/MultiplayerView";
import DesktopSidebar from "@/components/DesktopSidebar";
import MobileMenu from "@/components/MobileMenu";
import UsernamePrompt from "@/components/UsernamePrompt";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { getPendingScore, clearPendingScore } from "@/lib/guest-scores";
import { useTheme } from "@/features/theme/ThemeProvider";
import { useSession, signOut } from "@/lib/auth-client";
import { type AppUser, getDisplayName } from "@/features/auth/types";
import { LeaderboardEntry } from "@/components/Leaderboard";
import { getMultiplayerSession, clearMultiplayerSession } from "@/lib/multiplayer-session";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function Home(): React.ReactElement {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardEntry[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [activeGridSize, setActiveGridSize] = useState(4);
  const [gameMode, setGameMode] = useState<"single" | "multi">("single");
  const [matchActive, setMatchActive] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ roomId: string; gameMode: "ranked" | "friendly"; friendRoomCode?: string } | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { theme, setTheme } = useTheme();

  // Ref to access SinglePlayerScreen's Game2048 for size toggling
  const singlePlayerGameRef = useRef<{ getSize: () => number; toggleSize: (s: number) => void } | null>(null);

  // Auth session
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as AppUser | undefined) ?? null;

  // Check for active multiplayer session on load
  useEffect(() => {
    if (!user?.id) return;
    getMultiplayerSession().then((saved) => {
      if (saved) setPendingSession(saved);
    });
  }, [user?.id]);

  // Submit pending score when user signs in
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    async function submitPendingScore() {
      const pending = getPendingScore();
      if (!pending) return;

      const supabase = createClient();
      if (!supabase || !user) return;

      const username = getDisplayName(user);
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
        }
      } catch {
        // best-effort
      }
    }

    submitPendingScore();
  }, [user]);

  // Disable body scroll on mobile
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    document.body.classList.add("mobile-no-scroll");
    return () => document.body.classList.remove("mobile-no-scroll");
  }, []);

  const handleSignOut = useCallback(async () => {
    try { await signOut(); } catch { /* ignore */ }
  }, []);

  const handleGridSizeChange = useCallback((newSize: number) => {
    const wasSingle = gameMode === "single";
    setActiveGridSize(newSize);
    setGameMode("single");
    setMatchActive(false);

    if (wasSingle) {
      // Access the game ref via the static property set by SinglePlayerScreen
      const gameRef = (SinglePlayerScreen as any)._gameRef?.current;
      if (gameRef) {
        const currentSize = gameRef.getSize();
        if (currentSize !== newSize) {
          gameRef.toggleSize(newSize);
        }
      }
    }
  }, [gameMode]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  return (
    <div className="page-layout">
      <DesktopSidebar
        user={user}
        currentScore={currentScore}
        activeGridSize={activeGridSize}
        refreshTrigger={refreshTrigger}
        onSignOut={handleSignOut}
        theme={theme}
        onThemeChange={setTheme}
        onScoresLoaded={setLeaderboardScores}
      />

      <div className={`container${gameMode === "single" && activeGridSize === 8 ? " container-wide" : ""}`}>
        {/* Title - hidden during active match */}
        {!matchActive && (
          <div className="title-section">
            <h1 className="game-title">2048</h1>
            <p className="game-intro">Join the tiles, get to <strong>2048!</strong></p>
          </div>
        )}

        {/* Mode toggle - hidden during active match */}
        {!matchActive && (
          <div className="below-board-controls" style={{ marginBottom: "20px" }}>
            <div className="grid-size-control" style={{ display: "flex", gap: "8px" }}>
              <button
                className={`grid-size-option${gameMode === "single" ? " grid-size-active" : ""}`}
                onClick={() => handleGridSizeChange(4)}
              >
                Single Player
              </button>
              {isSupabaseConfigured() && (
                <button
                  className={`grid-size-option${gameMode === "multi" ? " grid-size-active" : ""}`}
                  onClick={() => { setActiveGridSize(4); setGameMode("multi"); }}
                >
                  Multiplayer
                </button>
              )}
            </div>
          </div>
        )}

        {gameMode === "single" ? (
          <SinglePlayerScreen
            user={user}
            activeGridSize={activeGridSize}
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
            onScoreChange={setCurrentScore}
            leaderboardScores={leaderboardScores}
          />
        ) : (
          <MultiplayerView onMatchActiveChange={setMatchActive} reconnectSession={pendingSession} />
        )}

        <p className="game-hint desktop-hint">
          Use your <strong>arrow keys</strong> to move the tiles.
        </p>

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

        {/* Rejoin multiplayer match modal */}
        <Modal
          open={!!pendingSession && gameMode === "single"}
          onClose={() => { if (user?.id) clearMultiplayerSession(); setPendingSession(null); }}
          labelledBy="rejoin-title"
        >
          <div style={{ textAlign: "center", padding: "4px 0" }}>
            <h2 id="rejoin-title" style={{ margin: "0 0 12px", fontSize: "1.4rem" }}>Match In Progress</h2>
            <p style={{ margin: "0 0 8px", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              You have an active {pendingSession?.gameMode === "friendly" ? "friendly" : "ranked"} match
            </p>
            {pendingSession?.friendRoomCode && (
              <p style={{ margin: "0 0 4px", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 600 }}>
                Room: {pendingSession.friendRoomCode}
              </p>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
              <Button variant="primary" onClick={() => { setActiveGridSize(4); setGameMode("multi"); }}>
                Rejoin
              </Button>
              <Button variant="secondary" onClick={() => { if (user?.id) clearMultiplayerSession(); setPendingSession(null); }}>
                Leave
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
