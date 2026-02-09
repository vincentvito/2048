"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";

interface Score {
  id: string;
  username: string;
  score: number;
  grid_size: number;
  created_at: string;
}

interface LeaderboardProps {
  refreshTrigger?: number;
}

export default function Leaderboard({ refreshTrigger }: LeaderboardProps): React.ReactElement {
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
    }
    setLoading(false);
  }, [tab, refreshTrigger]);

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

  if (!configured) {
    return (
      <div className="w-full max-w-sm text-center py-4 text-amber-600 text-sm">
        Leaderboard available when Supabase is configured.
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setTab("today")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
            tab === "today"
              ? "bg-amber-500 text-white"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTab("alltime")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
            tab === "alltime"
              ? "bg-amber-500 text-white"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          }`}
        >
          All Time
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4 text-amber-600 text-sm">Loading...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-4 text-amber-600 text-sm">
          No scores yet. Be the first!
        </div>
      ) : (
        <div className="space-y-1">
          {scores.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                i < 3 ? "bg-amber-100 font-semibold" : "bg-amber-50"
              }`}
            >
              <span className="w-6 text-center text-amber-500 font-bold">
                {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `${i + 1}`}
              </span>
              <span className="flex-1 text-amber-900 truncate">{entry.username}</span>
              <span className="text-amber-600 text-xs">{entry.grid_size}x{entry.grid_size}</span>
              <span className="font-bold text-amber-800 tabular-nums">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
