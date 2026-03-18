import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { Pool } from "pg";

const RESERVED_NAMES = new Set([
  "admin",
  "system",
  "bot",
  "moderator",
  "mod",
  "null",
  "undefined",
  "anonymous",
  "guest",
  "support",
  "help",
  "staff",
  "official",
]);

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const trimmed = username.trim();
    if (trimmed.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }
    if (trimmed.length > 20) {
      return NextResponse.json(
        { error: "Username must be 20 characters or less" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Only letters, numbers, _ and - allowed" },
        { status: 400 }
      );
    }
    if (RESERVED_NAMES.has(trimmed.toLowerCase())) {
      return NextResponse.json({ error: "This username is reserved" }, { status: 400 });
    }

    // Check uniqueness (case-insensitive)
    const db = getPool();
    const { rows: existing } = await db.query(
      'SELECT id FROM "user" WHERE LOWER(username) = LOWER($1) AND id != $2',
      [trimmed, user.id]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Update user table
    await db.query('UPDATE "user" SET username = $1, "updatedAt" = NOW() WHERE id = $2', [
      trimmed,
      user.id,
    ]);

    // Sync to profiles table for leaderboard
    const supabase = createAdminClient();
    if (supabase) {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: trimmed,
        },
        { onConflict: "id" }
      );
    }

    return NextResponse.json({ success: true, username: trimmed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update username" },
      { status: 500 }
    );
  }
}
