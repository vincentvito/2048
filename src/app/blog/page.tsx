import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "2048 Blog: Tips, Strategy, and News",
  description:
    "Read the latest 2048 tips, strategy guides, and news from The 2048 League. Sharpen your skills and climb the leaderboard. Explore articles now!",
  keywords: [
    "2048 blog",
    "2048 tips",
    "2048 news",
    "2048 strategy",
    "2048 multiplayer tips",
    "2048 guides",
  ],
  openGraph: {
    title: "2048 Blog: Tips, Strategy, and News",
    description:
      "Read the latest 2048 tips, strategy guides, and news from The 2048 League. Sharpen your skills and climb the leaderboard.",
    url: "https://www.the2048league.com/blog",
  },
};

const posts = [
  {
    slug: "highest-score-ever-in-2048",
    title: "The Highest Score Ever Achieved in 2048",
    description:
      "Explore the theoretical maximum of 3,932,100 points, verified AI records, and why most high score claims are fake.",
    date: "2026-04-10",
    tag: "Culture",
  },
  {
    slug: "how-to-play-2048-with-friends-online",
    title: "How to Play 2048 with Friends Online",
    description:
      "Learn how to invite a friend and play 2048 together in real time. A step-by-step guide to creating a room, sharing the link, and starting a match.",
    date: "2026-04-06",
    tag: "Guide",
  },
  {
    slug: "2048-game-modes-explained",
    title: "2048 Game Modes Explained: Single Player, Ranked, and Friendly",
    description:
      "Compare single player, ranked multiplayer, and friendly mode in The 2048 League. Learn what each mode offers and when to use it.",
    date: "2026-04-06",
    tag: "Guide",
  },
  {
    slug: "2048-board-sizes-4x4-vs-8x8",
    title: "2048 Board Sizes: 4x4 vs 8x8 Grid Comparison",
    description:
      "Compare the classic 4x4 and the larger 8x8 2048 boards. Learn how strategy, scoring, and difficulty change with board size.",
    date: "2026-04-06",
    tag: "Guide",
  },
  {
    slug: "top-10-mistakes-beginners-make-in-2048",
    title: "Top 10 Mistakes Beginners Make in 2048",
    description:
      "Struggling with 2048? Here are the 10 most common mistakes beginners make and exactly how to fix each one.",
    date: "2026-04-06",
    tag: "Strategy",
  },
  {
    slug: "how-to-win-2048-complete-strategy-guide",
    title: "How to Win at 2048: The Complete Strategy Guide",
    description:
      "Everything you need to know to consistently reach the 2048 tile and beyond. From the corner method to advanced chain techniques.",
    date: "2026-03-25",
    tag: "Strategy",
  },
  {
    slug: "what-is-elo-rating-2048",
    title: "What is ELO Rating in 2048?",
    description:
      "Learn how the ELO rating system works in The 2048 League, how your rank is calculated, and what you can do to climb the leaderboard.",
    date: "2026-03-25",
    tag: "Guide",
  },
  {
    slug: "multiplayer-2048-tips-for-beginners",
    title: "Multiplayer 2048: Tips for Beginners",
    description:
      "New to competitive 2048? Here are the key differences between single-player and multiplayer, and how to win your first ranked match.",
    date: "2026-03-25",
    tag: "Multiplayer",
  },
];

export default function BlogPage() {
  return (
    <main className="content-page">
      <div className="content-container">
        <Link href="/" className="content-back-link">
          &larr; Back to Game
        </Link>

        <h1 className="content-title">Blog</h1>
        <p className="content-intro">
          Tips, strategies, and updates from The 2048 League.
        </p>

        <div className="blog-post-list">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="blog-post-card"
            >
              <span className="blog-post-tag">{post.tag}</span>
              <h2 className="blog-post-title">{post.title}</h2>
              <p className="blog-post-description">{post.description}</p>
              <time className="blog-post-date" dateTime={post.date}>
                {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
