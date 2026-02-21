/**
 * Guest score tracking via localStorage.
 * Tracks personal bests per grid size, games played count,
 * and recent score history for leaderboard rank previews.
 */

const BEST_PREFIX = "2048_personal_best_";
const GAMES_PLAYED_KEY = "2048_games_played";
const RECENT_SCORES_KEY = "2048_guest_scores";
const PENDING_SCORE_KEY = "2048_pending_score";
const MAX_RECENT_SCORES = 20;

export interface GuestScore {
  score: number;
  gridSize: number;
  timestamp: string;
}

/** Get the personal best score for a given grid size. */
export function getPersonalBest(gridSize: number): number {
  try {
    return Number(localStorage.getItem(`${BEST_PREFIX}${gridSize}x${gridSize}`)) || 0;
  } catch {
    return 0;
  }
}

/** Save a personal best score if it exceeds the current best. Returns true if new best. */
export function savePersonalBest(gridSize: number, score: number): boolean {
  try {
    const current = getPersonalBest(gridSize);
    if (score > current) {
      localStorage.setItem(`${BEST_PREFIX}${gridSize}x${gridSize}`, String(score));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Get total games played across all grid sizes. */
export function getGamesPlayed(): number {
  try {
    return Number(localStorage.getItem(GAMES_PLAYED_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Increment the games played counter. Returns the new count. */
export function incrementGamesPlayed(): number {
  try {
    const count = getGamesPlayed() + 1;
    localStorage.setItem(GAMES_PLAYED_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

/** Record a completed game score in the recent history. */
export function recordScore(score: number, gridSize: number): void {
  try {
    const entry: GuestScore = {
      score,
      gridSize,
      timestamp: new Date().toISOString(),
    };
    const existing = getRecentScores();
    existing.unshift(entry);
    // Keep only the most recent scores
    const trimmed = existing.slice(0, MAX_RECENT_SCORES);
    localStorage.setItem(RECENT_SCORES_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable
  }
}

/** Get recent score history. */
export function getRecentScores(): GuestScore[] {
  try {
    const raw = localStorage.getItem(RECENT_SCORES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestScore[];
  } catch {
    return [];
  }
}

/** Save a pending score to localStorage before an auth redirect. */
export function savePendingScore(score: number, gridSize: number): void {
  try {
    const data = {
      score,
      gridSize,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(PENDING_SCORE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

/** Retrieve the pending score if it exists and is less than 1 hour old. Returns null otherwise. */
export function getPendingScore(): { score: number; gridSize: number; timestamp: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_SCORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { score: number; gridSize: number; timestamp: string };
    // Expire after 1 hour
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_SCORE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Remove the pending score from localStorage. */
export function clearPendingScore(): void {
  try {
    localStorage.removeItem(PENDING_SCORE_KEY);
  } catch {
    // localStorage unavailable
  }
}
