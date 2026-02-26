import { useEffect, useState, useRef, useCallback } from 'react';
import type { GameState } from '../components/Game2048';

const GAME_DURATION = 5 * 60; // 300 seconds
const POLL_INTERVAL = 500; // Poll every 500ms for responsive gameplay
const DISCONNECT_THRESHOLD = 10000; // 10 seconds without update = disconnected

interface OpponentData {
  username: string;
  elo: number;
  grid: number[];
  score: number;
  game_over: boolean;
  won: boolean;
  wants_rematch: boolean;
  forfeited: boolean;
  updated_at: string;
}

export function useMultiplayerGame(
  roomId: string | null,
  myId: string,
  userId: string | null,
  myName?: string,
  myElo?: number
) {
  const [opponentState, setOpponentState] = useState<GameState | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentEverConnected, setOpponentEverConnected] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentElo, setOpponentElo] = useState<number | null>(null);
  const [localWantsRematch, setLocalWantsRematch] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [forfeitWin, setForfeitWin] = useState<'local' | 'opponent' | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameStarted, setGameStarted] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestStateRef = useRef<GameState | null>(null);
  const gameStartedRef = useRef(false);
  const initializedRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Initialize game state when joining room
  useEffect(() => {
    if (!roomId || !userId || !myName || initializedRef.current) return;

    initializedRef.current = true;

    fetch('/api/game-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        userId,
        username: myName,
        elo: myElo || 1200,
      }),
    }).catch(e => console.error('[useMultiplayerGame] Init error:', e));
  }, [roomId, userId, myName, myElo]);

  // Poll for opponent state
  useEffect(() => {
    if (!roomId || !userId) return;

    const pollOpponent = async () => {
      try {
        const res = await fetch(`/api/game-state?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (data.opponent) {
          const opp: OpponentData = data.opponent;

          setOpponentName(opp.username);
          setOpponentElo(opp.elo);
          setOpponentWantsRematch(opp.wants_rematch);

          // Check if opponent is still active (updated within threshold)
          const lastUpdate = new Date(opp.updated_at).getTime();
          const isConnected = Date.now() - lastUpdate < DISCONNECT_THRESHOLD;
          setOpponentConnected(isConnected);
          if (isConnected) setOpponentEverConnected(true);

          // Check forfeit
          if (opp.forfeited && !forfeitWin) {
            setForfeitWin('local');
          }

          setOpponentState({
            grid: opp.grid || Array(16).fill(0),
            score: opp.score,
            gameOver: opp.game_over,
            won: opp.won,
          });

          // Start timer when opponent connects
          if (isConnected && !gameStartedRef.current) {
            gameStartedRef.current = true;
            setGameStarted(true);
          }
        }
      } catch (e) {
        console.error('[useMultiplayerGame] Poll error:', e);
      }
    };

    // Initial poll
    pollOpponent();

    // Start polling
    pollIntervalRef.current = setInterval(pollOpponent, POLL_INTERVAL);

    return () => clearPolling();
  }, [roomId, userId, clearPolling, forfeitWin]);

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || timerIntervalRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [gameStarted, clearTimer]);

  // Send game state to server
  const sendGameState = useCallback(async (state: GameState) => {
    if (!roomId || !userId) return;

    latestStateRef.current = state;

    try {
      await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId,
          grid: state.grid,
          score: state.score,
          gameOver: state.gameOver,
          won: state.won,
        }),
      });
    } catch (e) {
      console.error('[useMultiplayerGame] Send state error:', e);
    }
  }, [roomId, userId]);

  // Request rematch
  const requestRematch = useCallback(async () => {
    if (!roomId || !userId) return;

    setLocalWantsRematch(true);

    try {
      await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId,
          wantsRematch: true,
        }),
      });
    } catch (e) {
      console.error('[useMultiplayerGame] Rematch error:', e);
    }
  }, [roomId, userId]);

  // Reset rematch state (when rematch starts)
  const resetRematchState = useCallback(async () => {
    if (!roomId || !userId) return;

    setLocalWantsRematch(false);
    setOpponentWantsRematch(false);
    setOpponentState(null);
    latestStateRef.current = null;
    setTimeLeft(GAME_DURATION);
    setGameStarted(false);
    gameStartedRef.current = false;
    setForfeitWin(null);

    try {
      await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId,
          grid: [],
          score: 0,
          gameOver: false,
          won: false,
          wantsRematch: false,
          forfeited: false,
        }),
      });
    } catch (e) {
      console.error('[useMultiplayerGame] Reset error:', e);
    }
  }, [roomId, userId]);

  // Declare forfeit
  const declareForfeit = useCallback(async () => {
    if (!roomId || !userId) return;

    clearTimer();
    clearPolling();

    try {
      await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId,
          forfeited: true,
        }),
      });
    } catch (e) {
      console.error('[useMultiplayerGame] Forfeit error:', e);
    }
  }, [roomId, userId, clearTimer, clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
      clearTimer();
      initializedRef.current = false;
    };
  }, [clearPolling, clearTimer]);

  const rematchReady = localWantsRematch && opponentWantsRematch;

  return {
    opponentState,
    opponentConnected,
    opponentEverConnected,
    opponentName,
    opponentElo,
    sendGameState,
    requestRematch,
    resetRematchState,
    declareForfeit,
    localWantsRematch,
    opponentWantsRematch,
    rematchReady,
    timeLeft,
    gameStarted,
    forfeitWin,
  };
}
