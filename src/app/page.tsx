"use client";

import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SinglePlayerScreen, {
  type SinglePlayerHandle,
} from "@/features/single-player/SinglePlayerScreen";
import MultiplayerView from "@/components/MultiplayerView";
import DesktopSidebar from "@/components/DesktopSidebar";
import MobileMenu from "@/components/MobileMenu";
import UsernamePrompt from "@/components/UsernamePrompt";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import { submitPendingScore } from "@/lib/score-service";
import { useTheme } from "@/features/theme/ThemeProvider";
import { useSession, signOut } from "@/lib/auth-client";
import { type AppUser } from "@/features/auth/types";
import { LeaderboardEntry } from "@/components/Leaderboard";
import { getMultiplayerSession, clearMultiplayerSession } from "@/lib/multiplayer-session";
import { isValidRoomCode } from "@/lib/room-code";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function Home(): React.ReactElement {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read ?join=CODE at init time so first render is already on multiplayer
  const [autoJoinCode] = useState<string | null>(() => {
    const joinParam = searchParams.get("join");
    if (joinParam) {
      const upper = joinParam.toUpperCase();
      if (isValidRoomCode(upper)) return upper;
    }
    return null;
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardEntry[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [activeGridSize, setActiveGridSize] = useState(4);
  const [gameMode, setGameMode] = useState<"single" | "multi">(autoJoinCode ? "multi" : "single");
  const [matchActive, setMatchActive] = useState(false);
  const [pendingSession, setPendingSession] = useState<{
    roomId: string;
    gameMode: "ranked" | "friendly";
    friendRoomCode?: string;
  } | null>(null);
  const [, setShowSignInModal] = useState(false);
  const { theme, setTheme } = useTheme();

  const singlePlayerRef = useRef<SinglePlayerHandle>(null);

  // Auth session
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as AppUser | undefined) ?? null;

  // Clean ?join= from URL after capturing it
  useEffect(() => {
    if (searchParams.get("join")) {
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for active multiplayer session on load
  useEffect(() => {
    if (!user?.id) return;
    getMultiplayerSession().then((saved) => {
      if (saved) setPendingSession(saved);
    });
  }, [user?.id]);

  // Submit pending score when user signs in
  useEffect(() => {
    if (!user) return;

    async function handlePendingScore() {
      const submitted = await submitPendingScore(user!);
      if (submitted) setRefreshTrigger((n) => n + 1);
    }

    handlePendingScore();
  }, [user]);

  // Disable body scroll on mobile
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    document.body.classList.add("mobile-no-scroll");
    return () => document.body.classList.remove("mobile-no-scroll");
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      /* ignore */
    }
  }, []);

  const handleGridSizeChange = useCallback(
    (newSize: number) => {
      const wasSingle = gameMode === "single";
      setActiveGridSize(newSize);
      setGameMode("single");
      setMatchActive(false);

      if (wasSingle && singlePlayerRef.current) {
        const currentSize = singlePlayerRef.current.getSize();
        if (currentSize !== newSize) {
          singlePlayerRef.current.toggleSize(newSize);
        }
      }
    },
    [gameMode]
  );

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

      <div
        className={`container${gameMode === "single" && activeGridSize === 8 ? " container-wide" : ""}`}
      >
        {/* Title - hidden during active match */}
        {!matchActive && (
          <div className="title-section">
            <h1 className="game-title">2048</h1>
            <p className="game-intro">
              Join the tiles, get to <strong>2048!</strong>
            </p>
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
                  onClick={() => {
                    setActiveGridSize(4);
                    setGameMode("multi");
                  }}
                >
                  Multiplayer
                </button>
              )}
            </div>
          </div>
        )}

        {gameMode === "single" ? (
          <SinglePlayerScreen
            ref={singlePlayerRef}
            user={user}
            activeGridSize={activeGridSize}
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
            onScoreChange={setCurrentScore}
            leaderboardScores={leaderboardScores}
          />
        ) : (
          <MultiplayerView
            onMatchActiveChange={setMatchActive}
            reconnectSession={pendingSession}
            autoJoinCode={autoJoinCode}
          />
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
          onClose={() => {
            if (user?.id) clearMultiplayerSession();
            setPendingSession(null);
          }}
          labelledBy="rejoin-title"
        >
          <div style={{ textAlign: "center", padding: "4px 0" }}>
            <h2 id="rejoin-title" style={{ margin: "0 0 12px", fontSize: "1.4rem" }}>
              Match In Progress
            </h2>
            <p style={{ margin: "0 0 8px", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              You have an active {pendingSession?.gameMode === "friendly" ? "friendly" : "ranked"}{" "}
              match
            </p>
            {pendingSession?.friendRoomCode && (
              <p
                style={{
                  margin: "0 0 4px",
                  fontFamily: "monospace",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                }}
              >
                Room: {pendingSession.friendRoomCode}
              </p>
            )}
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}
            >
              <Button
                variant="primary"
                onClick={() => {
                  setActiveGridSize(4);
                  setGameMode("multi");
                }}
              >
                Rejoin
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (user?.id) clearMultiplayerSession();
                  setPendingSession(null);
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
