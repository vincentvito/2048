import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gridSize = Number(searchParams.get('gridSize') ?? 4);
  const tab = searchParams.get('tab') ?? 'today';

  console.log(`[API /leaderboard] tab=${tab} gridSize=${gridSize}`);

  const supabase = await createClient();

  // Join with profiles to get the latest username for each score
  let query = supabase
    .from('scores')
    .select('id, username, score, grid_size, created_at, user_id, profiles(username)')
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

  // Prefer profile username over the denormalized scores.username
  const scores = (data ?? []).map((row: any) => ({
    id: row.id,
    username: row.profiles?.username || row.username,
    score: row.score,
    grid_size: row.grid_size,
    created_at: row.created_at,
  }));

  console.log(`[API /leaderboard] Returning ${scores.length} scores`);
  return NextResponse.json({ scores });
}
