import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gridSize = Number(searchParams.get('gridSize') ?? 4);
  const tab = searchParams.get('tab') ?? 'today';

  console.log(`[API /leaderboard] tab=${tab} gridSize=${gridSize}`);

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Query scores directly (username is denormalized in scores table)
  let query = supabase
    .from('scores')
    .select('id, username, score, grid_size, created_at, user_id')
    .eq('grid_size', gridSize)
    .order('score', { ascending: false })
    .limit(20);

  if (tab === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log(`[API /leaderboard] Filtering to today since: ${today.toISOString()}`);
    query = query.gte('created_at', today.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[API /leaderboard] Supabase error:', error.code, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scores = (data ?? []).map((row: any) => ({
    id: row.id,
    username: row.username,
    score: row.score,
    grid_size: row.grid_size,
    created_at: row.created_at,
  }));

  console.log(`[API /leaderboard] Returning ${scores.length} scores`);
  return NextResponse.json({ scores });
}
