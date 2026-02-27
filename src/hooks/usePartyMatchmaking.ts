import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import type { LobbyServerMessage } from '@/lib/party/messages';

export type MatchmakingState = 'idle' | 'searching' | 'matched';

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';

export function usePartyMatchmaking() {
  const [state, setState] = useState<MatchmakingState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ username: string; elo: number } | null>(null);
  const [myId] = useState(() => Math.random().toString(36).substring(2, 10));

  const socketRef = useRef<PartySocket | null>(null);

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const startMatchmaking = useCallback((userId: string, username: string, elo: number) => {
    if (!userId) {
      console.error('[usePartyMatchmaking] No userId provided');
      return;
    }

    // Close existing connection
    cleanup();

    setState('searching');
    setRoomId(null);
    setOpponentInfo(null);

    // Connect to lobby
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: 'main-lobby',
      party: 'lobby',
    });

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[usePartyMatchmaking] Connected to lobby');
      // Join queue
      socket.send(JSON.stringify({
        type: 'join_queue',
        userId,
        username,
        elo,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message: LobbyServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'waiting':
            console.log(`[usePartyMatchmaking] In queue, position: ${message.position}`);
            break;

          case 'matched':
            console.log(`[usePartyMatchmaking] Matched! Room: ${message.roomId}`);
            setRoomId(message.roomId);
            setOpponentInfo(message.opponent);
            setState('matched');
            // Close lobby connection after match
            cleanup();
            break;

          case 'error':
            console.error('[usePartyMatchmaking] Error:', message.message);
            setState('idle');
            cleanup();
            break;
        }
      } catch (e) {
        console.error('[usePartyMatchmaking] Parse error:', e);
      }
    };

    socket.onclose = () => {
      console.log('[usePartyMatchmaking] Disconnected from lobby');
    };

    socket.onerror = (e) => {
      console.error('[usePartyMatchmaking] Socket error:', e);
    };
  }, [cleanup]);

  const cancelMatchmaking = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'leave_queue' }));
    }
    cleanup();
    setState('idle');
    setRoomId(null);
    setOpponentInfo(null);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    state,
    roomId,
    opponentInfo,
    startMatchmaking,
    cancelMatchmaking,
    myId,
  };
}
