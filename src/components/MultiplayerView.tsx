"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import type confettiModule from "canvas-confetti";
import Game2048, { GameState, type Game2048Handle } from "./Game2048";
import EmailSignIn from "./EmailSignIn";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import { useSession } from "@/lib/auth-client";
import { type AppUser, getDisplayName } from "@/features/auth/types";
import { usePartyMatchmaking as useMatchmaking } from "../hooks/usePartyMatchmaking";
import { usePartyGame as useMultiplayerGame } from "../hooks/usePartyGame";
import { saveMultiplayerSession, clearMultiplayerSession } from "@/lib/multiplayer-session";
import { calculateElo, getEloRank, DEFAULT_ELO } from "@/lib/elo";
import { themes } from "@/lib/themes";
import { useTheme } from "@/features/theme/ThemeProvider";
import { getOrCreatePlayerStats, updateStatsAfterGame, PlayerStats } from "@/lib/player-stats";
import type { GameMode } from "@/lib/party/messages";
import MatchResultModal from "@/features/multiplayer/game/MatchResultModal";
import LeaveWarningModal from "@/features/multiplayer/game/LeaveWarningModal";
import MultiplayerHud from "@/features/multiplayer/game/MultiplayerHud";
import OpponentPreview from "@/features/multiplayer/game/OpponentPreview";

import { generateRoomCode, buildInviteUrl } from "@/lib/room-code";
import { useGameFeedback } from "@/hooks/useGameFeedback";

type LobbyScreen = "main" | "create-room";
const MOVE_TIMEOUT_SECONDS = 5;

interface MultiplayerViewProps {
  onMatchActiveChange?: (isActive: boolean) => void;
  reconnectSession?: {
    roomId: string;
    gameMode: "ranked" | "friendly";
    friendRoomCode?: string;
  } | null;
  autoJoinCode?: string | null;
}

const emptyOpponentState: GameState = {
  grid: Array(16).fill(0),
  score: 0,
  gameOver: false,
  won: false,
};

