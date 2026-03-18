import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET /api/active-match — check if authenticated user has an active match
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("player_stats")
      .select("active_room_id, active_game_mode, active_friend_code, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 });
    }

    if (!data?.active_room_id) {
      return NextResponse.json({ data: null });
    }

    // Auto-expire entries older than 1 hour
    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > 60 * 60 * 1000) {
      await supabase
        .from("player_stats")
        .update({ active_room_id: null, active_game_mode: null, active_friend_code: null })
        .eq("user_id", user.id);
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        roomId: data.active_room_id,
        gameMode: data.active_game_mode,
        friendRoomCode: data.active_friend_code,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/active-match — save active match info for authenticated user
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { roomId, gameMode, friendRoomCode } = await req.json();

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { error } = await supabase
      .from("player_stats")
      .update({
        active_room_id: roomId,
        active_game_mode: gameMode || "ranked",
        active_friend_code: friendRoomCode || null,
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to save match" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/active-match — clear active match for authenticated user
export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { error } = await supabase
      .from("player_stats")
      .update({
        active_room_id: null,
        active_game_mode: null,
        active_friend_code: null,
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to clear match" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
