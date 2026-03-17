import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

const DEFAULT_ELO = 1200;

// GET /api/player-stats — get stats for the authenticated user
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/player-stats — create or get player stats for the authenticated user
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const username = typeof body.username === 'string' ? body.username.trim() : user.username || user.email;

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    await supabase
      .from('player_stats')
      .upsert(
        {
          user_id: user.id,
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

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create stats' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/player-stats — update stats after game for the authenticated user
export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { won, tied, score, newElo } = body;

    if (typeof won !== 'boolean' || typeof tied !== 'boolean' || typeof score !== 'number' || typeof newElo !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: current, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !current) {
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
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
