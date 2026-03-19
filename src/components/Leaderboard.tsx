"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { getPersonalBest } from "@/lib/guest-scores";
import { toast } from "sonner";

interface LeaderboardApiResponse {
  scores?: Score[];
  error?: string;
}

/** How long (ms) to wait for the Supabase query before giving up. */
const FETCH_TIMEOUT_MS = 8000;

interface Score {
  id: string;
  username: string;
  score: number;
  grid_size: number;
  created_at: string;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
}

interface LeaderboardProps {
  refreshTrigger?: number;
  onScoresLoaded?: (scores: LeaderboardEntry[]) => void;
  currentScore?: number;
  gridSize?: number;
  isSignedIn?: boolean;
}

export default function Leaderboard({
  refreshTrigger,
  onScoresLoaded,
  currentScore,
  gridSize = 4,
  isSignedIn,
}: LeaderboardProps): React.ReactElement {
  const [tab, setTab] = useState<"today" | "alltime">("today");
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Initialise synchronously so there is no flash of the wrong UI branch.
  const [configured] = useState(() => isSupabaseConfigured());

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // Pass user's timezone offset for accurate "today" filtering
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/leaderboard?gridSize=${gridSize}&tab=${tab}&tz=${tzOffset}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        setFetchError("Could not load scores");
        toast.error("Could not load leaderboard");
        return;
      }

      const json: LeaderboardApiResponse = await res.json();

      if (json.error) {
        setFetchError("Could not load scores");
        toast.error("Could not load leaderboard");
        return;
      }

      const data = json.scores ?? [];
      setScores(data);
      onScoresLoaded?.(data.map((s) => ({ username: s.username, score: s.score })));
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const msg = isAbort ? "Request timed out" : "Could not load scores";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [tab, refreshTrigger, onScoresLoaded, gridSize]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Stable ref so the realtime subscription doesn't recreate on every tab/trigger change
  const fetchRef = useRef(fetchScores);
  fetchRef.current = fetchScores;

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel("scores_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scores" }, () => {
        // Debounce rapid inserts (e.g. multiple players finishing at once)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchRef.current(), 500);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []); // Stable — never recreates

  // Only show ghost for an unsaved score from the current session
  const guestScore = currentScore && currentScore > 0 ? currentScore : 0;

  // Calculate where the ghost entry would appear (only for unsigned guests with an active score)
  function getGhostRank(): number | null {
    if (isSignedIn) return null;
    if (!guestScore) return null;
    const rank = scores.filter((s) => s.score > guestScore).length + 1;
    if (rank > 20) return null;
    return rank;
  }

  if (!configured) {
    return (
      <div className="lb-container">
        <LocalBestDisplay />
      </div>
    );
  }

  const ghostRank = getGhostRank();

  return (
    <div className="lb-container">
      <div className="lb-tabs">
        <button
          onClick={() => setTab("today")}
          className={`lb-tab ${tab === "today" ? "lb-tab-active" : ""}`}
        >
          Today
        </button>
        <button
          onClick={() => setTab("alltime")}
          className={`lb-tab ${tab === "alltime" ? "lb-tab-active" : ""}`}
        >
          All Time
        </button>
      </div>

      {loading ? (
        <div className="lb-empty">Loading...</div>
      ) : fetchError ? (
        <div className="lb-error">
          <p className="lb-error-message">{fetchError}</p>
          <button className="lb-retry-btn" onClick={fetchScores}>
            Retry
          </button>
        </div>
      ) : scores.length === 0 && !ghostRank ? (
        <div className="lb-empty-state">
          <div className="lb-empty-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 4L20.18 12.52L29.5 13.88L22.75 20.46L24.36 29.74L16 25.34L7.64 29.74L9.25 20.46L2.5 13.88L11.82 12.52L16 4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="lb-empty-title">No scores yet</p>
          <p className="lb-empty-subtitle">Play a game and be the first on the board!</p>
        </div>
      ) : (
        <div className="lb-list">
          {(() => {
            let ghostInserted = false;
            return (
              <>
                {scores.map((entry, i) => {
                  const rank = i + 1;
                  // Insert ghost entry before this row if it belongs here
                  const showGhostBefore =
                    !ghostInserted &&
                    ghostRank !== null &&
                    ghostRank === rank &&
                    guestScore >= entry.score;
                  if (showGhostBefore) ghostInserted = true;

                  return (
                    <React.Fragment key={entry.id}>
                      {showGhostBefore && <GhostEntry rank={ghostRank} score={guestScore} />}
                      <div
                        className={`lb-row ${i < 3 && !ghostInserted ? "lb-row-top" : i < 2 && ghostInserted ? "lb-row-top" : ""}`}
                      >
                        <span className="lb-rank">
                          {rankDisplay(ghostInserted ? rank + 1 : rank)}
                        </span>
                        <span className="lb-name">{entry.username}</span>
                        <span className="lb-score">{entry.score.toLocaleString()}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
                {/* Ghost entry at the end if it's after all scores */}
                {ghostRank !== null && !ghostInserted && (
                  <GhostEntry rank={ghostRank} score={guestScore} />
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/** Render rank with medal emojis for top 3 */
function rankDisplay(rank: number): React.ReactNode {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}`;
}

/** Ghost entry: shows where the user's score would rank */
function GhostEntry({ rank, score }: { rank: number; score: number }): React.ReactElement {
  const isTopThree = rank <= 3;
  return (
    <div className="lb-row lb-row-ghost">
      <span className="lb-rank lb-rank-ghost">{rankDisplay(rank)}</span>
      <span className="lb-name lb-name-ghost">You</span>
      <span className="lb-ghost-cta">
        {isTopThree ? `You'd be ${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}! Sign in` : "Sign in to claim"}
      </span>
      <span className="lb-score lb-score-ghost">{score.toLocaleString()}</span>
    </div>
  );
}

/** Fallback display when Supabase is not configured: show local personal bests */
function LocalBestDisplay(): React.ReactElement {
  const [best4, setBest4] = useState(0);

  useEffect(() => {
    setBest4(getPersonalBest(4));
  }, []);

  if (best4 === 0) {
    return (
      <div className="lb-empty-state">
        <div className="lb-empty-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 4L20.18 12.52L29.5 13.88L22.75 20.46L24.36 29.74L16 25.34L7.64 29.74L9.25 20.46L2.5 13.88L11.82 12.52L16 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="lb-empty-title">No scores yet</p>
        <p className="lb-empty-subtitle">Play a game and your best scores will appear here!</p>
      </div>
    );
  }

  return (
    <div className="lb-local-bests">
      <p className="lb-local-title">Your Personal Bests</p>
      <div className="lb-list">
        {best4 > 0 && (
          <div className="lb-row lb-row-top">
            <span className="lb-rank">{"\u{1F947}"}</span>
            <span className="lb-name">You</span>
            <span className="lb-score">{best4.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
