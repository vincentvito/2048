import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gridSize = Number(searchParams.get("gridSize") ?? 4);
  const tab = searchParams.get("tab") ?? "today";
  const tzOffset = searchParams.get("tz");

  if (![4, 8].includes(gridSize)) {
    return NextResponse.json({ error: "Invalid grid size" }, { status: 400 });
  }
  if (!["today", "all", "alltime"].includes(tab)) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let query = supabase
    .from("scores")
    .select("id, username, score, grid_size, created_at, user_id")
    .eq("grid_size", gridSize)
    .order("score", { ascending: false })
    .limit(20);

  if (tab === "today") {
    const now = new Date();
    let todayStart: Date;

    if (tzOffset !== null && !isNaN(Number(tzOffset))) {
      const offsetMinutes = Number(tzOffset);
      const userLocalTime = new Date(now.getTime() - offsetMinutes * 60 * 1000);
      userLocalTime.setUTCHours(0, 0, 0, 0);
      todayStart = new Date(userLocalTime.getTime() + offsetMinutes * 60 * 1000);
    } else {
      todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
    }

    query = query.gte("created_at", todayStart.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  const scores = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    username: row.username,
    score: row.score,
    grid_size: row.grid_size,
    created_at: row.created_at,
  }));

  return NextResponse.json({ scores });
}
