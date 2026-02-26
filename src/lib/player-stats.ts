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
  try {
    const res = await fetch(`/api/player-stats?userId=${encodeURIComponent(userId)}`);
    const { data, error } = await res.json();
    if (error) {
      console.error("Failed to fetch player stats:", error);
      return null;
    }
    return data as PlayerStats | null;
  } catch (e) {
    console.error("Failed to fetch player stats:", e);
    return null;
  }
}

export async function getOrCreatePlayerStats(
  userId: string,
  username: string
): Promise<PlayerStats | null> {
  try {
    const res = await fetch('/api/player-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username }),
    });
    const { data, error } = await res.json();
    if (error) {
      console.error("Failed to get/create player stats:", error);
      return null;
    }
    return data as PlayerStats | null;
  } catch (e) {
    console.error("Failed to get/create player stats:", e);
    return null;
  }
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
  try {
    const res = await fetch('/api/player-stats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...params }),
    });
    const { data, error } = await res.json();
    if (error) {
      console.error("Failed to update player stats:", error);
      return null;
    }
    return data as PlayerStats | null;
  } catch (e) {
    console.error("Failed to update player stats:", e);
    return null;
  }
}

export async function getLeaderboardByElo(
  limit: number = 25
): Promise<PlayerStats[]> {
  // This still needs a dedicated endpoint - for now return empty
  // TODO: Add /api/player-stats/leaderboard endpoint
  return [];
}
