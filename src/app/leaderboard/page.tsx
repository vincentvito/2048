import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "2048 Leaderboard: Top Scores and Rankings",
  description:
    "See who tops the 2048 leaderboard. Check the highest scores, compare your ranking, and challenge the best players. Play now and claim your spot!",
  keywords: [
    "2048 leaderboard",
    "2048 high scores",
    "2048 top players",
    "2048 rankings",
    "2048 best scores",
  ],
  openGraph: {
    title: "2048 Leaderboard: Top Scores and Rankings",
    description:
      "See who tops the 2048 leaderboard. Check the highest scores, compare your ranking, and challenge the best players.",
    url: "https://www.the2048league.com/leaderboard",
  },
};

interface ScoreRow {
  id: string;
  username: string;
  score: number;
  created_at: string;
}

interface LeaderboardStats {
  totalGames: number;
  rankedPlayers: number;
}

async function fetchLeaderboardData(): Promise<{
  scores: ScoreRow[] | null;
  stats: LeaderboardStats | null;
}> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return { scores: null, stats: null };

    const [topScoresRes, scoresCountRes, playerStatsRes] = await Promise.all([
      supabase
        .from("scores")
        .select("id, username, score, created_at")
        .order("score", { ascending: false })
        .limit(20),
      supabase.from("scores").select("id", { count: "exact", head: true }),
      supabase.from("player_stats").select("games_played"),
    ]);

    const scores = topScoresRes.error ? null : (topScoresRes.data as ScoreRow[]);

    let stats: LeaderboardStats | null = null;
    if (!scoresCountRes.error && !playerStatsRes.error) {
      const singlePlayerGames = scoresCountRes.count ?? 0;
      const playerRows = (playerStatsRes.data ?? []) as Array<{ games_played: number | null }>;
      const rankedGames = playerRows.reduce((sum, row) => sum + (row.games_played ?? 0), 0);
      stats = {
        totalGames: singlePlayerGames + rankedGames,
        rankedPlayers: playerRows.length,
      };
    }

    return { scores, stats };
  } catch {
    return { scores: null, stats: null };
  }
}

export default async function LeaderboardPage() {
  const { scores, stats } = await fetchLeaderboardData();

  return (
    <main className="content-page">
      <div className="content-container">
        <Link href="/" className="content-back-link">
          &larr; Back to Game
        </Link>

        <h1 className="content-title">2048 Leaderboard</h1>
        <p className="content-intro">
          The top 20 scores from players around the world. Think you can do better? Jump into a game
          and prove it.
        </p>

        {stats && stats.totalGames > 0 && (
          <div className="leaderboard-stats-strip">
            <div className="leaderboard-stat">
              <span className="leaderboard-stat-value">{stats.totalGames.toLocaleString()}</span>
              <span className="leaderboard-stat-label">Games played</span>
            </div>
            <div className="leaderboard-stat-divider" aria-hidden="true" />
            <div className="leaderboard-stat">
              <span className="leaderboard-stat-value">{stats.rankedPlayers.toLocaleString()}</span>
              <span className="leaderboard-stat-label">
                Ranked player{stats.rankedPlayers === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        )}

        {scores === null ? (
          <div className="content-section">
            <p>Leaderboard data is not available right now. Play a game and check back later!</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="content-section">
            <p>No scores yet. Be the first to play!</p>
          </div>
        ) : (
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="leaderboard-col-rank">#</th>
                  <th className="leaderboard-col-username">Username</th>
                  <th className="leaderboard-col-score">Score</th>
                  <th className="leaderboard-col-date">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, i) => (
                  <tr key={entry.id}>
                    <td className="leaderboard-col-rank">{i === 0 ? "👑" : i + 1}</td>
                    <td className="leaderboard-col-username">{entry.username}</td>
                    <td className="leaderboard-col-score">{entry.score.toLocaleString()}</td>
                    <td className="leaderboard-col-date">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="content-section content-cta">
          <h2 className="content-heading">Want to see your name here?</h2>
          <p>Jump into a game and compete for a top spot on the leaderboard.</p>
          <div className="content-cta-buttons">
            <Link href="/" className="content-btn-primary">
              Play Now
            </Link>
            <Link href="/strategy" className="content-btn-secondary">
              Learn Strategy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
