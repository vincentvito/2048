import { useEffect, useState, useRef, useCallback } from 'react';

export type MatchmakingState = 'idle' | 'searching' | 'matched';

interface MatchmakingResult {
  status: 'idle' | 'searching' | 'matched' | 'expired';
  roomId?: string;
  opponent?: { username: string; elo: number };
  error?: string;
}

const POLL_INTERVAL = 1500; // Poll every 1.5 seconds

export function useMatchmaking() {
  const [state, setState] = useState<MatchmakingState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ username: string; elo: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [myId] = useState(() => Math.random().toString(36).substring(2, 10));

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const pollMatchStatus = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/matchmaking?userId=${encodeURIComponent(uid)}`);
      const data: MatchmakingResult = await res.json();

      if (data.status === 'matched' && data.roomId) {
        setRoomId(data.roomId);
        setOpponentInfo(data.opponent || null);
        setState('matched');
        clearPolling();
      } else if (data.status === 'expired' || data.status === 'idle') {
        setState('idle');
        clearPolling();
      }
      // If still 'searching', continue polling
    } catch (e) {
      console.error('[useMatchmaking] Poll error:', e);
    }
  }, [clearPolling]);

  const startMatchmaking = useCallback(async (uid: string, username: string, elo: number) => {
    if (!uid) {
      console.error('[useMatchmaking] No userId provided');
      return;
    }

    setUserId(uid);
    setState('searching');
    setRoomId(null);
    setOpponentInfo(null);

    try {
      // Join queue via API
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, username, elo }),
      });

      const data: MatchmakingResult = await res.json();

      if (data.status === 'matched' && data.roomId) {
        // Immediate match found
        setRoomId(data.roomId);
        setOpponentInfo(data.opponent || null);
        setState('matched');
        return;
      }

      // Start polling for match
      clearPolling();
      pollIntervalRef.current = setInterval(() => {
        pollMatchStatus(uid);
      }, POLL_INTERVAL);
    } catch (e) {
      console.error('[useMatchmaking] Start error:', e);
      setState('idle');
    }
  }, [clearPolling, pollMatchStatus]);

  const cancelMatchmaking = useCallback(async () => {
    clearPolling();
    setState('idle');
    setRoomId(null);
    setOpponentInfo(null);

    if (userId) {
      try {
        await fetch(`/api/matchmaking?userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.error('[useMatchmaking] Cancel error:', e);
      }
    }
  }, [userId, clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    state,
    roomId,
    opponentInfo,
    startMatchmaking,
    cancelMatchmaking,
    myId,
  };
}
