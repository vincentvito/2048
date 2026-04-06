import type { MetadataRoute } from "next";

const BASE_URL = "https://www.the2048league.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const blogSlugs = [
    "2048-board-sizes-4x4-vs-8x8",
    "2048-game-modes-explained",
    "how-to-play-2048-with-friends-online",
    "top-10-mistakes-beginners-make-in-2048",
    "how-to-win-2048-complete-strategy-guide",
    "what-is-elo-rating-2048",
    "multiplayer-2048-tips-for-beginners",
  ];

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/how-to-play`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/strategy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...blogSlugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
