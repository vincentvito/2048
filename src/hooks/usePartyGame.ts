import { useEffect, useState, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import type { GameState } from "../components/Game2048";
import type { GameServerMessage, GameMode } from "@/lib/party/messages";

const GAME_DURATION = 5 * 60;
const HEARTBEAT_INTERVAL = 5000;
const IS_DEV = process.env.NODE_ENV === "development";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export function usePartyGame(
  roomId: string | null,
  myId: string,
  userId: string | null,
  myName?: string,
  myElo?: number,
  gameMode: GameMode = "ranked",
  botOpponent?: { username: string; elo: number } | null
) {
  const [opponentState, setOpponentState] = useState<GameState | null>(null);
  const [restoredLocalState, setRestoredLocalState] = useState<GameState | null>(null);
  const [initialServerState, setInitialServerState] = useState<GameState | null>(null);
  const [serverGameState, setServerGameState] = useState<GameState | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentEverConnected, setOpponentEverConnected] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentElo, setOpponentElo] = useState<number | null>(null);
  const [opponentIsBot, setOpponentIsBot] = useState(false);
  const [localWantsRematch, setLocalWantsRematch] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [forfeitWin, setForfeitWin] = useState<"local" | "opponent" | null>(null);
  const [serverResult, setServerResult] = useState<{
    outcome: "win" | "loss" | "tie";
    yourScore: number;
    opponentScore: number;
    reason: "score" | "2048" | "forfeit" | "timer" | "no_moves";
  } | null>(null);

  const gameDurationRef = useRef(GAME_DURATION);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameStarted, setGameStarted] = useState(false);
  const [rematchStarted, setRematchStarted] = useState(false);

  const socketRef = useRef<PartySocket | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  const pendingStateRef = useRef<GameState | null>(null);
  const socketReadyRef = useRef(false);
  const timerExpiredSentRef = useRef(false);

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

  // Reset all state when roomId changes
  useEffect(() => {
    setOpponentState(null);
    setRestoredLocalState(null);
    setInitialServerState(null);
    setServerGameState(null);
    setOpponentConnected(false);
    setOpponentEverConnected(false);
    setOpponentName(null);
    setOpponentElo(null);
    setOpponentIsBot(false);
    setLocalWantsRematch(false);
    setOpponentWantsRematch(false);
    setForfeitWin(null);
    setServerResult(null);
    gameDurationRef.current = GAME_DURATION;
    setTimeLeft(GAME_DURATION);
    setGameStarted(false);
    initializedRef.current = false;
    socketReadyRef.current = false;
    pendingStateRef.current = null;
    timerExpiredSentRef.current = false;
  }, [roomId]);

  // Use refs for values that may change but shouldn't cause reconnection
  const userIdRef = useRef(userId);
  const myNameRef = useRef(myName);
  const myEloRef = useRef(myElo);
  const gameModeRef = useRef(gameMode);
  const botOpponentRef = useRef(botOpponent);
  userIdRef.current = userId;
  myNameRef.current = myName;
  myEloRef.current = myElo;
  gameModeRef.current = gameMode;
  botOpponentRef.current = botOpponent;

  // Connect to game room — only reconnect when roomId changes
  useEffect(() => {
    if (!roomId || !userIdRef.current || !myNameRef.current || initializedRef.current) return;

    if (IS_DEV) {
      console.log(
        `[usePartyGame] Connecting to room=${roomId} userId=${userIdRef.current} name=${myNameRef.current}`
      );
    }
    initializedRef.current = true;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.onopen = () => {
      socketReadyRef.current = true;

      const joinMessage: Record<string, unknown> = {
        type: "join",
        userId: userIdRef.current,
        username: myNameRef.current,
        elo: myEloRef.current || 1200,
        mode: gameModeRef.current,
      };

      if (botOpponentRef.current) {
        joinMessage.botOpponent = botOpponentRef.current;
      }

      socket.send(JSON.stringify(joinMessage));

      // Send any pending state (legacy path for backward compat)
      if (pendingStateRef.current) {
        socket.send(
          JSON.stringify({
            type: "state_update",
            state: {
              grid: pendingStateRef.current.grid,
              score: pendingStateRef.current.score,
              gameOver: pendingStateRef.current.gameOver,
              won: pendingStateRef.current.won,
            },
          })
        );
        pendingStateRef.current = null;
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    socket.onmessage = (event) => {
      try {
        const message: GameServerMessage = JSON.parse(event.data);
        if (IS_DEV) {
          console.log(
            `[usePartyGame] Received: ${message.type}`,
            message.type === "opponent_state" ? `score=${message.state.score}` : ""
          );
        }

        switch (message.type) {
          case "player_joined":
            if (message.playerId !== userIdRef.current) {
              setOpponentName(message.username);
              setOpponentElo(message.elo);
              setOpponentIsBot(!!message.isBot);
              setOpponentConnected(true);
              setOpponentEverConnected(true);
            }
            break;

          case "player_left":
            if (message.playerId !== userIdRef.current) {
              setOpponentConnected(false);
            }
            break;

          case "game_start": {
            const opp = message.players.find((p) => p.id !== userIdRef.current);
            if (opp) {
              setOpponentName(opp.username);
              setOpponentElo(opp.elo);
              setOpponentIsBot(!!opp.isBot);
              setOpponentConnected(true);
              setOpponentEverConnected(true);
            }
            const localState = message.states?.find(
              (state) => state.id === userIdRef.current
            )?.state;
            if (localState) {
              setInitialServerState({
                grid: localState.grid || Array(16).fill(0),
                score: localState.score,
                gameOver: localState.gameOver,
                won: localState.won,
              });
            }
            const opponentState = message.states?.find(
              (state) => state.id !== userIdRef.current
            )?.state;
            if (opponentState) {
              setOpponentState({
                grid: opponentState.grid || Array(16).fill(0),
                score: opponentState.score,
                gameOver: opponentState.gameOver,
                won: opponentState.won,
              });
            }
            if (message.timeRemaining !== undefined) {
              gameDurationRef.current = message.duration;
              setTimeLeft(message.timeRemaining);
            } else if (message.duration) {
              gameDurationRef.current = message.duration;
              setTimeLeft(message.duration);
            }
            setGameStarted(true);
            break;
          }

          case "your_initial_state":
            // Server-generated initial board
            setInitialServerState({
              grid: message.state.grid || Array(16).fill(0),
              score: message.state.score,
              gameOver: message.state.gameOver,
              won: message.state.won,
            });
            break;

          case "your_game_state":
            // Server-authoritative state after a move
            setServerGameState({
              grid: message.state.grid || Array(16).fill(0),
              score: message.state.score,
              gameOver: message.state.gameOver,
              won: message.state.won,
            });
            break;

          case "opponent_state":
            setOpponentName(message.username);
            setOpponentElo(message.elo);
            if (message.isBot !== undefined) {
              setOpponentIsBot(!!message.isBot);
            }
            setOpponentConnected(true);
            setOpponentEverConnected(true);
            setOpponentState({
              grid: message.state.grid || Array(16).fill(0),
              score: message.state.score,
              gameOver: message.state.gameOver,
              won: message.state.won,
            });
            break;

          case "your_state":
            setRestoredLocalState({
              grid: message.state.grid || Array(16).fill(0),
              score: message.state.score,
              gameOver: message.state.gameOver,
              won: message.state.won,
            });
            break;

          case "opponent_connected":
            setOpponentConnected(message.connected);
            if (message.connected) {
              setOpponentEverConnected(true);
            }
            break;

          case "rematch_requested":
            setOpponentWantsRematch(true);
            break;

          case "rematch_start":
            setRematchStarted(true);
            setLocalWantsRematch(false);
            setOpponentWantsRematch(false);
            setServerResult(null);
            setForfeitWin(null);
            setOpponentState(null);
            setServerGameState(null);
            setInitialServerState(null);
            break;

          case "opponent_forfeited":
            setForfeitWin("local");
            break;

          case "game_result":
            setServerResult({
              outcome: message.outcome,
              yourScore: message.yourScore,
              opponentScore: message.opponentScore,
              reason: message.reason,
            });
            break;

          case "error":
            console.error("[usePartyGame] Error:", message.message);
            break;
        }
      } catch (e) {
        console.error("[usePartyGame] Parse error:", e);
      }
    };

    socket.onclose = () => {
      socketReadyRef.current = false;
    };

    socket.onerror = (e) => {
      console.error("[usePartyGame] Socket error:", e);
    };

    return () => {
      clearTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, clearTimer]);

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || timerIntervalRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [gameStarted, clearTimer]);

  // Send timer_expired to server when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && gameStarted && !timerExpiredSentRef.current) {
      timerExpiredSentRef.current = true;
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "timer_expired" }));
      }
    }
  }, [timeLeft, gameStarted]);

  /** Send a move direction to the server (server-authoritative path). */
  const sendMove = useCallback((direction: number) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "move", direction }));
  }, []);

  /** Send full game state (legacy path — kept for backward compat). */
  const sendGameState = useCallback((state: GameState) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      pendingStateRef.current = state;
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "state_update",
        state: {
          grid: state.grid,
          score: state.score,
          gameOver: state.gameOver,
          won: state.won,
        },
      })
    );
  }, []);

  const requestRematch = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    setLocalWantsRematch(true);
    socketRef.current.send(JSON.stringify({ type: "request_rematch" }));
  }, []);

  const resetRematchState = useCallback(() => {
    setLocalWantsRematch(false);
    setOpponentWantsRematch(false);
    setOpponentState(null);
    setTimeLeft(gameDurationRef.current);
    setGameStarted(false);
    setForfeitWin(null);
    setServerResult(null);
    setServerGameState(null);
    setInitialServerState(null);
    timerExpiredSentRef.current = false;
  }, []);

  const declareForfeit = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    clearTimer();
    socketRef.current.send(JSON.stringify({ type: "forfeit" }));
  }, [clearTimer]);

  const rematchReady = localWantsRematch && opponentWantsRematch;

  const clearRematchStarted = useCallback(() => {
    setRematchStarted(false);
  }, []);

  return {
    opponentState,
    restoredLocalState,
    initialServerState,
    serverGameState,
    opponentConnected,
    opponentEverConnected,
    opponentName,
    opponentElo,
    opponentIsBot,
    sendMove,
    sendGameState,
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
  };
}
