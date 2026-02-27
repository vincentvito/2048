import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import type { GameState } from '../components/Game2048';
import type { GameServerMessage } from '@/lib/party/messages';

const GAME_DURATION = 5 * 60; // 300 seconds
const HEARTBEAT_INTERVAL = 5000; // Send heartbeat every 5 seconds

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';

export function usePartyGame(
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

  const socketRef = useRef<PartySocket | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  const pendingStateRef = useRef<GameState | null>(null); // Queue state until socket connects
  const socketReadyRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connect to game room
  useEffect(() => {
    if (!roomId || !userId || !myName || initializedRef.current) return;

    initializedRef.current = true;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      // Default party (game)
    });

    socketRef.current = socket;

    socket.onopen = () => {
      console.log(`[usePartyGame] Connected to room ${roomId}`);
      socketReadyRef.current = true;

      // Join the game
      socket.send(JSON.stringify({
        type: 'join',
        userId,
        username: myName,
        elo: myElo || 1200,
      }));

      // Send any pending state (initial game state that was queued)
      if (pendingStateRef.current) {
        console.log('[usePartyGame] Sending queued initial state');
        socket.send(JSON.stringify({
          type: 'state_update',
          state: {
            grid: pendingStateRef.current.grid,
            score: pendingStateRef.current.score,
            gameOver: pendingStateRef.current.gameOver,
            won: pendingStateRef.current.won,
          },
        }));
        pendingStateRef.current = null;
      }

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    socket.onmessage = (event) => {
      try {
        const message: GameServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'player_joined':
            console.log(`[usePartyGame] Player joined: ${message.username}`);
            if (message.playerId !== userId) {
              setOpponentName(message.username);
              setOpponentElo(message.elo);
              setOpponentConnected(true);
              setOpponentEverConnected(true);
            }
            break;

          case 'player_left':
            console.log(`[usePartyGame] Player left: ${message.playerId}`);
            if (message.playerId !== userId) {
              setOpponentConnected(false);
            }
            break;

          case 'game_start':
            console.log('[usePartyGame] Game starting!', message.players);
            // Find opponent info
            const opponent = message.players.find(p => p.id !== userId);
            if (opponent) {
              setOpponentName(opponent.username);
              setOpponentElo(opponent.elo);
              setOpponentConnected(true);
              setOpponentEverConnected(true);
            }
            setGameStarted(true);
            break;

          case 'opponent_state':
            setOpponentName(message.username);
            setOpponentElo(message.elo);
            setOpponentConnected(true);
            setOpponentEverConnected(true);
            setOpponentState({
              grid: message.state.grid || Array(16).fill(0),
              score: message.state.score,
              gameOver: message.state.gameOver,
              won: message.state.won,
            });
            break;

          case 'opponent_connected':
            setOpponentConnected(message.connected);
            if (message.connected) {
              setOpponentEverConnected(true);
            }
            break;

          case 'rematch_requested':
            console.log('[usePartyGame] Opponent wants rematch');
            setOpponentWantsRematch(true);
            break;

          case 'rematch_start':
            console.log('[usePartyGame] Rematch starting!');
            // Reset is handled by the component via rematchReady
            break;

          case 'opponent_forfeited':
            console.log('[usePartyGame] Opponent forfeited');
            setForfeitWin('local');
            break;

          case 'error':
            console.error('[usePartyGame] Error:', message.message);
            break;
        }
      } catch (e) {
        console.error('[usePartyGame] Parse error:', e);
      }
    };

    socket.onclose = () => {
      console.log('[usePartyGame] Disconnected from game room');
      socketReadyRef.current = false;
    };

    socket.onerror = (e) => {
      console.error('[usePartyGame] Socket error:', e);
    };

    return () => {
      clearTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [roomId, userId, myName, myElo, clearTimer]);

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

  // Send game state to server (instant via WebSocket)
  const sendGameState = useCallback((state: GameState) => {
    // Queue state if socket isn't ready yet (for initial game state)
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      pendingStateRef.current = state;
      return;
    }

    socketRef.current.send(JSON.stringify({
      type: 'state_update',
      state: {
        grid: state.grid,
        score: state.score,
        gameOver: state.gameOver,
        won: state.won,
      },
    }));
  }, []);

  // Request rematch
  const requestRematch = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    setLocalWantsRematch(true);
    socketRef.current.send(JSON.stringify({ type: 'request_rematch' }));
  }, []);

  // Reset rematch state
  const resetRematchState = useCallback(() => {
    setLocalWantsRematch(false);
    setOpponentWantsRematch(false);
    setOpponentState(null);
    setTimeLeft(GAME_DURATION);
    setGameStarted(false);
    setForfeitWin(null);
  }, []);

  // Declare forfeit
  const declareForfeit = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    clearTimer();
    socketRef.current.send(JSON.stringify({ type: 'forfeit' }));
  }, [clearTimer]);

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
