import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, strategies, and news from The 2048 League. Learn how to improve your 2048 game, understand the ELO ranking system, and stay up to date with new features.",
  keywords: [
    "2048 blog",
    "2048 tips",
    "2048 news",
    "2048 strategy",
    "2048 multiplayer tips",
  ],
  openGraph: {
    title: "Blog | The 2048 League",
    description:
      "Tips, strategies, and news from The 2048 League. Improve your game and climb the ranks.",
    url: "https://www.the2048league.com/blog",
  },
};

const posts = [
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
