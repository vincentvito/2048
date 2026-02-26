import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const DEFAULT_ELO = 1200;

// GET /api/player-stats?userId=xxx
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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API /player-stats GET] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /player-stats GET] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/player-stats - Create or get player stats
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, username } = body;

    if (!userId || !username) {
      return NextResponse.json({ error: 'userId and username required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Upsert default row
    await supabase
      .from('player_stats')
      .upsert(
        {
          user_id: userId,
          username,
          elo: DEFAULT_ELO,
          best_score: 0,
          total_points: 0,
          games_played: 0,
          wins: 0,
          losses: 0,
          ties: 0,
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );

    // Fetch canonical row
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[API /player-stats POST] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /player-stats POST] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/player-stats - Update stats after game
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, won, tied, score, newElo } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get current stats
    const { data: current, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !current) {
      console.error('[API /player-stats PATCH] No existing row:', fetchError?.message);
      return NextResponse.json({ error: 'No stats found for user' }, { status: 404 });
    }

    const updates: Record<string, number> = {
      elo: newElo,
      games_played: current.games_played + 1,
      total_points: current.total_points + (score || 0),
      best_score: Math.max(current.best_score, score || 0),
    };

    if (tied) {
      updates.ties = current.ties + 1;
    } else if (won) {
      updates.wins = current.wins + 1;
    } else {
      updates.losses = current.losses + 1;
    }

    const { data, error } = await supabase
      .from('player_stats')
      .update(updates)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('[API /player-stats PATCH] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API /player-stats PATCH] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
