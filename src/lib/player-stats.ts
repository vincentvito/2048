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

export async function getPlayerStats(): Promise<PlayerStats | null> {
  try {
    const res = await fetch('/api/player-stats');
    const { data, error } = await res.json();
    if (error) return null;
    return data as PlayerStats | null;
  } catch {
    return null;
  }
}

export async function getOrCreatePlayerStats(
  username: string
): Promise<PlayerStats | null> {
  try {
    const res = await fetch('/api/player-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const { data, error } = await res.json();
    if (error) return null;
    return data as PlayerStats | null;
  } catch {
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
  params: UpdateStatsParams
): Promise<PlayerStats | null> {
  try {
    const res = await fetch('/api/player-stats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const { data, error } = await res.json();
    if (error) return null;
    return data as PlayerStats | null;
  } catch {
    return null;
  }
}
