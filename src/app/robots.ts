import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/play/", "/stats/"],
    },
    sitemap: "https://www.the2048league.com/sitemap.xml",
  };
}
