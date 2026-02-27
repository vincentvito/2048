import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const trimmed = username.trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
    }
    if (trimmed.length > 20) {
      return NextResponse.json({ error: "Username must be 20 characters or less" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return NextResponse.json({ error: "Only letters, numbers, _ and - allowed" }, { status: 400 });
    }

    // Get current session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Update username in Better Auth user table
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // Update user table
      await pool.query(
        'UPDATE "user" SET username = $1, "updatedAt" = NOW() WHERE id = $2',
        [trimmed, session.user.id]
      );

      // Also sync to profiles table for leaderboard
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("profiles").upsert({
          id: session.user.id,
          username: trimmed,
        }, { onConflict: "id" });
      }

      return NextResponse.json({ success: true, username: trimmed });
    } finally {
      await pool.end();
    }
  } catch (e) {
    console.error("[API /user/username] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update username" },
      { status: 500 }
    );
  }
}
