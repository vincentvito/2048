import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gridSize = Number(searchParams.get('gridSize') ?? 4);
  const tab = searchParams.get('tab') ?? 'today';

  console.log(`[API /leaderboard] tab=${tab} gridSize=${gridSize}`);

  const supabase = await createClient();

  let query = supabase
    .from('scores')
    .select('id, username, score, grid_size, created_at')
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

  console.log(`[API /leaderboard] Returning ${data?.length ?? 0} scores`);
  return NextResponse.json({ scores: data ?? [] });
}
