import { createClient, isSupabaseConfigured } from "./supabase-client";
import { getDisplayName } from "@/features/auth/types";
import type { AppUser } from "@/features/auth/types";
import { getPendingScore, clearPendingScore } from "./guest-scores";

/**
 * Save a score to Supabase for authenticated users.
 * Returns true if saved successfully.
 */
export async function saveScore(
  user: AppUser,
  score: number,
  gridSize: number
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const username = getDisplayName(user);
  try {
    const { error } = await supabase.from("scores").insert({
      username,
      score,
      grid_size: gridSize,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Submit any pending guest score that was saved before auth redirect.
 * Returns true if a pending score was found and submitted.
 */
export async function submitPendingScore(user: AppUser): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const pending = getPendingScore();
  if (!pending) return false;

  const success = await saveScore(user, pending.score, pending.gridSize);
  if (success) {
    clearPendingScore();
  }
  return success;
}
