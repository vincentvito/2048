import { useEffect, useState, useRef } from 'react';
import { createClient } from '../lib/supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type MatchmakingState = 'idle' | 'searching' | 'matched';

// Debug logging helper - sends to server for Vercel logs
function logMatchmaking(event: string, data: Record<string, unknown> = {}) {
  console.log(`[Matchmaking] ${event}`, data);
  fetch('/api/debug/matchmaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...data }),
  }).catch(() => { /* ignore logging errors */ });
}

export function useMatchmaking() {
  const [state, setState] = useState<MatchmakingState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  // Persistent deterministic ID for this session
  const [myId] = useState(() => Math.random().toString(36).substring(2, 10));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const startMatchmaking = () => {
    if (!supabase) {
      logMatchmaking('start_failed', { reason: 'no_supabase_client', myId });
      return;
    }
    logMatchmaking('start', { myId });
    setState('searching');
    setRoomId(null);
  };

  const cancelMatchmaking = () => {
    logMatchmaking('cancel', { myId });
    setState('idle');
    setRoomId(null);
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  };

  useEffect(() => {
    // Always log when effect runs
    logMatchmaking('effect_triggered', {
      myId,
      state,
      hasSupabase: !!supabase,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) || 'MISSING'
    });

    if (state !== 'searching') {
      return;
    }

    if (!supabase) {
      logMatchmaking('effect_no_supabase', { myId });
      return;
    }

    logMatchmaking('creating_channel', { myId, channel: 'matchmaking:4x4' });

    const channel = supabase.channel('matchmaking:4x4', {
      config: {
        presence: {
          key: myId,
        },
      },
    });
    channelRef.current = channel;

    let matchFound = false;

    function completeMatch(newRoomId: string) {
      if (matchFound) return;
      matchFound = true;
      logMatchmaking('match_complete', { myId, roomId: newRoomId });
      setRoomId(newRoomId);
      setState('matched');
      // Delay unsubscribe so the broadcast reaches the other player
      setTimeout(() => {
        channel.unsubscribe();
        channelRef.current = null;
      }, 2000);
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        if (matchFound) return;

        const presenceState = channel.presenceState();
        const users = Object.keys(presenceState);

        logMatchmaking('presence_sync', { myId, userCount: users.length, users });

        if (users.length < 2) return;

        // Deterministic pairing: sort all IDs and pair [0,1], [2,3], etc.
        const sortedUsers = [...users].sort();
        const myIndex = sortedUsers.indexOf(myId);
        const pairStart = Math.floor(myIndex / 2) * 2;

        // Only match if we have a complete pair
        if (pairStart + 1 < sortedUsers.length) {
          const player1 = sortedUsers[pairStart];
          const player2 = sortedUsers[pairStart + 1];
          const newRoomId = `game_4x4_${player1}_${player2}`;

          // Broadcast match to the channel so the other player gets it
          // even if they miss the presence sync
          channel.send({
            type: 'broadcast',
            event: 'match_found',
            payload: { roomId: newRoomId },
          });

          completeMatch(newRoomId);
        }
      })
      .on('broadcast', { event: 'match_found' }, (msg) => {
        // If the other player found the match first via presence,
        // we receive it here even if we missed the presence sync
        const newRoomId = msg.payload.roomId as string;
        if (newRoomId && newRoomId.includes(myId)) {
          completeMatch(newRoomId);
        }
      })
      .subscribe(async (status, err) => {
        logMatchmaking('channel_status', { myId, channelStatus: status, error: err?.message });
        if (status === 'SUBSCRIBED') {
          logMatchmaking('tracking_presence', { myId });
          await channel.track({ online_at: new Date().toISOString() });
          logMatchmaking('presence_tracked', { myId });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logMatchmaking('channel_failed', { myId, channelStatus: status, error: err?.message });
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [state, supabase, myId]);

  return { state, roomId, startMatchmaking, cancelMatchmaking, myId };
}
