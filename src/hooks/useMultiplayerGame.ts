import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { GameState } from '../components/Game2048';

const GAME_DURATION = 5 * 60; // 300 seconds
const TIMER_SYNC_INTERVAL = 10_000; // sync timer every 10 seconds
const DISCONNECT_GRACE_PERIOD = 10_000; // 10 seconds before forfeit

export function useMultiplayerGame(roomId: string | null, myId: string, myName?: string, myElo?: number) {
  const [opponentState, setOpponentState] = useState<GameState | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentEverConnected, setOpponentEverConnected] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentElo, setOpponentElo] = useState<number | null>(null);
  const [localWantsRematch, setLocalWantsRematch] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);

  // Timer & forfeit state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameStarted, setGameStarted] = useState(false);
  const [forfeitWin, setForfeitWin] = useState<'local' | 'opponent' | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const latestStateRef = useRef<GameState | null>(null);
  const opponentConnectedRef = useRef(false);

  // Timer refs
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(GAME_DURATION);
  const gameStartedRef = useRef(false);

  // Forfeit refs
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forfeitWinRef = useRef<'local' | 'opponent' | null>(null);

  const supabase = createClient();

  // Keep refs in sync with state
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);
  useEffect(() => { forfeitWinRef.current = forfeitWin; }, [forfeitWin]);

  // Helper: clear all timer intervals
  const clearTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (timerSyncIntervalRef.current) {
      clearInterval(timerSyncIntervalRef.current);
      timerSyncIntervalRef.current = null;
    }
  }, []);

  // Helper: clear disconnect grace timeout
  const clearDisconnectTimeout = useCallback(() => {
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
  }, []);

  // Start the countdown timer
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;

        if (next <= 0) {
          console.log('[MultiplayerGame] Timer reached 0 — broadcasting time_up');
          clearTimers();
          channelRef.current?.send({
            type: 'broadcast',
            event: 'time_up',
            payload: { userId: myId },
          });
          return 0;
        }
        return next;
      });
    }, 1000);

    // Periodically sync timer with opponent
    timerSyncIntervalRef.current = setInterval(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: { userId: myId, timeLeft: timeLeftRef.current },
      });
    }, TIMER_SYNC_INTERVAL);
  }, [clearTimers, myId]);

  // Reset timer (used during rematch)
  const resetTimer = useCallback(() => {
    clearTimers();
    clearDisconnectTimeout();
    setTimeLeft(GAME_DURATION);
    timeLeftRef.current = GAME_DURATION;
    setGameStarted(false);
    gameStartedRef.current = false;
    setForfeitWin(null);
    forfeitWinRef.current = null;
  }, [clearTimers, clearDisconnectTimeout]);

  // Start timer when opponent connects (both players present)
  useEffect(() => {
    if (opponentConnected && !gameStarted && forfeitWin === null) {
      console.log('[MultiplayerGame] Both players connected — starting 5-minute timer');
      setGameStarted(true);
      gameStartedRef.current = true;
      startTimer();
    }
  }, [opponentConnected, gameStarted, forfeitWin, startTimer]);

  // Forfeit logic: detect opponent disconnect after they were previously connected
  useEffect(() => {
    if (opponentEverConnected && !opponentConnected && gameStarted && forfeitWin === null) {
      console.log(`[MultiplayerGame] Opponent disconnected — starting ${DISCONNECT_GRACE_PERIOD / 1000}s forfeit grace period`);
      disconnectTimeoutRef.current = setTimeout(() => {
        if (!opponentConnectedRef.current && forfeitWinRef.current === null) {
          console.log('[MultiplayerGame] Grace period expired — declaring forfeit win for local player');
          setForfeitWin('local');
          forfeitWinRef.current = 'local';
          clearTimers();

          channelRef.current?.send({
            type: 'broadcast',
            event: 'forfeit',
            payload: { userId: myId, forfeitedBy: 'opponent' },
          });
        }
      }, DISCONNECT_GRACE_PERIOD);
    }

    if (opponentConnected) {
      console.log('[MultiplayerGame] Opponent reconnected — clearing forfeit grace period');
      clearDisconnectTimeout();
    }
  }, [opponentConnected, opponentEverConnected, gameStarted, forfeitWin, clearTimers, clearDisconnectTimeout, myId]);

  useEffect(() => {
    if (!roomId || !supabase) return;

    console.log('[MultiplayerGame] Joining game room:', roomId);
    const channel = supabase.channel(`game:${roomId}`, {
      config: {
        presence: { key: myId },
        broadcast: { ack: false }
      }
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.keys(state);
        console.log('[MultiplayerGame] Room presence sync:', users);
        const wasConnected = opponentConnectedRef.current;
        const nowConnected = users.length > 1;
        opponentConnectedRef.current = nowConnected;
        setOpponentConnected(nowConnected);
        if (nowConnected) setOpponentEverConnected(true);

        // Extract opponent name and ELO from presence metadata
        for (const userId of users) {
          if (userId !== myId) {
            const presences = state[userId] as Array<{ name?: string; elo?: number }>;
            if (presences?.[0]?.name) {
              setOpponentName(presences[0].name);
            }
            if (presences?.[0]?.elo !== undefined) {
              setOpponentElo(presences[0].elo);
            }
          }
        }

        // Resend latest state when opponent (re)connects so they aren't stale
        if (!wasConnected && nowConnected && latestStateRef.current) {
          console.log('[MultiplayerGame] Opponent (re)connected, resending latest state');
          channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload: { userId: myId, state: latestStateRef.current },
          });
        }
      })
      .on('broadcast', { event: 'game_state' }, (payload) => {
        if (payload.payload.userId !== myId) {
          setOpponentState(payload.payload.state);
        }
      })
      .on('broadcast', { event: 'rematch_request' }, (payload) => {
        if (payload.payload.userId !== myId) {
          console.log('[MultiplayerGame] Opponent wants rematch');
          setOpponentWantsRematch(true);
        }
      })
      .on('broadcast', { event: 'timer_sync' }, (payload) => {
        if (payload.payload.userId !== myId) {
          const theirTime = payload.payload.timeLeft as number;
          if (Math.abs(timeLeftRef.current - theirTime) > 2) {
            const syncedTime = Math.min(timeLeftRef.current, theirTime);
            setTimeLeft(syncedTime);
            timeLeftRef.current = syncedTime;
          }
        }
      })
      .on('broadcast', { event: 'time_up' }, (payload) => {
        if (payload.payload.userId !== myId) {
          clearTimers();
          setTimeLeft(0);
          timeLeftRef.current = 0;
        }
      })
      .on('broadcast', { event: 'forfeit' }, (payload) => {
        if (payload.payload.userId !== myId) {
          console.log('[MultiplayerGame] Received forfeit from opponent');
          setForfeitWin('opponent');
          forfeitWinRef.current = 'opponent';
          clearTimers();
        }
      })
      .subscribe(async (status) => {
        console.log('[MultiplayerGame] Room subscription status:', status);
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            name: myName || 'Player',
            elo: myElo ?? 1200,
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      opponentConnectedRef.current = false;
      setOpponentConnected(false);
      setOpponentState(null);
      clearTimers();
      clearDisconnectTimeout();
    };
  }, [roomId, supabase, myId, myName, myElo, clearTimers, clearDisconnectTimeout]);

  const sendGameState = useCallback((state: GameState) => {
    latestStateRef.current = state;
    if (channelRef.current) {
      if (state.gameOver || state.won) {
        console.log('[MultiplayerGame] Broadcasting game over/win state:', state);
      }
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { userId: myId, state },
      });
    }
  }, [myId]);

  // Voluntarily forfeit — call before leaving a live game
  const declareForfeit = useCallback(() => {
    clearTimers();
    clearDisconnectTimeout();
    channelRef.current?.send({
      type: 'broadcast',
      event: 'forfeit',
      payload: { userId: myId, forfeitedBy: 'self' },
    });
  }, [myId, clearTimers, clearDisconnectTimeout]);

  const requestRematch = useCallback(() => {
    setLocalWantsRematch(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'rematch_request',
        payload: { userId: myId },
      });
    }
  }, [myId]);

  const resetRematchState = useCallback(() => {
    setLocalWantsRematch(false);
    setOpponentWantsRematch(false);
    setOpponentState(null);
    latestStateRef.current = null;
    resetTimer();
  }, [resetTimer]);

  const rematchReady = localWantsRematch && opponentWantsRematch;

  return {
    opponentState, opponentConnected, opponentEverConnected, opponentName, opponentElo,
    sendGameState, requestRematch, resetRematchState, declareForfeit,
    localWantsRematch, opponentWantsRematch, rematchReady,
    timeLeft, gameStarted, forfeitWin,
  };
}
