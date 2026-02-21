"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { getPersonalBest } from "@/lib/guest-scores";

interface Score {
  id: string;
  username: string;
  score: number;
  grid_size: number;
  created_at: string;
}

interface LeaderboardProps {
  refreshTrigger?: number;
  onScoresLoaded?: (scores: number[]) => void;
  currentScore?: number;
  gridSize?: number;
}

export default function Leaderboard({
  refreshTrigger,
  onScoresLoaded,
  currentScore,
  gridSize = 4,
}: LeaderboardProps): React.ReactElement {
  const [tab, setTab] = useState<"today" | "alltime">("today");
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  const fetchScores = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from("scores")
      .select("id, username, score, grid_size, created_at")
      .eq("grid_size", gridSize)
      .order("score", { ascending: false })
      .limit(20);

    if (tab === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("created_at", today.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setScores(data);
      // Expose scores to parent for rank preview
      onScoresLoaded?.(data.map((s) => s.score));
    }
    setLoading(false);
  }, [tab, refreshTrigger, onScoresLoaded, gridSize]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("scores_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scores" }, () => {
        fetchScores();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchScores]);

  // Determine the guest's display score (current score or personal best for this grid size)
  const guestScore = currentScore ?? getPersonalBest(gridSize);

  // Calculate where the ghost entry would appear
  function getGhostRank(): number | null {
    if (!guestScore || guestScore <= 0) return null;
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
      ) : scores.length === 0 && !ghostRank ? (
        <div className="lb-empty-state">
          <div className="lb-empty-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L20.18 12.52L29.5 13.88L22.75 20.46L24.36 29.74L16 25.34L7.64 29.74L9.25 20.46L2.5 13.88L11.82 12.52L16 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                  const showGhostBefore = !ghostInserted && ghostRank !== null && ghostRank === rank && guestScore >= entry.score;
                  if (showGhostBefore) ghostInserted = true;

                  return (
                    <React.Fragment key={entry.id}>
                      {showGhostBefore && (
                        <GhostEntry rank={ghostRank} score={guestScore} />
                      )}
                      <div className={`lb-row ${i < 3 && !ghostInserted ? "lb-row-top" : i < 2 && ghostInserted ? "lb-row-top" : ""}`}>
                        <span className="lb-rank">
                          {rankDisplay(ghostInserted ? rank + 1 : rank)}
                        </span>
                        <span className="lb-name">{entry.username}</span>
                        <span className="lb-grid">{entry.grid_size}x{entry.grid_size}</span>
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
  return (
    <div className="lb-row lb-row-ghost">
      <span className="lb-rank lb-rank-ghost">{rankDisplay(rank)}</span>
      <span className="lb-name lb-name-ghost">You</span>
      <span className="lb-ghost-cta">Sign in to claim</span>
      <span className="lb-score lb-score-ghost">{score.toLocaleString()}</span>
    </div>
  );
}

/** Fallback display when Supabase is not configured: show local personal bests */
function LocalBestDisplay(): React.ReactElement {
  const [best4, setBest4] = useState(0);
  const [best8, setBest8] = useState(0);

  useEffect(() => {
    setBest4(getPersonalBest(4));
    setBest8(getPersonalBest(8));
  }, []);

  if (best4 === 0 && best8 === 0) {
    return (
      <div className="lb-empty-state">
        <div className="lb-empty-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L20.18 12.52L29.5 13.88L22.75 20.46L24.36 29.74L16 25.34L7.64 29.74L9.25 20.46L2.5 13.88L11.82 12.52L16 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            <span className="lb-grid">4x4</span>
            <span className="lb-score">{best4.toLocaleString()}</span>
          </div>
        )}
        {best8 > 0 && (
          <div className="lb-row lb-row-top">
            <span className="lb-rank">{"\u{1F947}"}</span>
            <span className="lb-name">You</span>
            <span className="lb-grid">8x8</span>
            <span className="lb-score">{best8.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
