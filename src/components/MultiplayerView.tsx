"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import Game2048, { GameState } from './Game2048';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-client';
import { Session } from '@supabase/supabase-js';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { calculateElo, getEloRank, DEFAULT_ELO } from '@/lib/elo';
import { getOrCreatePlayerStats, updateStatsAfterGame, PlayerStats } from '@/lib/player-stats';

/** Format seconds into MM:SS display */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MultiplayerView() {
  const { state: matchmakingState, roomId, startMatchmaking, cancelMatchmaking, myId } = useMatchmaking();

  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Player stats for lobby display
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ELO state for result modal
  const [localEloDelta, setLocalEloDelta] = useState<number | null>(null);
  const [opponentEloDelta, setOpponentEloDelta] = useState<number | null>(null);
  const [localEloAfter, setLocalEloAfter] = useState<number | null>(null);
  const [eloProcessed, setEloProcessed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setSessionLoaded(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Read display name from user_metadata (set via UsernamePrompt)
  const myName = useMemo(() => {
    const meta = session?.user?.user_metadata;
    if (meta?.username) return meta.username as string;
    if (!session?.user?.email) return 'You';
    const local = session.user.email.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [session]);

  // Fetch player stats when session is available
  useEffect(() => {
    if (!session?.user?.id) {
      setPlayerStats(null);
      return;
    }
    setStatsLoading(true);
    getOrCreatePlayerStats(session.user.id, myName)
      .then((stats) => setPlayerStats(stats))
      .catch(() => setPlayerStats(null))
      .finally(() => setStatsLoading(false));
  }, [session?.user?.id, myName]);

  const myElo = playerStats?.elo ?? DEFAULT_ELO;

  const {
    opponentState, opponentConnected, opponentEverConnected, opponentName, opponentElo,
    sendGameState, requestRematch, resetRematchState, declareForfeit,
    localWantsRematch, opponentWantsRematch, rematchReady,
    timeLeft, gameStarted, forfeitWin,
  } = useMultiplayerGame(roomId, myId, myName, myElo);

  const [localGameResult, setLocalGameResult] = useState<{ won: boolean; score: number; gameOver: boolean } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const localGameResetRef = useRef<(() => void) | null>(null);
  const devEndGameRef = useRef<(() => void) | null>(null);
  const confettiFiredRef = useRef(false);
  const isDev = process.env.NODE_ENV === 'development';

  async function handleSendOtp() {
    if (!email.trim() || sending) return;

    const supabase = createClient();
    if (!supabase) return;

    setOtpError("");
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setOtpError(error.message);
      } else {
        setEmailSent(true);
      }
    } catch {
      setOtpError("Failed to send code");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || verifying) return;

    const supabase = createClient();
    if (!supabase) return;

    setOtpError("");
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });
      if (error) {
        setOtpError(error.message);
      }
    } catch {
      setOtpError("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

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
    if (state.won || state.gameOver) {
      setLocalGameResult({ won: state.won, score: state.score, gameOver: state.gameOver });
    }
  }, [sendGameState]);

  const handleResetReady = useCallback((resetFn: () => void) => {
    localGameResetRef.current = resetFn;
  }, []);

  const handleDevEndGameReady = useCallback((fn: () => void) => {
    devEndGameRef.current = fn;
  }, []);

  const handleLeaveMatch = () => {
    // If a live game is in progress, broadcast forfeit so opponent gets the win
    if (gameStarted && !isMatchResolved) {
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
    startMatchmaking();
  };

  // Derive match resolution state (must be before early returns so hooks are stable)
  const localDone = !!(localGameResult?.gameOver || localGameResult?.won);
  const opponentDone = !!(opponentState?.gameOver || opponentState?.won);
  const someoneWon2048 = !!(localGameResult?.won || opponentState?.won);
  const timerExpired = timeLeft === 0 && gameStarted;
  const hasForfeit = !!forfeitWin;

  const isMatchResolved = someoneWon2048 || (localDone && opponentDone) || timerExpired || hasForfeit;

  const localWon = (() => {
    if (forfeitWin === 'local') return true;
    if (forfeitWin === 'opponent') return false;
    if (someoneWon2048) return !!localGameResult?.won;
    if (timerExpired || (localDone && opponentDone)) {
      return (localGameResult?.score || 0) > (opponentState?.score || 0);
    }
    return false;
  })();

  const isTie = !hasForfeit && !someoneWon2048 &&
    (timerExpired || (localDone && opponentDone)) &&
    (localGameResult?.score || 0) === (opponentState?.score || 0);

  // Disable local inputs when done
  const disableLocalInputs = localDone || someoneWon2048 || timerExpired || hasForfeit;

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
      const localScore = localGameResult?.score || 0;

      const outcome: 'win' | 'loss' | 'tie' = isTie ? 'tie' : localWon ? 'win' : 'loss';
      const oppElo = opponentElo ?? DEFAULT_ELO;

      const result = calculateElo(myElo, oppElo, outcome);

      setLocalEloDelta(result.playerDelta);
      setOpponentEloDelta(result.opponentDelta);
      setLocalEloAfter(result.newPlayerElo);

      // Update stats in Supabase
      if (session?.user?.id) {
        try {
          await updateStatsAfterGame(session.user.id, {
            won: localWon,
            tied: isTie,
            score: localScore,
            newElo: result.newPlayerElo,
          });
          // Refresh local stats
          const updated = await getOrCreatePlayerStats(session.user.id, myName);
          setPlayerStats(updated);
        } catch (err) {
          console.error('[MultiplayerView] Failed to update stats:', err);
        }
      }
    };

    processElo();
  }, [isMatchResolved, eloProcessed, localGameResult, opponentState, localWon, isTie, myElo, opponentElo, session?.user?.id, myName]);

  // Fire confetti when local player wins
  useEffect(() => {
    if (isMatchResolved && localWon && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const end = Date.now() + 2000;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#f59e0b', '#d97706', '#fbbf24', '#78350f', '#fde68a'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#f59e0b', '#d97706', '#fbbf24', '#78350f', '#fde68a'],
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

    if (!session && isSupabaseConfigured()) {
      return (
        <div className="matchmaking-container">
          <h2>Login to play Multiplayer</h2>
          <p>You need an account to be matched with online players.</p>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            {!showEmail && !emailSent ? (
              <button
                type="button"
                className="modal-btn-leaderboard"
                style={{ width: '100%', maxWidth: '300px' }}
                onClick={() => setShowEmail(true)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="modal-btn-icon">
                  <path d="M4 12V10M8 12V8M12 12V6M2 4L8 2L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign in with email
              </button>
            ) : showEmail && !emailSent ? (
              <div className="modal-email-section" style={{ width: '100%', maxWidth: '300px' }}>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendOtp();
                  }}
                  autoFocus
                />
                {otpError && <p className="modal-error">{otpError}</p>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn-secondary"
                    onClick={() => { setShowEmail(false); setOtpError(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-btn-primary"
                    onClick={handleSendOtp}
                    disabled={sending || !email.trim()}
                  >
                    {sending ? "Sending..." : "Send Code"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-email-section" style={{ width: '100%', maxWidth: '300px' }}>
                <p className="modal-success">
                  Enter the 6-digit code sent to {email}
                </p>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="12345678"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyOtp();
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />
                {otpError && <p className="modal-error">{otpError}</p>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn-secondary"
                    onClick={() => { setEmailSent(false); setOtpCode(""); setOtpError(""); }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="modal-btn-primary"
                    onClick={handleVerifyOtp}
                    disabled={verifying || otpCode.length < 6}
                  >
                    {verifying ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </div>
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
        <button className="mp-find-btn" onClick={startMatchmaking}>Find Match</button>

        {statsLoading && (
          <div className="mp-stats-card" style={{ marginTop: 20 }}>
            <p style={{ margin: 0, color: '#92400e', fontSize: '13px', textAlign: 'center' }}>Loading stats...</p>
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
    if (localDone) statusText = "You ran out of moves. Waiting for opponent...";
    else if (opponentDone) statusText = `${opponentName || 'Opponent'} ran out of moves. Keep playing!`;
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
    if (timerExpired) return "Time's up!";
    if (someoneWon2048) return localWon ? 'You reached 2048!' : `${displayOpponentName} reached 2048!`;
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
          />
          {isDev && !localDone && (
            <button className="dev-end-game-btn" onClick={() => devEndGameRef.current?.()}>
              DEV: End Game
            </button>
          )}
        </div>

        {/* Opponent board */}
        <div className={`mp-board-slot ${opponentDone || timerExpired || hasForfeit ? 'dimmed' : ''}`}>
          <div className="opponent-game-container">
            {!opponentConnected && (
              <div className="offline-overlay">
                {opponentEverConnected ? 'Opponent disconnected...' : 'Connecting...'}
              </div>
            )}
            <Game2048 readOnlyState={opponentState || emptyOpponentState} disableInputs={true} hideScore />
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
                <span className="mp-score-value">{(localGameResult?.score || 0).toLocaleString()}</span>
                {localWon && !isTie && <span className="mp-score-badge">Winner</span>}
              </div>
              <div className="mp-score-vs">VS</div>
              <div className={`mp-score-column ${!localWon && !isTie ? 'mp-score-winner' : ''}`}>
                <span className="mp-score-name">{displayOpponentName}</span>
                <span className="mp-score-value">{(opponentState?.score || 0).toLocaleString()}</span>
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
