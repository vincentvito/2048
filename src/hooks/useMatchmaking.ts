import { useEffect, useState, useRef } from 'react';
import { createClient } from '../lib/supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type MatchmakingState = 'idle' | 'searching' | 'matched';

export function useMatchmaking() {
  const [state, setState] = useState<MatchmakingState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  // Persistent deterministic ID for this session
  const [myId] = useState(() => Math.random().toString(36).substring(2, 10));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const startMatchmaking = () => {
    if (!supabase) return;
    setState('searching');
    setRoomId(null);
  };

  const cancelMatchmaking = () => {
    setState('idle');
    setRoomId(null);
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  };

  useEffect(() => {
    if (state !== 'searching' || !supabase) return;

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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
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
