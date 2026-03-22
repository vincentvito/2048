import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlayerStatsDashboardData } from "@/features/stats/get-player-stats-dashboard";

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "No recorded activity yet";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function buildSparkline(points: Array<{ score: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return "0,44 100,44";
  }

  const max = Math.max(...points.map((point) => point.score), 1);
  const min = Math.min(...points.map((point) => point.score), 0);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 44 - ((point.score - min) / range) * 44;
      return `${x},${y}`;
    })
    .join(" ");
}

export default async function StatsPage() {
  const data = await getPlayerStatsDashboardData();

  if (!data) {
    redirect("/");
  }

  const sparklinePoints = buildSparkline(data.chartPoints);

  return (
    <main className="stats-page">
      <div className="stats-shell">
        <header className="stats-hero">
          <div className="stats-hero-identity">
            <div className="stats-hero-avatar">{data.profile.avatarLetter}</div>
            <div>
              <p className="stats-eyebrow">Personal performance</p>
              <h1 className="stats-title">{data.profile.displayName}</h1>
              <p className="stats-subtitle">
                Member since {formatDate(data.profile.memberSince)}
                <span className="stats-subtitle-dot" />
                Last active {formatRelativeTime(data.profile.lastActiveAt)}
              </p>
            </div>
          </div>

          <div className="stats-hero-actions">
            <Link href="/" className="stats-secondary-link">
              Back to game
            </Link>
          </div>
        </header>

        <section className="stats-rank-panel">
          <div className="stats-rank-card">
            <div className="stats-rank-row">
              <div>
                <p className="stats-card-label">Ranked tier</p>
                <div className="stats-rank-badge" style={{ color: data.rank.tierColor }}>
                  {data.rank.tierName}
                </div>
              </div>
              <div className="stats-rank-score">{formatNumber(data.rank.elo)}</div>
            </div>
            <p className="stats-rank-meta">
              {data.rank.nextTierName && data.rank.pointsToNextTier !== null
                ? `${formatNumber(data.rank.pointsToNextTier)} ELO to ${data.rank.nextTierName}`
                : "Top tier unlocked"}
            </p>
          </div>

          <div className="stats-hero-grid">
            <article className="stats-highlight-card">
              <span className="stats-card-label">Games recorded</span>
              <strong className="stats-highlight-value">{formatNumber(data.overview.recordedGames)}</strong>
              <p className="stats-card-copy">Across ranked matches and saved score runs.</p>
            </article>
            <article className="stats-highlight-card">
              <span className="stats-card-label">Time played</span>
              <strong className="stats-highlight-value">{formatDuration(data.overview.estimatedTimeMinutes)}</strong>
              <p className="stats-card-copy">Estimated from your saved runs and ranked matches.</p>
            </article>
            <article className="stats-highlight-card">
              <span className="stats-card-label">Best overall</span>
              <strong className="stats-highlight-value">{formatNumber(data.overview.bestOverallScore)}</strong>
              <p className="stats-card-copy">Your best score across every tracked mode.</p>
            </article>
            <article className="stats-highlight-card">
              <span className="stats-card-label">Favorite mode</span>
              <strong className="stats-highlight-value stats-highlight-text">{data.overview.favoriteMode}</strong>
              <p className="stats-card-copy">The mode you keep coming back to most.</p>
            </article>
          </div>
        </section>

        <section className="stats-kpi-grid">
          <article className="stats-kpi-card">
            <span className="stats-card-label">Win rate</span>
            <strong className="stats-kpi-value">{formatPercent(data.overview.winRate)}</strong>
            <p className="stats-card-copy">Based on your ranked multiplayer record.</p>
          </article>
          <article className="stats-kpi-card">
            <span className="stats-card-label">Average saved run</span>
            <strong className="stats-kpi-value">{formatNumber(data.overview.averageSavedScore)}</strong>
            <p className="stats-card-copy">Average across your saved single-player scores.</p>
          </article>
          <article className="stats-kpi-card">
            <span className="stats-card-label">Last 7 days</span>
            <strong className="stats-kpi-value">{formatNumber(data.overview.lastSevenDaysRuns)}</strong>
            <p className="stats-card-copy">Saved runs logged in the last week.</p>
          </article>
          <article className="stats-kpi-card">
            <span className="stats-card-label">Total points</span>
            <strong className="stats-kpi-value">{formatNumber(data.overview.totalPoints)}</strong>
            <p className="stats-card-copy">Combined from ranked stats and saved score history.</p>
          </article>
        </section>

        <section className="stats-main-grid">
          <article className="stats-panel stats-panel-wide">
            <div className="stats-panel-header">
              <div>
                <p className="stats-card-label">Score momentum</p>
                <h2 className="stats-panel-title">Your recent saved runs</h2>
              </div>
              <span className="stats-panel-meta">{formatNumber(data.singlePlayer.totalSavedPoints)} total saved points</span>
            </div>
            <p className="stats-panel-copy">{data.overview.trendSummary}</p>
            <div className="stats-chart-card">
              {data.chartPoints.length > 0 ? (
                <>
                  <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="stats-chart" aria-hidden="true">
                    <polyline fill="none" stroke="currentColor" strokeWidth="3" points={sparklinePoints} />
                  </svg>
                  <div className="stats-chart-labels">
                    <span>{data.chartPoints[0]?.label}</span>
                    <span>{data.chartPoints[data.chartPoints.length - 1]?.label}</span>
                  </div>
                </>
              ) : (
                <div className="stats-empty-state">
                  <p className="stats-empty-title">No saved score trend yet</p>
                  <p className="stats-empty-copy">Finish a few logged-in runs and this graph will start telling your story.</p>
                </div>
              )}
            </div>
          </article>

          <article className="stats-panel">
            <div className="stats-panel-header">
              <div>
                <p className="stats-card-label">Goals</p>
                <h2 className="stats-panel-title">Next milestones</h2>
              </div>
            </div>
            <div className="stats-goal-list">
              <div className="stats-goal-item">
                <span className="stats-goal-title">Score target</span>
                <strong className="stats-goal-value">{formatNumber(data.goals.nextScoreMilestone)}</strong>
                <span className="stats-goal-copy">
                  {formatNumber(data.goals.pointsToNextScoreMilestone)} points away from your next score milestone.
                </span>
              </div>
              <div className="stats-goal-item">
                <span className="stats-goal-title">Games target</span>
                <strong className="stats-goal-value">{formatNumber(data.goals.nextGamesMilestone)}</strong>
                <span className="stats-goal-copy">
                  {formatNumber(data.goals.gamesToNextMilestone)} more recorded games to reach it.
                </span>
              </div>
            </div>
          </article>

          <article className="stats-panel">
            <div className="stats-panel-header">
              <div>
                <p className="stats-card-label">Ranked multiplayer</p>
                <h2 className="stats-panel-title">Competitive snapshot</h2>
              </div>
            </div>
            <div className="stats-split-grid">
              <div className="stats-split-item stats-split-item-win">
                <span>Wins</span>
                <strong>{formatNumber(data.multiplayer.wins)}</strong>
              </div>
              <div className="stats-split-item stats-split-item-loss">
                <span>Losses</span>
                <strong>{formatNumber(data.multiplayer.losses)}</strong>
              </div>
              <div className="stats-split-item">
                <span>Ties</span>
                <strong>{formatNumber(data.multiplayer.ties)}</strong>
              </div>
              <div className="stats-split-item">
                <span>Best ranked score</span>
                <strong>{formatNumber(data.multiplayer.bestScore)}</strong>
              </div>
            </div>
          </article>

          <article className="stats-panel">
            <div className="stats-panel-header">
              <div>
                <p className="stats-card-label">Single player</p>
                <h2 className="stats-panel-title">Run library</h2>
              </div>
            </div>
            <div className="stats-split-grid">
              <div className="stats-split-item">
                <span>Best score</span>
                <strong>{formatNumber(data.singlePlayer.bestScore)}</strong>
              </div>
              <div className="stats-split-item">
                <span>Best 4x4</span>
                <strong>{formatNumber(data.singlePlayer.best4x4)}</strong>
              </div>
              <div className="stats-split-item">
                <span>Best 8x8</span>
                <strong>{formatNumber(data.singlePlayer.best8x8)}</strong>
              </div>
              <div className="stats-split-item">
                <span>Runs saved</span>
                <strong>{formatNumber(data.overview.singlePlayerRuns)}</strong>
              </div>
            </div>
          </article>

          <article className="stats-panel stats-panel-wide">
            <div className="stats-panel-header">
              <div>
                <p className="stats-card-label">Highlights</p>
                <h2 className="stats-panel-title">Best day and recent activity</h2>
              </div>
            </div>
            <div className="stats-activity-layout">
              <div className="stats-best-day-card">
                <span className="stats-card-label">Peak session</span>
                <strong className="stats-best-day-title">{data.bestDay.label || "Still waiting for your first big session"}</strong>
                <p className="stats-card-copy">
                  {data.bestDay.label
                    ? `${formatNumber(data.bestDay.score)} total points across ${formatNumber(data.bestDay.runs)} saved run${data.bestDay.runs === 1 ? "" : "s"}.`
                    : "Your best single-day burst will show up here once you start stacking saved scores."}
                </p>
              </div>

              <div className="stats-activity-list">
                {data.recentActivity.length > 0 ? (
                  data.recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="stats-activity-item">
                      <div>
                        <p className="stats-activity-title">
                          {activity.gridSize}x{activity.gridSize} run · {formatNumber(activity.score)} points
                        </p>
                        <p className="stats-activity-time">{formatDate(activity.createdAt)}</p>
                      </div>
                      <span className="stats-activity-badge">Saved</span>
                    </div>
                  ))
                ) : (
                  <div className="stats-empty-state stats-empty-state-inline">
                    <p className="stats-empty-title">No saved activity yet</p>
                    <p className="stats-empty-copy">Play while logged in and your recent runs will appear here automatically.</p>
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