export default function MultiplayerView({
  onMatchActiveChange,
  reconnectSession,
  autoJoinCode,
}: MultiplayerViewProps) {
  const {
    state: matchmakingState,
    setState: setMatchmakingState,
    roomId,
    setRoomId: setMatchmakingRoomId,
    opponentInfo,
    startMatchmaking,
    cancelMatchmaking,
    myId,
    searchTimeLeft,
  } = useMatchmaking();

  // Derive bot opponent info from matchmaking (no effect needed)
  const botOpponent = useMemo(
    () => (opponentInfo?.isBot ? { username: opponentInfo.username, elo: opponentInfo.elo } : null),
    [opponentInfo]
  );

  const { theme: themeName } = useTheme();
  const { onMoveFeedback, onGameOverFeedback, onWinFeedback } = useGameFeedback();

  // Auth State - using Better Auth
  const { data: sessionData, isPending: sessionLoading } = useSession();
  const user = (sessionData?.user as AppUser | undefined) ?? null;
  const sessionLoaded = !sessionLoading;
  const [showSignIn, setShowSignIn] = useState(false);

  // Player stats for lobby display
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ELO state for result modal
  const [localEloDelta, setLocalEloDelta] = useState<number | null>(null);
  const [localEloAfter, setLocalEloAfter] = useState<number | null>(null);
  const [eloProcessed, setEloProcessed] = useState(false);
  const [allowBotMatch, setAllowBotMatch] = useState(true);
  const [moveWindowResetKey, setMoveWindowResetKey] = useState<number | null>(null);

  // Guest support for friendly mode
  const guestId = useRef(`guest_${crypto.randomUUID()}`);
  const myName = useMemo(() => (user ? getDisplayName(user) : "Guest"), [user]);
  const effectiveId = user?.id || guestId.current;

  // Fetch player stats when user is available
  useEffect(() => {
    if (!user?.id) {
      setPlayerStats(null);
      return;
    }
    setStatsLoading(true);
    getOrCreatePlayerStats(myName)
      .then((stats) => setPlayerStats(stats))
      .catch(() => setPlayerStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id, myName]);

  const myElo = playerStats?.elo ?? DEFAULT_ELO;

  // Friend mode state — restore from session on mount
  const [lobbyScreen, setLobbyScreen] = useState<LobbyScreen>("main");
  const [friendRoomId, setFriendRoomId] = useState<string | null>(null);
  const [friendRoomCode, setFriendRoomCode] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>("ranked");
  const [codeCopied, setCodeCopied] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [autoJoinError, setAutoJoinError] = useState<string | null>(null);

  // Restore session from reconnect prop
  useEffect(() => {
    if (!reconnectSession) return;
    setIsReconnecting(true);
    if (reconnectSession.gameMode === "friendly") {
      setFriendRoomId(reconnectSession.roomId);
      setFriendRoomCode(reconnectSession.friendRoomCode || "");
      setGameMode("friendly");
    } else {
      setMatchmakingRoomId(reconnectSession.roomId);
      setMatchmakingState("matched");
      setGameMode("ranked");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-join from invite link — wait for session to load so we use the correct identity
  const autoJoinHandled = useRef(false);
  useEffect(() => {
    if (!autoJoinCode || autoJoinHandled.current || reconnectSession || !sessionLoaded) return;
    autoJoinHandled.current = true;
    setIsAutoJoining(true);
    setAutoJoinError(null);
    setFriendRoomCode(autoJoinCode);
    setFriendRoomId(`friend_${autoJoinCode}`);
    setGameMode("friendly");
  }, [autoJoinCode, reconnectSession, sessionLoaded]);

  // Auto-join timeout: if room doesn't start within 10s, show error
  useEffect(() => {
    if (!isAutoJoining || !friendRoomId) return;
    const timeout = setTimeout(() => {
      if (!gameStartedRef.current) {
        setIsAutoJoining(false);
        setAutoJoinError("Room not found or expired");
        setFriendRoomId(null);
        setFriendRoomCode("");
        setGameMode("ranked");
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isAutoJoining, friendRoomId]);

  // Compute effective room ID — friend room takes priority when in friendly mode
  const effectiveRoomId = gameMode === "friendly" ? friendRoomId : roomId;

  // Persist session whenever we have an active room
  useEffect(() => {
    if (effectiveRoomId && user?.id) {
      saveMultiplayerSession({
        roomId: effectiveRoomId,
        gameMode,
        friendRoomCode: gameMode === "friendly" ? friendRoomCode : undefined,
      });
    }
  }, [effectiveRoomId, gameMode, friendRoomCode, user?.id]);

  // Notify parent when match becomes active
  useEffect(() => {
    onMatchActiveChange?.(!!effectiveRoomId);
  }, [effectiveRoomId, onMatchActiveChange]);

  const {
    opponentState,
    opponentMoveDirection,
    restoredLocalState,
    initialServerState,
    serverGameState,
    opponentConnected,
    opponentEverConnected,
    opponentName,
    opponentElo,
    sendMove,
    requestRematch,
    resetRematchState,
    declareForfeit,
    localWantsRematch,
    opponentWantsRematch,
    rematchReady,
    rematchStarted,
    clearRematchStarted,
    timeLeft,
    gameStarted,
    forfeitWin,
    serverResult,
  } = useMultiplayerGame(effectiveRoomId, myId, effectiveId, myName, myElo, gameMode, botOpponent);

  // Track gameStarted for auto-join timeout ref
  const gameStartedRef = useRef(false);
  useEffect(() => {
    gameStartedRef.current = gameStarted;
    if (gameStarted && isAutoJoining) {
      setIsAutoJoining(false);
      setAutoJoinError(null);
    }
  }, [gameStarted, isAutoJoining]);

  // Clear reconnecting flag once the game has started
  useEffect(() => {
    if (gameStarted && isReconnecting) {
      setIsReconnecting(false);
    }
  }, [gameStarted, isReconnecting]);

  // Stale room timeout: if reconnecting and game doesn't start within 5s, bail
  useEffect(() => {
    if (!isReconnecting || !effectiveRoomId) return;
    const timeout = setTimeout(() => {
      if (!gameStarted) {
        console.log("[MultiplayerView] Stale room detected, returning to lobby");
        if (user?.id) clearMultiplayerSession();
        cancelMatchmaking();
        setFriendRoomId(null);
        setFriendRoomCode("");
        setGameMode("ranked");
        setLobbyScreen("main");
        setIsReconnecting(false);
      }
    }, 5000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReconnecting, effectiveRoomId]);

  const [localGameResult, setLocalGameResult] = useState<{
    won: boolean;
    score: number;
    gameOver: boolean;
  } | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [showOpponentExpanded, setShowOpponentExpanded] = useState(false);
  const localGameResetRef = useRef<(() => void) | null>(null);
  const devEndGameRef = useRef<(() => void) | null>(null);
  const confettiFiredRef = useRef(false);
  const isDev = process.env.NODE_ENV === "development";
  const localGameRef = useRef<Game2048Handle>(null);
  const suppressStateRef = useRef(!!reconnectSession);

  // Restore local board state when server sends it back on reconnect
  useEffect(() => {
    if (!restoredLocalState) return;
    const applyRestore = () => {
      if (localGameRef.current) {
        localGameRef.current.updateState(restoredLocalState);
        setMoveWindowResetKey(Date.now());
        setLocalGameResult({
          won: restoredLocalState.won,
          score: restoredLocalState.score,
          gameOver: restoredLocalState.gameOver,
        });
        suppressStateRef.current = false;
        return true;
      }
      return false;
    };
    if (applyRestore()) return;
    let rafId: number;
    let attempts = 0;
    const retry = () => {
      if (applyRestore() || ++attempts >= 20) {
        if (attempts >= 20) suppressStateRef.current = false;
        return;
      }
      rafId = requestAnimationFrame(retry);
    };
    rafId = requestAnimationFrame(retry);
    return () => cancelAnimationFrame(rafId);
  }, [restoredLocalState]);

  // Load server-generated initial board when a new game starts
  useEffect(() => {
    if (!initialServerState) return;
    // Sync localGameResult so HUD shows correct score immediately
    setMoveWindowResetKey(Date.now());
    setLocalGameResult({
      won: initialServerState.won,
      score: initialServerState.score,
      gameOver: initialServerState.gameOver,
    });
    const applyInitial = () => {
      if (localGameRef.current) {
        localGameRef.current.updateState(initialServerState);
        return true;
      }
      return false;
    };
    if (applyInitial()) return;
    let rafId: number;
    let attempts = 0;
    const retry = () => {
      if (applyInitial() || ++attempts >= 20) return;
      rafId = requestAnimationFrame(retry);
    };
    rafId = requestAnimationFrame(retry);
    return () => cancelAnimationFrame(rafId);
  }, [initialServerState]);

  // Sync server-authoritative state after each move to keep client and server grids aligned.
  // Without this, random tile placement diverges and scores differ at game end.
  useEffect(() => {
    if (!serverGameState || !localGameRef.current) return;
    localGameRef.current.updateState(serverGameState);
    setMoveWindowResetKey(Date.now());
    setLocalGameResult({
      won: serverGameState.won,
      score: serverGameState.score,
      gameOver: serverGameState.gameOver,
    });
  }, [serverGameState]);

  const handleLocalGameOver = useCallback(
    (score: number) => {
      setLocalGameResult({ won: false, score, gameOver: true });
      onGameOverFeedback();
    },
    [onGameOverFeedback]
  );

  const handleLocalGameWon = useCallback(
    (score: number) => {
      setLocalGameResult({ won: true, score, gameOver: true });
      onWinFeedback();
    },
    [onWinFeedback]
  );

  const handleLocalStateChange = useCallback((state: GameState) => {
    if (suppressStateRef.current) return;
    // Only update local result tracking — server gets state via sendMove (server-authoritative)
    setLocalGameResult({ won: state.won, score: state.score, gameOver: state.gameOver });
  }, []);

  const handleLocalMove = useCallback(
    (direction: number) => {
      sendMove(direction);
    },
    [sendMove]
  );

  const handleResetReady = useCallback((resetFn: () => void) => {
    localGameResetRef.current = resetFn;
  }, []);

  const handleDevEndGameReady = useCallback((fn: () => void) => {
    devEndGameRef.current = fn;
  }, []);

  const handleLeaveMatch = () => {
    const gameStillLive = gameStarted && !serverResult && !hasForfeit;
    // Show warning modal for ranked games that are still live
    if (gameStillLive && gameMode === "ranked") {
      setShowLeaveWarning(true);
      return;
    }
    confirmLeaveMatch();
  };

  const confirmLeaveMatch = async () => {
    setShowLeaveWarning(false);
    const gameStillLive = gameStarted && !serverResult && !hasForfeit;

    // Process ELO loss immediately for ranked forfeits before leaving
    if (gameStillLive && gameMode === "ranked" && user?.id) {
      try {
        const oppElo = opponentElo ?? DEFAULT_ELO;
        const result = calculateElo(myElo, oppElo, "loss");
        console.log(
          `[Forfeit] ELO change: ${myElo} -> ${result.newPlayerElo} (${result.playerDelta})`
        );

        await updateStatsAfterGame({
          won: false,
          tied: false,
          score: localGameResult?.score ?? 0,
          newElo: result.newPlayerElo,
        });
        console.log("[Forfeit] Stats updated in database");
      } catch (err) {
        console.error("[Forfeit] Failed to update stats:", err);
      }
    }

    if (gameStillLive) {
      declareForfeit();
    }
    setShowOpponentExpanded(false);
    if (user?.id) clearMultiplayerSession();
    cancelMatchmaking();
    setFriendRoomId(null);
    setFriendRoomCode("");
    setGameMode("ranked");
    setLobbyScreen("main");
    setCodeCopied(false);
    setLocalGameResult(null);

    confettiFiredRef.current = false;
    setIsReconnecting(false);
  };

  const handleNewOpponent = () => {
    if (user?.id) clearMultiplayerSession();
    cancelMatchmaking();
    setLocalGameResult(null);
    setShowOpponentExpanded(false);
    setMoveWindowResetKey(null);

    confettiFiredRef.current = false;
    setLocalEloDelta(null);
    setLocalEloAfter(null);
    setEloProcessed(false);
    setIsReconnecting(false);
    if (user?.id) {
      startMatchmaking(user.id, myName, myElo, allowBotMatch);
    }
  };

  const handleAllowBotMatchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setAllowBotMatch(checked);
      if (matchmakingState === "searching" && user?.id) {
        startMatchmaking(user.id, myName, myElo, checked);
      }
    },
    [matchmakingState, myElo, myName, startMatchmaking, user?.id]
  );

  // Derive match resolution state (must be before early returns so hooks are stable)
  const localDone = !!(localGameResult?.gameOver || localGameResult?.won);
  const opponentDone = !!(opponentState?.gameOver || opponentState?.won);
  const someoneWon2048 = !!(localGameResult?.won || opponentState?.won);
  const timerExpired = timeLeft === 0 && gameStarted;
  const hasForfeit = !!forfeitWin;

  // Match resolves when server sends authoritative result, or on forfeit
  const isMatchResolved = serverResult !== null || hasForfeit;

  // Use server result for outcome when available; fall back to client-side for forfeit
  const localWon = (() => {
    if (forfeitWin === "local") return true;
    if (forfeitWin === "opponent") return false;
    if (serverResult) return serverResult.outcome === "win";
    return false;
  })();

  const isTie = !hasForfeit && serverResult?.outcome === "tie";

  // Disable local inputs when the local player is done or match is fully resolved
  const disableLocalInputs =
    localDone || someoneWon2048 || timerExpired || hasForfeit || isMatchResolved;

  // Clear active match session when match resolves
  const matchClearedRef = useRef(false);
  useEffect(() => {
    if (isMatchResolved && !matchClearedRef.current) {
      matchClearedRef.current = true;
      if (user?.id) clearMultiplayerSession();
    }
    if (!isMatchResolved) matchClearedRef.current = false;
  }, [isMatchResolved, user?.id]);

  // Process ELO changes when match resolves (skip for friendly games)
  useEffect(() => {
    if (!isMatchResolved || eloProcessed) return;

    const processElo = async () => {
      setEloProcessed(true);

      // Skip ELO updates for friendly games only (bot games still affect ELO)
      if (gameMode === "friendly") return;

      const localScore = serverResult?.yourScore ?? localGameResult?.score ?? 0;

      const outcome: "win" | "loss" | "tie" = isTie ? "tie" : localWon ? "win" : "loss";
      const oppElo = opponentElo ?? DEFAULT_ELO;

      const result = calculateElo(myElo, oppElo, outcome);

      setLocalEloDelta(result.playerDelta);
      setLocalEloAfter(result.newPlayerElo);

      // Update stats in Supabase
      if (user?.id) {
        try {
          await updateStatsAfterGame({
            won: localWon,
            tied: isTie,
            score: localScore,
            newElo: result.newPlayerElo,
          });
          // Refresh local stats
          const updated = await getOrCreatePlayerStats(myName);
          setPlayerStats(updated);
        } catch (err) {
          console.error("[MultiplayerView] Failed to update stats:", err);
        }
      }
    };

    processElo();
  }, [
    isMatchResolved,
    eloProcessed,
    localGameResult,
    opponentState,
    localWon,
    isTie,
    myElo,
    opponentElo,
    user?.id,
    myName,
    serverResult,
    gameMode,
  ]);

  // Fire confetti when local player wins (dynamic import to avoid bundling on load)
  useEffect(() => {
    if (isMatchResolved && localWon && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const currentTheme = themeName;
      const confettiColors = themes[currentTheme]?.confettiColors ?? themes.classic.confettiColors;
      import("canvas-confetti").then((mod) => {
        const confetti = mod.default as typeof confettiModule;
        const end = Date.now() + 2000;
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: confettiColors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: confettiColors,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      });
    }
  }, [isMatchResolved, localWon, themeName]);

  // When both players accept rematch, reset the game
  useEffect(() => {
    if (rematchReady) {
      resetRematchState();
      setLocalGameResult(null);

      confettiFiredRef.current = false;
      setLocalEloDelta(null);
      setLocalEloAfter(null);
      setEloProcessed(false);
      localGameResetRef.current?.();
    }
  }, [rematchReady, resetRematchState]);

  // Handle rematch_start from server (fixes the case where first requester doesn't get rematchReady)
  useEffect(() => {
    if (rematchStarted) {
      clearRematchStarted();
      setLocalGameResult(null);

      confettiFiredRef.current = false;
      setLocalEloDelta(null);
      setLocalEloAfter(null);
      setEloProcessed(false);
      localGameResetRef.current?.();
    }
  }, [rematchStarted, clearRematchStarted]);

  // One-click "Play with a Friend" — generate code + link immediately
  const handlePlayWithFriend = () => {
    const code = generateRoomCode();
    setFriendRoomCode(code);
    setFriendRoomId(`friend_${code}`);
    setGameMode("friendly");
    setLobbyScreen("create-room");
  };

  // Auto-join "Connecting..." screen
  if (isAutoJoining && friendRoomId && !gameStarted) {
    return (
      <div className="mp-lobby">
        <h2 className="mp-lobby-title">Joining Game</h2>
        <div className="loader loader-center"></div>
        <p className="hint">Connecting...</p>
        <button
          className="mp-back-btn"
          onClick={() => {
            setIsAutoJoining(false);
            setFriendRoomId(null);
            setFriendRoomCode("");
            setGameMode("ranked");
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Auto-join error screen
  if (autoJoinError) {
    return (
      <div className="mp-lobby">
        <h2 className="mp-lobby-title">Could not join</h2>
        <p className="mp-lobby-subtitle">{autoJoinError}</p>
        <button
          className="mp-find-btn"
          onClick={() => {
            setAutoJoinError(null);
            setLobbyScreen("main");
          }}
        >
          Go to Lobby
        </button>
      </div>
    );
  }

  if (
    matchmakingState === "idle" &&
    !(gameMode === "friendly" && friendRoomId && (gameStarted || isReconnecting))
  ) {
    if (!sessionLoaded) {
      return (
        <div className="mp-lobby">
          <h2 className="mp-lobby-title">Loading...</h2>
        </div>
      );
    }

    // Auth gate only for ranked play — guests can play friendly
    if (!user && isSupabaseConfigured() && gameMode !== "friendly") {
      // If they navigated to friend menu, let them through
      if (lobbyScreen !== "create-room") {
        return (
          <div className="mp-lobby mp-auth-gate">
            <div className="mp-auth-card">
              <span className="mp-auth-eyebrow">Ranked multiplayer</span>
              <h2 className="mp-lobby-title">Login to play Multiplayer</h2>
              <p className="mp-lobby-subtitle mp-auth-copy">
                You need an account to be matched with online players.
              </p>

              <div className="mp-lobby-buttons mp-auth-actions">
                {!showSignIn ? (
                  <>
                    <button
                      type="button"
                      className="modal-btn-leaderboard"
                      onClick={() => setShowSignIn(true)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="modal-btn-icon"
                      >
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
                    <button className="mp-friend-btn" onClick={handlePlayWithFriend}>
                      Play with a Friend
                    </button>
                  </>
                ) : (
                  <div className="mp-auth-inline-signin">
                    <EmailSignIn
                      variant="inline"
                      maxWidth="300px"
                      onCancel={() => setShowSignIn(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
    }

    const eloRank = playerStats ? getEloRank(playerStats.elo) : null;

    const inviteUrl = friendRoomCode ? buildInviteUrl(friendRoomCode) : "";

    const handleShareInvite = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join my 2048 match!",
            text: "Click to join my 2048 match",
            url: inviteUrl,
          });
          return;
        } catch {
          // User cancelled or share failed — fall through to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } catch {
        /* clipboard not available */
      }
    };

    const handleCancelFriend = () => {
      if (user?.id) clearMultiplayerSession();
      setFriendRoomId(null);
      setFriendRoomCode("");
      setGameMode("ranked");
      setLobbyScreen("main");
      setCodeCopied(false);
    };

    // Friend mode: waiting for opponent — share invite link
    if (lobbyScreen === "create-room" && friendRoomId && !gameStarted) {
      return (
        <div className="mp-lobby">
          <h2 className="mp-lobby-title">Invite a Friend</h2>
          <p className="mp-lobby-subtitle">Share this link with your friend</p>

          <button className="mp-find-btn" onClick={handleShareInvite} style={{ marginTop: 16 }}>
            {codeCopied ? "Link Copied!" : "Share Invite Link"}
          </button>

          <button
            className="mp-invite-url-display"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              } catch {
                /* clipboard not available */
              }
            }}
          >
            <span className="mp-invite-url">{codeCopied ? "Copied!" : inviteUrl}</span>
          </button>

          <div className="loader loader-center"></div>
          <p className="hint">Waiting for friend to join...</p>
          <button className="mp-back-btn" onClick={handleCancelFriend}>
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="mp-lobby">
        <h2 className="mp-lobby-title">Multiplayer</h2>
        <p className="mp-lobby-subtitle">Play against an online opponent in real-time!</p>

        <div className="mp-lobby-buttons">
          {user ? (
            <button
              className="mp-find-btn"
              onClick={() => user.id && startMatchmaking(user.id, myName, myElo, allowBotMatch)}
            >
              Play Online
            </button>
          ) : (
            <button className="mp-find-btn" onClick={() => setShowSignIn(true)}>
              Sign in to Play Online
            </button>
          )}
          <button className="mp-friend-btn" onClick={handlePlayWithFriend}>
            Play with a Friend
          </button>
        </div>

        {user && (
          <label className="mp-matchmaking-option">
            <input type="checkbox" checked={allowBotMatch} onChange={handleAllowBotMatchChange} />
            <span>Match with computer if a human player is not available</span>
          </label>
        )}

        {!user && showSignIn && (
          <div style={{ marginTop: 16, width: "100%", maxWidth: "300px" }}>
            <EmailSignIn variant="inline" maxWidth="300px" onCancel={() => setShowSignIn(false)} />
          </div>
        )}

        {statsLoading && (
          <div className="mp-stats-card" style={{ marginTop: 20 }}>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              Loading stats...
            </p>
          </div>
        )}

        {playerStats && !statsLoading && (
          <div className="mp-stats-card">
            <div className="mp-stats-card-header">
              <div className="mp-stats-card-identity">
                <span className="mp-stats-card-caption">Your multiplayer stats</span>
                <span className="mp-stats-card-name">{myName}</span>
              </div>
              {/* ELO hero */}
              <div className="mp-stats-elo-hero">
                {eloRank && (
                  <span className={`elo-rank-badge elo-rank-${eloRank.name.toLowerCase()}`}>
                    {eloRank.name}
                  </span>
                )}
                <span className="mp-stats-elo-number">{playerStats.elo}</span>
              </div>
            </div>

            {/* W / L / T pills */}
            <div className="mp-stats-pills">
              <div className="mp-stats-pill mp-stats-pill-win">
                <span className="mp-stats-pill-label">Wins</span>
                <span className="mp-stats-pill-value">{playerStats.wins}</span>
              </div>
              <div className="mp-stats-pill mp-stats-pill-loss">
                <span className="mp-stats-pill-label">Losses</span>
                <span className="mp-stats-pill-value">{playerStats.losses}</span>
              </div>
              <div className="mp-stats-pill">
                <span className="mp-stats-pill-label">Ties</span>
                <span className="mp-stats-pill-value">{playerStats.ties}</span>
              </div>
            </div>

            {/* Best score + total pts */}
            <div className="mp-stats-bottom">
              <div className="mp-stats-bottom-item">
                <span className="mp-stats-bottom-label">Best Score</span>
                <span className="mp-stats-bottom-value">
                  {playerStats.best_score.toLocaleString()}
                </span>
              </div>
              <div className="mp-stats-bottom-item">
                <span className="mp-stats-bottom-label">Total Points</span>
                <span className="mp-stats-bottom-value">
                  {playerStats.total_points.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (matchmakingState === "searching") {
    const eloRank = playerStats ? getEloRank(playerStats.elo) : null;
    return (
      <div className="mp-searching">
        <h2 className="mp-searching-title">Finding you a match...</h2>
        {eloRank && (
          <div className="mp-searching-rank">
            <span className={`elo-rank-badge elo-rank-${eloRank.name.toLowerCase()}`}>
              {eloRank.name} · {playerStats?.elo ?? DEFAULT_ELO}
            </span>
          </div>
        )}
        <div className="loader loader-center"></div>
        <div className="mp-search-timer">
          {allowBotMatch ? (
            <p className="mp-search-timer-text">
              Looking for a human player...{" "}
              <span className="mp-search-timer-count">{searchTimeLeft}s</span>
            </p>
          ) : (
            <p className="mp-search-timer-text">
              Looking for a human player only. Bot fallback is off.
            </p>
          )}
        </div>
        <label className="mp-matchmaking-option mp-matchmaking-option-searching">
          <input type="checkbox" checked={allowBotMatch} onChange={handleAllowBotMatchChange} />
          <span>Match with computer if a human player is not available</span>
        </label>
        <button className="game-btn match-btn secondary" onClick={cancelMatchmaking}>
          Cancel
        </button>
      </div>
    );
  }

  // In-game status text (shown while playing, before modal)
  // Note: Running out of moves = instant loss, so the match resolves immediately
  let statusText = "";
  if (!isMatchResolved) {
    if (timerExpired) statusText = "Time's up! Waiting for result...";
  } else if (timerExpired && !hasForfeit) {
    statusText = "Time's up!";
  }

  const displayOpponentName = opponentName || "Opponent";

  // Result modal helpers
  const getResultTitle = (): string => {
    if (forfeitWin === "local") return "Victory!";
    if (forfeitWin === "opponent") return "Defeat";
    if (localWon) return "Victory!";
    if (isTie) return "It's a Tie!";
    return "Defeat";
  };

  const getResultSubtitle = (): string | null => {
    if (forfeitWin === "local") return "Opponent Forfeited";
    if (forfeitWin === "opponent") return "You Forfeited";
    if (serverResult?.reason === "inactive")
      return localWon
        ? `${displayOpponentName} ran out of move time!`
        : "You ran out of move time!";
    if (serverResult?.reason === "2048" || someoneWon2048)
      return localWon ? "You reached 2048!" : `${displayOpponentName} reached 2048!`;
    if (serverResult?.reason === "no_moves")
      return localWon ? `${displayOpponentName} ran out of moves!` : "You ran out of moves!";
    if (serverResult?.reason === "timer" || timerExpired) return "Time's up!";
    return null;
  };

  const getResultBannerClass = (): string => {
    if (hasForfeit)
      return forfeitWin === "local"
        ? "mp-result-win mp-result-forfeit"
        : "mp-result-lose mp-result-forfeit";
    if (localWon) return "mp-result-win";
    if (isTie) return "mp-result-tie";
    return "mp-result-lose";
  };

  const localEloRank = localEloAfter
    ? getEloRank(localEloAfter)
    : playerStats
      ? getEloRank(playerStats.elo)
      : null;

  return (
    <div className="multiplayer-boards-container">
      <div className="mp-boards-wrapper">
        <MultiplayerHud
          myName={myName}
          myScore={localGameResult?.score || 0}
          opponentName={displayOpponentName}
          opponentScore={opponentState?.score || 0}
          timeLeft={timeLeft}
          gameStarted={gameStarted}
          opponentConnected={opponentConnected}
          opponentEverConnected={opponentEverConnected}
          statusText={statusText}
          moveWindowResetKey={isMatchResolved ? null : moveWindowResetKey}
          moveTimeoutSeconds={MOVE_TIMEOUT_SECONDS}
        />

        <div className="boards-split">
          <div className="mp-board-stage">
            <div
              className={`mp-board-slot mp-local-board-slot ${localDone || timerExpired || hasForfeit ? "dimmed" : ""}`}
            >
              <Game2048
                ref={localGameRef}
                onGameOver={handleLocalGameOver}
                onGameWon={handleLocalGameWon}
                onResetReady={handleResetReady}
                onStateChange={handleLocalStateChange}
                onMove={handleLocalMove}
                onMoveFeedback={onMoveFeedback}
                disableInputs={disableLocalInputs}
                serverAuthoritative
                onDevEndGameReady={isDev ? handleDevEndGameReady : undefined}
                hideScore
                themeName={themeName}
                disableSave
              />
              {isDev && !localDone && (
                <button className="dev-end-game-btn" onClick={() => devEndGameRef.current?.()}>
                  DEV: End Game
                </button>
              )}
            </div>
            <span className="mp-board-label">You</span>
          </div>

          <div
            className={`mp-side-stage ${opponentDone || timerExpired || hasForfeit ? "dimmed" : ""}`}
          >
            <span className="mp-versus-text">VS</span>
            <div
              className="mp-opponent-side-card"
              onClick={() => setShowOpponentExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowOpponentExpanded(true);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${displayOpponentName}'s board`}
            >
              <div className="opponent-game-container">
                {!opponentConnected && (
                  <div className="offline-overlay" role="status" aria-live="polite">
                    {opponentEverConnected ? "Opponent disconnected..." : "Connecting..."}
                  </div>
                )}
                <Game2048
                  readOnlyState={opponentState || emptyOpponentState}
                  readOnlyMoveDirection={opponentMoveDirection}
                  disableInputs
                  hideScore
                  themeName={themeName}
                  disableSave
                  serverAuthoritative
                  miniMode
                />
              </div>
              <span className="mp-opponent-side-name">{displayOpponentName}</span>
            </div>
          </div>
        </div>

        <OpponentPreview
          opponentState={opponentState}
          opponentMoveDirection={opponentMoveDirection}
          opponentName={displayOpponentName}
          opponentConnected={opponentConnected}
          opponentEverConnected={opponentEverConnected}
          opponentDone={opponentDone}
          timerExpired={timerExpired}
          hasForfeit={hasForfeit}
          themeName={themeName}
          showExpanded={showOpponentExpanded}
          onToggleExpanded={setShowOpponentExpanded}
        />

        {/* Leave button at the bottom */}
        {!isMatchResolved && (
          <button className="mp-leave-bottom-btn" onClick={handleLeaveMatch}>
            Leave Match
          </button>
        )}
      </div>

      <LeaveWarningModal
        show={showLeaveWarning}
        onCancel={() => setShowLeaveWarning(false)}
        onConfirm={confirmLeaveMatch}
      />

      <MatchResultModal
        show={isMatchResolved}
        resultTitle={getResultTitle()}
        resultSubtitle={getResultSubtitle()}
        resultBannerClass={getResultBannerClass()}
        myName={myName}
        opponentName={displayOpponentName}
        myScore={serverResult?.yourScore ?? localGameResult?.score ?? 0}
        opponentScore={serverResult?.opponentScore ?? opponentState?.score ?? 0}
        localWon={localWon}
        isTie={isTie}
        hasForfeit={hasForfeit}
        gameMode={gameMode}
        localEloDelta={localEloDelta}
        localEloAfter={localEloAfter}
        localEloRank={localEloRank}
        localWantsRematch={localWantsRematch}
        opponentWantsRematch={opponentWantsRematch}
        opponentConnected={opponentConnected}
        inviteUrl={
          gameMode === "friendly" && friendRoomCode ? buildInviteUrl(friendRoomCode) : undefined
        }
        onRequestRematch={requestRematch}
        onShareInvite={
          gameMode === "friendly" && friendRoomCode
            ? async () => {
                const url = buildInviteUrl(friendRoomCode);
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "Join my 2048 match!",
                      text: "Click to join my 2048 match",
                      url,
                    });
                    return;
                  } catch {
                    /* cancelled */
                  }
                }
                try {
                  await navigator.clipboard.writeText(url);
                } catch {
                  /* unavailable */
                }
              }
            : undefined
        }
        onNewOpponent={handleNewOpponent}
        onLeave={handleLeaveMatch}
      />
    </div>
  );
}
