import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const QUEUE_TIMEOUT_MS = 120000; // 2 minutes

// GET /api/matchmaking?userId=xxx - Poll for match status
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get user's queue entry
    const { data: entry, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['searching', 'matched'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API /matchmaking GET] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!entry) {
      return NextResponse.json({ status: 'idle', entry: null });
    }

    // Check if entry expired
    const age = Date.now() - new Date(entry.created_at).getTime();
    if (age > QUEUE_TIMEOUT_MS && entry.status === 'searching') {
      // Mark as expired
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'expired' })
        .eq('id', entry.id);
      return NextResponse.json({ status: 'expired', entry: null });
    }

    if (entry.status === 'matched' && entry.room_id) {
      // Get opponent info
      const { data: opponent } = await supabase
        .from('matchmaking_queue')
        .select('username, elo')
        .eq('room_id', entry.room_id)
        .neq('user_id', userId)
        .single();

      return NextResponse.json({
        status: 'matched',
        roomId: entry.room_id,
        opponent: opponent || null,
      });
    }

    return NextResponse.json({ status: 'searching', entry });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /matchmaking GET] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/matchmaking - Join queue and try to find match
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, username, elo } = body;

    if (!userId || !username) {
      return NextResponse.json({ error: 'userId and username required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Clean up any old entries for this user
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId);

    // Look for an opponent already searching
    const { data: opponent, error: searchError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'searching')
      .neq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (opponent && !searchError) {
      // Found opponent - create match
      const roomId = `game_${Date.now()}_${userId.slice(0, 8)}_${opponent.user_id.slice(0, 8)}`;

      // Update opponent's entry
      await supabase
        .from('matchmaking_queue')
        .update({
          status: 'matched',
          room_id: roomId,
          opponent_id: userId,
        })
        .eq('id', opponent.id);

      // Insert our entry as matched
      const { data: myEntry, error: insertError } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: userId,
          username,
          elo: elo || 1200,
          status: 'matched',
          room_id: roomId,
          opponent_id: opponent.user_id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[API /matchmaking POST] Insert error:', insertError.message);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      console.log(`[API /matchmaking] Match found! Room: ${roomId}`);

      return NextResponse.json({
        status: 'matched',
        roomId,
        opponent: { username: opponent.username, elo: opponent.elo },
      });
    }

    // No opponent found - join queue
    const { data: entry, error: insertError } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: userId,
        username,
        elo: elo || 1200,
        status: 'searching',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API /matchmaking POST] Insert error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`[API /matchmaking] User ${username} joined queue`);

    return NextResponse.json({ status: 'searching', entry });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /matchmaking POST] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/matchmaking?userId=xxx - Leave queue
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId);

    console.log(`[API /matchmaking] User ${userId} left queue`);

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /matchmaking DELETE] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
