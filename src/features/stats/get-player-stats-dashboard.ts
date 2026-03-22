import { Pool } from "pg";
import { DEFAULT_ELO, getEloRank } from "@/lib/elo";
import { getAuthenticatedUser } from "@/lib/api-auth";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return pool;
}

interface PlayerAccountRow {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  created_at: string;
}

interface PlayerStatsRow {
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

interface ScoreAggregateRow {
  total_runs: number;
  best_score: number;
  average_score: number;
  total_saved_points: string;
  best_4x4: number;
  best_8x8: number;
  runs_4x4: number;
  runs_8x8: number;
  average_4x4: number;
  average_8x8: number;
  last_score_at: string | null;
  last_seven_days_runs: number;
}

interface BestDayRow {
  day: string;
  runs: number;
  best_score: number;
  total_score: string;
}

interface RecentScoreRow {
  id: string;
  score: number;
  grid_size: number;
  created_at: string;
}

export interface StatsChartPoint {
  label: string;
  score: number;
}

export interface StatsRecentActivity {
  id: string;
  score: number;
  gridSize: number;
  createdAt: string;
}

export interface PlayerStatsDashboardData {
  profile: {
    displayName: string;
    email: string;
    avatarLetter: string;
    memberSince: string;
    lastActiveAt: string | null;
  };
  rank: {
    elo: number;
    tierName: string;
    tierColor: string;
    nextTierName: string | null;
    pointsToNextTier: number | null;
  };
  overview: {
    recordedGames: number;
    rankedMatches: number;
    singlePlayerRuns: number;
    winRate: number;
    bestOverallScore: number;
    averageSavedScore: number;
    estimatedTimeMinutes: number;
    totalPoints: number;
    favoriteMode: string;
    lastSevenDaysRuns: number;
    trendSummary: string;
  };
  multiplayer: {
    wins: number;
    losses: number;
    ties: number;
    bestScore: number;
    totalPoints: number;
  };
  singlePlayer: {
    bestScore: number;
    best4x4: number;
    best8x8: number;
    runs4x4: number;
    runs8x8: number;
    totalSavedPoints: number;
  };
  bestDay: {
    label: string | null;
    runs: number;
    score: number;
  };
  goals: {
    nextScoreMilestone: number;
    pointsToNextScoreMilestone: number;
    nextGamesMilestone: number;
    gamesToNextMilestone: number;
  };
  chartPoints: StatsChartPoint[];
  recentActivity: StatsRecentActivity[];
}

const SCORE_MILESTONES = [1000, 2500, 5000, 10000, 20000, 50000, 100000, 250000];
const GAME_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
const RANKS = [
  { name: "Bronze", threshold: 0 },
  { name: "Silver", threshold: 1000 },
  { name: "Gold", threshold: 1300 },
  { name: "Platinum", threshold: 1600 },
  { name: "Diamond", threshold: 1900 },
];

function getDisplayName(
  account: PlayerAccountRow | null,
  fallbackUser: { email: string; username: string | null }
) {
  return (
    account?.username ||
    account?.name ||
    fallbackUser.username ||
    fallbackUser.email.split("@")[0] ||
    "Player"
  );
}

function getAvatarLetter(name: string) {
  return (name[0] || "P").toUpperCase();
}

function getNextRankProgress(elo: number) {
  const nextRank = RANKS.find((rank) => rank.threshold > elo) ?? null;
  return {
    nextTierName: nextRank?.name ?? null,
    pointsToNextTier: nextRank ? nextRank.threshold - elo : null,
  };
}

function getNextMilestone(current: number, milestones: number[]) {
  const next = milestones.find((milestone) => milestone > current);
  if (next) {
    return next;
  }

  const base = milestones[milestones.length - 1];
  return Math.ceil((current + 1) / base) * base;
}

function estimateSingleRunMinutes(averageScore: number, gridSize: number) {
  if (averageScore <= 0) {
    return gridSize === 8 ? 8 : 4;
  }

  const baseMinutes = gridSize === 8 ? 7 : 4;
  const scaling = gridSize === 8 ? 5000 : 2500;
  const maxMinutes = gridSize === 8 ? 18 : 12;
  return Math.max(
    baseMinutes,
    Math.min(maxMinutes, Math.round(baseMinutes + averageScore / scaling))
  );
}

function estimateTimeMinutes(aggregate: ScoreAggregateRow, rankedMatches: number) {
  const singlePlayerMinutes =
    aggregate.runs_4x4 * estimateSingleRunMinutes(aggregate.average_4x4, 4) +
    aggregate.runs_8x8 * estimateSingleRunMinutes(aggregate.average_8x8, 8);
  const multiplayerMinutes = rankedMatches * 4;
  return singlePlayerMinutes + multiplayerMinutes;
}

function getFavoriteMode(aggregate: ScoreAggregateRow, rankedMatches: number) {
  if (aggregate.runs_4x4 === 0 && aggregate.runs_8x8 === 0 && rankedMatches === 0) {
    return "No games recorded yet";
  }
  if (rankedMatches > aggregate.runs_4x4 && rankedMatches > aggregate.runs_8x8) {
    return "Ranked multiplayer";
  }
  if (aggregate.runs_8x8 > aggregate.runs_4x4) {
    return "8x8 marathon runs";
  }
  return "4x4 classic runs";
}

function getTrendSummary(recentScores: StatsRecentActivity[]) {
  if (recentScores.length < 2) {
    return "Play a few saved runs to unlock score trend insights.";
  }

  const recentWindow = recentScores.slice(0, 5);
  const previousWindow = recentScores.slice(5, 10);
  const recentAverage =
    recentWindow.reduce((sum, item) => sum + item.score, 0) / recentWindow.length;

  if (previousWindow.length === 0) {
    return `Your last ${recentWindow.length} saved runs average ${Math.round(recentAverage).toLocaleString()} points.`;
  }

  const previousAverage =
    previousWindow.reduce((sum, item) => sum + item.score, 0) / previousWindow.length;
  const delta = Math.round(recentAverage - previousAverage);

  if (delta >= 500) {
    return `You are trending up: your recent saved runs are averaging ${delta.toLocaleString()} more points.`;
  }
  if (delta <= -500) {
    return `You are due for a bounce-back: your recent saved runs dipped by ${Math.abs(delta).toLocaleString()} points.`;
  }
  return "Your recent saved runs are steady, which is a great foundation for a new personal best.";
}

function getLastActiveAt(playerStats: PlayerStatsRow | null, aggregate: ScoreAggregateRow) {
  const timestamps = [playerStats?.updated_at ?? null, aggregate.last_score_at].filter(
    Boolean
  ) as string[];
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

export async function getPlayerStatsDashboardData(): Promise<PlayerStatsDashboardData | null> {
  const authenticatedUser = await getAuthenticatedUser();
  if (!authenticatedUser) {
    return null;
  }

  const db = getPool();

  const accountResult = await db.query<PlayerAccountRow>(
    'select id, email, name, username, "createdAt" as created_at from "user" where id = $1 limit 1',
    [authenticatedUser.id]
  );
  const account = accountResult.rows[0] ?? null;
  const legacyUsername = account?.username || authenticatedUser.username;

  const playerStatsResult = await db.query<PlayerStatsRow>(
    `
      select
        user_id,
        username,
        elo,
        best_score,
        total_points,
        games_played,
        wins,
        losses,
        ties,
        created_at,
        updated_at
      from public.player_stats
      where user_id = $1
      limit 1
    `,
    [authenticatedUser.id]
  );
  const playerStats = playerStatsResult.rows[0] ?? null;

  const scoreAggregateResult = await db.query<ScoreAggregateRow>(
    `
      with filtered_scores as (
        select id, score, grid_size, created_at
        from public.scores
        where user_id = $1
           or ($2::text is not null and user_id is null and lower(username) = lower($2))
      )
      select
        count(*)::int as total_runs,
        coalesce(max(score), 0)::int as best_score,
        coalesce(round(avg(score)), 0)::int as average_score,
        coalesce(sum(score), 0)::bigint as total_saved_points,
        coalesce(max(score) filter (where grid_size = 4), 0)::int as best_4x4,
        coalesce(max(score) filter (where grid_size = 8), 0)::int as best_8x8,
        (count(*) filter (where grid_size = 4))::int as runs_4x4,
        (count(*) filter (where grid_size = 8))::int as runs_8x8,
        coalesce(round(avg(score) filter (where grid_size = 4)), 0)::int as average_4x4,
        coalesce(round(avg(score) filter (where grid_size = 8)), 0)::int as average_8x8,
        max(created_at) as last_score_at,
        (count(*) filter (where created_at >= now() - interval '7 days'))::int as last_seven_days_runs
      from filtered_scores
    `,
    [authenticatedUser.id, legacyUsername ?? null]
  );
  const aggregate = scoreAggregateResult.rows[0] ?? {
    total_runs: 0,
    best_score: 0,
    average_score: 0,
    total_saved_points: "0",
    best_4x4: 0,
    best_8x8: 0,
    runs_4x4: 0,
    runs_8x8: 0,
    average_4x4: 0,
    average_8x8: 0,
    last_score_at: null,
    last_seven_days_runs: 0,
  };

  const bestDayResult = await db.query<BestDayRow>(
    `
      with filtered_scores as (
        select score, created_at
        from public.scores
        where user_id = $1
           or ($2::text is not null and user_id is null and lower(username) = lower($2))
      )
      select
        to_char((created_at at time zone 'utc')::date, 'Mon DD, YYYY') as day,
        count(*)::int as runs,
        max(score)::int as best_score,
        coalesce(sum(score), 0)::bigint as total_score
      from filtered_scores
      group by (created_at at time zone 'utc')::date
      order by total_score desc, runs desc
      limit 1
    `,
    [authenticatedUser.id, legacyUsername ?? null]
  );
  const bestDay = bestDayResult.rows[0] ?? null;

  const recentScoresResult = await db.query<RecentScoreRow>(
    `
      with filtered_scores as (
        select id, score, grid_size, created_at
        from public.scores
        where user_id = $1
           or ($2::text is not null and user_id is null and lower(username) = lower($2))
      )
      select
        id::text,
        score::int,
        grid_size::int,
        created_at
      from filtered_scores
      order by created_at desc
      limit 18
    `,
    [authenticatedUser.id, legacyUsername ?? null]
  );

  const recentActivity = recentScoresResult.rows.map((row) => ({
    id: row.id,
    score: row.score,
    gridSize: row.grid_size,
    createdAt: row.created_at,
  }));

  const displayName = getDisplayName(account, authenticatedUser);
  const rank = getEloRank(playerStats?.elo ?? DEFAULT_ELO);
  const rankProgress = getNextRankProgress(playerStats?.elo ?? DEFAULT_ELO);
  const totalSavedPoints = Number(aggregate.total_saved_points || 0);
  const totalRecordedGames = aggregate.total_runs + (playerStats?.games_played ?? 0);
  const bestOverallScore = Math.max(aggregate.best_score, playerStats?.best_score ?? 0);
  const nextScoreMilestone = getNextMilestone(bestOverallScore, SCORE_MILESTONES);
  const nextGamesMilestone = getNextMilestone(totalRecordedGames, GAME_MILESTONES);

  return {
    profile: {
      displayName,
      email: account?.email || authenticatedUser.email,
      avatarLetter: getAvatarLetter(displayName),
      memberSince: account?.created_at || playerStats?.created_at || new Date().toISOString(),
      lastActiveAt: getLastActiveAt(playerStats, aggregate),
    },
    rank: {
      elo: playerStats?.elo ?? DEFAULT_ELO,
      tierName: rank.name,
      tierColor: rank.color,
      nextTierName: rankProgress.nextTierName,
      pointsToNextTier: rankProgress.pointsToNextTier,
    },
    overview: {
      recordedGames: totalRecordedGames,
      rankedMatches: playerStats?.games_played ?? 0,
      singlePlayerRuns: aggregate.total_runs,
      winRate:
        playerStats && playerStats.games_played > 0
          ? Math.round((playerStats.wins / playerStats.games_played) * 100 * 10) / 10
          : 0,
      bestOverallScore,
      averageSavedScore: aggregate.average_score,
      estimatedTimeMinutes: estimateTimeMinutes(aggregate, playerStats?.games_played ?? 0),
      totalPoints: totalSavedPoints + (playerStats?.total_points ?? 0),
      favoriteMode: getFavoriteMode(aggregate, playerStats?.games_played ?? 0),
      lastSevenDaysRuns: aggregate.last_seven_days_runs,
      trendSummary: getTrendSummary(recentActivity),
    },
    multiplayer: {
      wins: playerStats?.wins ?? 0,
      losses: playerStats?.losses ?? 0,
      ties: playerStats?.ties ?? 0,
      bestScore: playerStats?.best_score ?? 0,
      totalPoints: playerStats?.total_points ?? 0,
    },
    singlePlayer: {
      bestScore: aggregate.best_score,
      best4x4: aggregate.best_4x4,
      best8x8: aggregate.best_8x8,
      runs4x4: aggregate.runs_4x4,
      runs8x8: aggregate.runs_8x8,
      totalSavedPoints,
    },
    bestDay: {
      label: bestDay?.day ?? null,
      runs: bestDay?.runs ?? 0,
      score: Number(bestDay?.total_score ?? 0),
    },
    goals: {
      nextScoreMilestone,
      pointsToNextScoreMilestone: Math.max(0, nextScoreMilestone - bestOverallScore),
      nextGamesMilestone,
      gamesToNextMilestone: Math.max(0, nextGamesMilestone - totalRecordedGames),
    },
    chartPoints: recentActivity
      .slice()
      .reverse()
      .map((activity, index) => ({
        label: `Run ${index + 1}`,
        score: activity.score,
      })),
    recentActivity,
  };
}
