import { createClient } from "./supabase-client";
import { DEFAULT_ELO } from "./elo";

export interface PlayerStats {
  id: string;
  user_id: string;
  username: string;
  elo: number;
  best_score: number;
  total_points: number;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  created_at: string;
  updated_at: string;
}

export async function getPlayerStats(
  userId: string
): Promise<PlayerStats | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Failed to fetch player stats:", error.message);
    return null;
  }

  return data as PlayerStats;
}

export async function getOrCreatePlayerStats(
  userId: string,
  username: string
): Promise<PlayerStats | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // Try inserting a default row; ignore conflict if it already exists
  await supabase
    .from("player_stats")
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
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  // Always fetch the canonical row (handles both insert and existing)
  return getPlayerStats(userId);
}

export interface UpdateStatsParams {
  won: boolean;
  tied: boolean;
  score: number;
  newElo: number;
}

export async function updateStatsAfterGame(
  userId: string,
  params: UpdateStatsParams
): Promise<PlayerStats | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const current = await getPlayerStats(userId);
  if (!current) {
    console.error("Cannot update stats: no existing row for user", userId);
    return null;
  }

  const updatedFields: Partial<PlayerStats> = {
    elo: params.newElo,
    games_played: current.games_played + 1,
    total_points: current.total_points + params.score,
    best_score: Math.max(current.best_score, params.score),
  };

  if (params.tied) {
    updatedFields.ties = current.ties + 1;
  } else if (params.won) {
    updatedFields.wins = current.wins + 1;
  } else {
    updatedFields.losses = current.losses + 1;
  }

  const { data, error } = await supabase
    .from("player_stats")
    .update(updatedFields)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update player stats:", error.message);
    return null;
  }

  return data as PlayerStats;
}

export async function getLeaderboardByElo(
  limit: number = 25
): Promise<PlayerStats[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .order("elo", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch ELO leaderboard:", error.message);
    return [];
  }

  return (data ?? []) as PlayerStats[];
}
