"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import Game2048, { GameState } from './Game2048';
import EmailSignIn from './EmailSignIn';
import { isSupabaseConfigured } from '@/lib/supabase-client';
import { useSession, BetterAuthUser } from '@/lib/auth-client';
import { usePartyMatchmaking as useMatchmaking } from '../hooks/usePartyMatchmaking';
import { usePartyGame as useMultiplayerGame } from '../hooks/usePartyGame';
import { calculateElo, getEloRank, DEFAULT_ELO } from '@/lib/elo';
import { themes, ThemeName } from '@/lib/themes';
import { getOrCreatePlayerStats, updateStatsAfterGame, PlayerStats } from '@/lib/player-stats';

/** Format seconds into MM:SS display */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Get tile colors from theme */
function getTileColors(value: number, theme: typeof themes.classic): [string, string] {
  const tileValues = [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
  let closest = 0;
  for (const v of tileValues) {
    if (v <= value) closest = v;
  }
  return theme.tiles[closest] || theme.tiles[0];
}

/** Mini grid component for opponent preview */
function MiniGrid({ grid, themeName }: { grid: number[]; themeName: ThemeName }) {
  const theme = themes[themeName];

  return (
    <div className="mini-grid" style={{ background: theme.bgGrid }}>
      {grid.slice(0, 16).map((value, i) => (
        <div
          key={i}
          className="mini-tile"
          style={{ background: getTileColors(value, theme)[0] }}
        />
      ))}
    </div>
  );
}

/** Expanded grid component for full opponent board view */
function ExpandedGrid({ grid, themeName }: { grid: number[]; themeName: ThemeName }) {
  const theme = themes[themeName];

  // Calculate font size based on number of digits
  const getFontSize = (value: number): string => {
    if (value === 0) return '0';
    const digits = String(value).length;
    if (digits <= 2) return '2rem';
    if (digits === 3) return '1.6rem';
    return '1.2rem';
  };

  return (
    <div className="expanded-grid" style={{ background: theme.bgGrid }}>
      {grid.slice(0, 16).map((value, i) => {
        const [bg, text] = getTileColors(value, theme);
        return (
          <div
            key={i}
            className="expanded-tile"
            style={{
              background: bg,
              color: text,
              fontSize: getFontSize(value),
            }}
          >
            {value > 0 ? value : ''}
          </div>
        );
      })}
    </div>
  );
}

interface MultiplayerViewProps {
  onMatchActiveChange?: (isActive: boolean) => void;
}

export default function MultiplayerView({ onMatchActiveChange }: MultiplayerViewProps) {
  const { state: matchmakingState, roomId, opponentInfo, startMatchmaking, cancelMatchmaking, myId } = useMatchmaking();

  // Track current theme for canvas boards
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-theme') as ThemeName) || 'classic';
    }
    return 'classic';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') as ThemeName;
      if (t) setThemeName(t);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Auth State - using Better Auth
  const { data: sessionData, isPending: sessionLoading } = useSession();
  const user = (sessionData?.user as BetterAuthUser | undefined) ?? null;
  const sessionLoaded = !sessionLoading;
  const [showSignIn, setShowSignIn] = useState(false);

  // Player stats for lobby display
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ELO state for result modal
  const [localEloDelta, setLocalEloDelta] = useState<number | null>(null);
  const [opponentEloDelta, setOpponentEloDelta] = useState<number | null>(null);
  const [localEloAfter, setLocalEloAfter] = useState<number | null>(null);
  const [eloProcessed, setEloProcessed] = useState(false);

  // Read display name from user (set via UsernamePrompt)
  const myName = useMemo(() => {
    if (user?.username) return user.username;
    if (user?.name) return user.name;
    if (!user?.email) return 'You';
    const local = user.email.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [user]);

  // Fetch player stats when user is available
  useEffect(() => {
    if (!user?.id) {
      setPlayerStats(null);
      return;
    }
    setStatsLoading(true);
    getOrCreatePlayerStats(user.id, myName)
      .then((stats) => setPlayerStats(stats))
      .catch(() => setPlayerStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id, myName]);

  const myElo = playerStats?.elo ?? DEFAULT_ELO;

  // Notify parent when match becomes active (roomId is set)
  useEffect(() => {
    onMatchActiveChange?.(!!roomId);
  }, [roomId, onMatchActiveChange]);

  const {
    opponentState, opponentConnected, opponentEverConnected, opponentName, opponentElo,
    sendGameState, requestRematch, resetRematchState, declareForfeit,
    localWantsRematch, opponentWantsRematch, rematchReady,
    timeLeft, gameStarted, forfeitWin, serverResult,
  } = useMultiplayerGame(roomId, myId, user?.id || null, myName, myElo);

  const [localGameResult, setLocalGameResult] = useState<{ won: boolean; score: number; gameOver: boolean } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showOpponentExpanded, setShowOpponentExpanded] = useState(false);
  const localGameResetRef = useRef<(() => void) | null>(null);
  const devEndGameRef = useRef<(() => void) | null>(null);
  const confettiFiredRef = useRef(false);
  const isDev = process.env.NODE_ENV === 'development';

  // Final fallback state for opponent
  const emptyOpponentState: GameState = { grid: Array(16).fill(0), score: 0, gameOver: false, won: false };

  const handleLocalGameOver = useCallback((score: number) => {
    setLocalGameResult({ won: false, score, gameOver: true });
  }, []);

  const handleLocalGameWon = useCallback((score: number) => {
    setLocalGameResult({ won: true, score, gameOver: true });
  }, []);

  const handleLocalStateChange = useCallback((state: GameState) => {
    sendGameState(state);
    // Always update local score for HUD display
    setLocalGameResult({ won: state.won, score: state.score, gameOver: state.gameOver });
  }, [sendGameState]);

  const handleResetReady = useCallback((resetFn: () => void) => {
    localGameResetRef.current = resetFn;
  }, []);

  const handleDevEndGameReady = useCallback((fn: () => void) => {
    devEndGameRef.current = fn;
  }, []);

  const handleLeaveMatch = () => {
    // If a live game is in progress, broadcast forfeit so opponent gets the win
    const gameStillLive = gameStarted && !serverResult && !hasForfeit;
    if (gameStillLive) {
      declareForfeit();
    }
    cancelMatchmaking();
    setLocalGameResult(null);
    setShowResultModal(false);
    confettiFiredRef.current = false;
    setLocalEloDelta(null);
    setOpponentEloDelta(null);
    setLocalEloAfter(null);
    setEloProcessed(false);
  };

  const handleNewOpponent = () => {
    cancelMatchmaking();
    setLocalGameResult(null);
    setShowResultModal(false);
    confettiFiredRef.current = false;
    setLocalEloDelta(null);
    setOpponentEloDelta(null);
    setLocalEloAfter(null);
    setEloProcessed(false);
    if (user?.id) {
      startMatchmaking(user.id, myName, myElo);
    }
  };

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
    if (forfeitWin === 'local') return true;
    if (forfeitWin === 'opponent') return false;
    if (serverResult) return serverResult.outcome === 'win';
    return false;
  })();

  const isTie = !hasForfeit && serverResult?.outcome === 'tie';

  // Disable local inputs when the local player is done or match is fully resolved
  const disableLocalInputs = localDone || someoneWon2048 || timerExpired || hasForfeit || isMatchResolved;

  // Show result modal when match resolves
  useEffect(() => {
    if (isMatchResolved && !showResultModal) {
      setShowResultModal(true);
    }
  }, [isMatchResolved, showResultModal]);

  // Process ELO changes when match resolves
  useEffect(() => {
    if (!isMatchResolved || eloProcessed) return;

    const processElo = async () => {
      setEloProcessed(true);
      const localScore = serverResult?.yourScore ?? localGameResult?.score ?? 0;
      const opponentScore = serverResult?.opponentScore ?? opponentState?.score ?? 0;

      const outcome: 'win' | 'loss' | 'tie' = isTie ? 'tie' : localWon ? 'win' : 'loss';
      const oppElo = opponentElo ?? DEFAULT_ELO;

      const result = calculateElo(myElo, oppElo, outcome);

      setLocalEloDelta(result.playerDelta);
      setOpponentEloDelta(result.opponentDelta);
      setLocalEloAfter(result.newPlayerElo);

      // Update stats in Supabase
      if (user?.id) {
        try {
          await updateStatsAfterGame(user.id, {
            won: localWon,
            tied: isTie,
            score: localScore,
            newElo: result.newPlayerElo,
          });
          // Refresh local stats
          const updated = await getOrCreatePlayerStats(user.id, myName);
          setPlayerStats(updated);
        } catch (err) {
          console.error('[MultiplayerView] Failed to update stats:', err);
        }
      }
    };

    processElo();
  }, [isMatchResolved, eloProcessed, localGameResult, opponentState, localWon, isTie, myElo, opponentElo, user?.id, myName, serverResult]);

  // Fire confetti when local player wins
  useEffect(() => {
    if (isMatchResolved && localWon && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const currentTheme = (document.documentElement.getAttribute('data-theme') || 'classic') as ThemeName;
      const confettiColors = themes[currentTheme]?.confettiColors ?? themes.classic.confettiColors;
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
    }
  }, [isMatchResolved, localWon]);

  // When both players accept rematch, reset the game
  useEffect(() => {
    if (rematchReady) {
      resetRematchState();
      setLocalGameResult(null);
      setShowResultModal(false);
      confettiFiredRef.current = false;
      setLocalEloDelta(null);
      setOpponentEloDelta(null);
      setLocalEloAfter(null);
      setEloProcessed(false);
      localGameResetRef.current?.();
    }
  }, [rematchReady, resetRematchState]);

  if (matchmakingState === 'idle') {
    if (!sessionLoaded) {
      return (
        <div className="matchmaking-container">
          <h2>Loading...</h2>
        </div>
      );
    }

    if (!user && isSupabaseConfigured()) {
      return (
        <div className="matchmaking-container">
          <h2>Login to play Multiplayer</h2>
          <p>You need an account to be matched with online players.</p>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            {!showSignIn ? (
              <button
                type="button"
                className="modal-btn-leaderboard"
                style={{ width: '100%', maxWidth: '300px' }}
                onClick={() => setShowSignIn(true)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="modal-btn-icon">
                  <path d="M4 12V10M8 12V8M12 12V6M2 4L8 2L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign in with email
              </button>
            ) : (
              <EmailSignIn
                variant="inline"
                maxWidth="300px"
                onCancel={() => setShowSignIn(false)}
              />
            )}
          </div>
        </div>
      );
    }

    const eloRank = playerStats ? getEloRank(playerStats.elo) : null;

    return (
      <div className="mp-lobby">
        <h2 className="mp-lobby-title">Multiplayer</h2>
        <p className="mp-lobby-subtitle">Play against an online opponent in real-time!</p>
        <button className="mp-find-btn" onClick={() => user?.id && startMatchmaking(user.id, myName, myElo)}>Find Match</button>

        {statsLoading && (
          <div className="mp-stats-card" style={{ marginTop: 20 }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>Loading stats...</p>
          </div>
        )}

        {playerStats && !statsLoading && (
          <div className="mp-stats-card">
            {/* ELO hero */}
            <div className="mp-stats-elo-hero">
              {eloRank && (
                <span className={`elo-rank-badge elo-rank-${eloRank.name.toLowerCase()}`}>
                  {eloRank.name}
                </span>
              )}
              <span className="mp-stats-elo-number">{playerStats.elo}</span>
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
                <span className="mp-stats-bottom-value">{playerStats.best_score.toLocaleString()}</span>
              </div>
              <div className="mp-stats-bottom-item">
                <span className="mp-stats-bottom-label">Total Points</span>
                <span className="mp-stats-bottom-value">{playerStats.total_points.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (matchmakingState === 'searching') {
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
        <div className="loader" style={{ margin: '20px auto' }}></div>
        <p className="hint">Waiting for another player to join...</p>
        <button className="game-btn match-btn secondary" onClick={cancelMatchmaking}>Cancel</button>
      </div>
    );
  }

  // In-game status text (shown while playing, before modal)
  let statusText = "";
  if (!isMatchResolved) {
    if (localDone) statusText = "You ran out of moves. Waiting for result...";
    else if (opponentDone) statusText = `${opponentName || 'Opponent'} ran out of moves. Keep playing!`;
    else if (timerExpired) statusText = "Time's up! Waiting for result...";
  } else if (timerExpired && !hasForfeit) {
    statusText = "Time's up!";
  }

  const displayOpponentName = opponentName || 'Opponent';

  // Timer classes for new HUD
  const timerWarning = timeLeft < 30;
  const timerCritical = timeLeft < 10;
  const hudTimerClass = [
    'mp-hud-timer-display',
    timerWarning ? 'warning' : '',
    timerCritical ? 'critical' : '',
  ].filter(Boolean).join(' ');

  // Result modal helpers
  const getResultTitle = (): string => {
    if (forfeitWin === 'local') return 'Victory!';
    if (forfeitWin === 'opponent') return 'Defeat';
    if (localWon) return 'Victory!';
    if (isTie) return "It's a Tie!";
    return 'Defeat';
  };

  const getResultSubtitle = (): string | null => {
    if (forfeitWin === 'local') return 'Opponent Forfeited';
    if (forfeitWin === 'opponent') return 'You Forfeited';
    if (serverResult?.reason === 'timer' || timerExpired) return "Time's up!";
    if (serverResult?.reason === '2048' || someoneWon2048) return localWon ? 'You reached 2048!' : `${displayOpponentName} reached 2048!`;
    return null;
  };

  const getResultBannerClass = (): string => {
    if (hasForfeit) return forfeitWin === 'local' ? 'mp-result-win mp-result-forfeit' : 'mp-result-lose mp-result-forfeit';
    if (localWon) return 'mp-result-win';
    if (isTie) return 'mp-result-tie';
    return 'mp-result-lose';
  };

  const localEloRank = localEloAfter ? getEloRank(localEloAfter) : (playerStats ? getEloRank(playerStats.elo) : null);
  const eloChangeClass = isTie ? 'mp-elo-change mp-elo-change-neutral' : localWon ? 'mp-elo-change mp-elo-change-positive' : 'mp-elo-change mp-elo-change-negative';

  const connectionStatusClass = opponentConnected ? 'connected' : opponentEverConnected ? 'disconnected' : 'connecting';
  const connectionLabel = opponentConnected ? 'Connected' : opponentEverConnected ? 'Disconnected' : 'Connecting...';

  return (
    <div className="multiplayer-boards-container">

      <div className="mp-boards-wrapper">

      {/* In-game HUD */}
      <div className="mp-hud">
        {/* Local player */}
        <div className="mp-hud-player">
          <span className="mp-hud-name">{myName}</span>
          <span className="mp-hud-score">{(localGameResult?.score || 0).toLocaleString()}</span>
        </div>

        {/* Centre: timer */}
        <div className="mp-hud-timer">
          {gameStarted ? (
            <>
              <div className={hudTimerClass}>{formatTime(timeLeft)}</div>
              <div className="mp-hud-timer-label">remaining</div>
            </>
          ) : (
            <div className="mp-hud-timer-display">—</div>
          )}
        </div>

        {/* Opponent */}
        <div className="mp-hud-opponent">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', width: '100%' }}>
            <span className={`mp-hud-status ${connectionStatusClass}`} title={connectionLabel}>
              <span className="blob" />
            </span>
            <span className="mp-hud-name" style={{ maxWidth: 'none', flexShrink: 1 }}>{displayOpponentName}</span>
          </div>
          <span className="mp-hud-score">{(opponentState?.score || 0).toLocaleString()}</span>
        </div>

      </div>
      {statusText && <div className="mp-status-bar">{statusText}</div>}

      {/* Mobile: Mini opponent preview (floating button on left) */}
      <div
        className="mp-opponent-mini-preview"
        onClick={() => setShowOpponentExpanded(true)}
        role="button"
        tabIndex={0}
        aria-label="View opponent board"
      >
        <div className="mp-mini-preview-inner">
          <MiniGrid grid={opponentState?.grid || emptyOpponentState.grid} themeName={themeName} />
          {!opponentConnected && (
            <div className="mp-mini-preview-offline" />
          )}
        </div>
        <span className="mp-mini-preview-label">{displayOpponentName}</span>
      </div>

      {/* Mobile: Expanded opponent view modal */}
      {showOpponentExpanded && (
        <div className="mp-opponent-expanded-backdrop" onClick={() => setShowOpponentExpanded(false)}>
          <div className="mp-opponent-expanded-modal" onClick={e => e.stopPropagation()}>
            <div className="mp-opponent-expanded-header">
              <span className="mp-opponent-expanded-name">{displayOpponentName}</span>
              <span className="mp-opponent-expanded-score">{(opponentState?.score || 0).toLocaleString()}</span>
              <button className="mp-opponent-expanded-close" onClick={() => setShowOpponentExpanded(false)}>
                &times;
              </button>
            </div>
            <div className={`mp-opponent-expanded-board ${opponentDone || timerExpired || hasForfeit ? 'dimmed' : ''}`}>
              {!opponentConnected && (
                <div className="expanded-offline-overlay">
                  {opponentEverConnected ? 'Opponent disconnected...' : 'Connecting...'}
                </div>
              )}
              <ExpandedGrid grid={opponentState?.grid || emptyOpponentState.grid} themeName={themeName} />
            </div>
          </div>
        </div>
      )}

      <div className="boards-split">
        {/* Local board */}
        <div className={`mp-board-slot ${localDone || timerExpired || hasForfeit ? 'dimmed' : ''}`}>
          <Game2048
            onGameOver={handleLocalGameOver}
            onGameWon={handleLocalGameWon}
            onResetReady={handleResetReady}
            onStateChange={handleLocalStateChange}
            disableInputs={disableLocalInputs}
            onDevEndGameReady={isDev ? handleDevEndGameReady : undefined}
            hideScore
            themeName={themeName}
          />
          {isDev && !localDone && (
            <button className="dev-end-game-btn" onClick={() => devEndGameRef.current?.()}>
              DEV: End Game
            </button>
          )}
        </div>

        {/* Opponent board (desktop only - hidden on mobile) */}
        <div className={`mp-board-slot mp-opponent-desktop ${opponentDone || timerExpired || hasForfeit ? 'dimmed' : ''}`}>
          <div className="opponent-game-container">
            {!opponentConnected && (
              <div className="offline-overlay">
                {opponentEverConnected ? 'Opponent disconnected...' : 'Connecting...'}
              </div>
            )}
            <Game2048 readOnlyState={opponentState || emptyOpponentState} disableInputs={true} hideScore themeName={themeName} />
          </div>
        </div>
      </div>

      {/* Leave button at the bottom */}
      {!isMatchResolved && (
        <button className="mp-leave-bottom-btn" onClick={handleLeaveMatch}>
          Leave Match
        </button>
      )}
      </div>

      {/* Match Result Overlay Modal */}
      {showResultModal && isMatchResolved && (
        <div className="mp-result-backdrop" role="dialog" aria-modal="true">
          <div className="mp-result-card">
            <div className={`mp-result-banner ${getResultBannerClass()}`}>
              <h2 className="mp-result-title">{getResultTitle()}</h2>
              {getResultSubtitle() && (
                <p className={`mp-result-subtitle ${hasForfeit ? 'mp-result-forfeit-text' : ''}`}>
                  {getResultSubtitle()}
                </p>
              )}
            </div>

            <div className="mp-result-scores">
              <div className={`mp-score-column ${localWon && !isTie ? 'mp-score-winner' : ''}`}>
                <span className="mp-score-name">{myName}</span>
                <span className="mp-score-value">{(serverResult?.yourScore ?? localGameResult?.score ?? 0).toLocaleString()}</span>
                {localWon && !isTie && <span className="mp-score-badge">Winner</span>}
              </div>
              <div className="mp-score-vs">VS</div>
              <div className={`mp-score-column ${!localWon && !isTie ? 'mp-score-winner' : ''}`}>
                <span className="mp-score-name">{displayOpponentName}</span>
                <span className="mp-score-value">{(serverResult?.opponentScore ?? opponentState?.score ?? 0).toLocaleString()}</span>
                {!localWon && !isTie && <span className="mp-score-badge">Winner</span>}
              </div>
            </div>

            {/* ELO change — prominent pill */}
            {localEloDelta !== null && (
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

            {opponentWantsRematch && !localWantsRematch && (
              <p className="mp-rematch-hint">{displayOpponentName} wants a rematch!</p>
            )}

            <div className="mp-result-actions-stack">
              <button
                className="mp-result-btn-primary"
                onClick={requestRematch}
                disabled={localWantsRematch}
                style={localWantsRematch ? { opacity: 0.6, cursor: 'default' } : {}}
              >
                {localWantsRematch
                  ? opponentWantsRematch ? 'Starting...' : 'Waiting for opponent...'
                  : 'Rematch'}
              </button>
              <div className="mp-result-actions-row">
                <button className="mp-result-btn-secondary" onClick={handleNewOpponent}>New Opponent</button>
                <button className="mp-result-btn-secondary" onClick={handleLeaveMatch}>Menu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
