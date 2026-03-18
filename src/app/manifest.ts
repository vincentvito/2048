import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The 2048 League",
    short_name: "2048",
    description:
      "Play 2048 — the classic sliding tile puzzle. Compete on leaderboards and challenge friends in real-time multiplayer.",
    start_url: "/",
    display: "standalone",
    background_color: "#fef3c7",
    theme_color: "#f59e0b",
    orientation: "portrait",
    categories: ["games", "puzzle"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
