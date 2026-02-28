import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// GET /api/active-match?userId=xxx — check if user has an active match
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

    const { data, error } = await supabase
      .from('player_stats')
      .select('active_room_id, active_game_mode, active_friend_code, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.active_room_id) {
      return NextResponse.json({ data: null });
    }

    // Auto-expire entries older than 1 hour
    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > 60 * 60 * 1000) {
      // Clear stale entry
      await supabase
        .from('player_stats')
        .update({ active_room_id: null, active_game_mode: null, active_friend_code: null })
        .eq('user_id', userId);
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        roomId: data.active_room_id,
        gameMode: data.active_game_mode,
        friendRoomCode: data.active_friend_code,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/active-match — save active match info
export async function POST(req: NextRequest) {
  try {
    const { userId, roomId, gameMode, friendRoomCode } = await req.json();
    if (!userId || !roomId) {
      return NextResponse.json({ error: 'userId and roomId required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('player_stats')
      .update({
        active_room_id: roomId,
        active_game_mode: gameMode || 'ranked',
        active_friend_code: friendRoomCode || null,
      })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/active-match — clear active match
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

    const { error } = await supabase
      .from('player_stats')
      .update({
        active_room_id: null,
        active_game_mode: null,
        active_friend_code: null,
      })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
