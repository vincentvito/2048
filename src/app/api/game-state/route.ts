import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// GET /api/game-state?roomId=xxx&userId=xxx - Get opponent's state
export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  const userId = req.nextUrl.searchParams.get('userId');

  if (!roomId || !userId) {
    return NextResponse.json({ error: 'roomId and userId required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get opponent's game state
    const { data: opponent, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', roomId)
      .neq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API /game-state GET] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      opponent: opponent || null,
      opponentConnected: opponent ? (Date.now() - new Date(opponent.updated_at).getTime() < 10000) : false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /game-state GET] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/game-state - Initialize game state for a player
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, userId, username, elo } = body;

    if (!roomId || !userId || !username) {
      return NextResponse.json({ error: 'roomId, userId, username required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Upsert game state
    const { data, error } = await supabase
      .from('game_state')
      .upsert({
        room_id: roomId,
        user_id: userId,
        username,
        elo: elo || 1200,
        grid: [],
        score: 0,
        game_over: false,
        won: false,
        wants_rematch: false,
        forfeited: false,
      }, {
        onConflict: 'room_id,user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[API /game-state POST] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /game-state POST] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/game-state - Update game state
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, userId, grid, score, gameOver, won, wantsRematch, forfeited } = body;

    if (!roomId || !userId) {
      return NextResponse.json({ error: 'roomId and userId required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const updates: Record<string, unknown> = {};
    if (grid !== undefined) updates.grid = grid;
    if (score !== undefined) updates.score = score;
    if (gameOver !== undefined) updates.game_over = gameOver;
    if (won !== undefined) updates.won = won;
    if (wantsRematch !== undefined) updates.wants_rematch = wantsRematch;
    if (forfeited !== undefined) updates.forfeited = forfeited;

    const { data, error } = await supabase
      .from('game_state')
      .update(updates)
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[API /game-state PATCH] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /game-state PATCH] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/game-state?roomId=xxx&userId=xxx - Leave game
export async function DELETE(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  const userId = req.nextUrl.searchParams.get('userId');

  if (!roomId || !userId) {
    return NextResponse.json({ error: 'roomId and userId required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    await supabase
      .from('game_state')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /game-state DELETE] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
