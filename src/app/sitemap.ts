import { MetadataRoute } from "next";
import gamesData from "@/data/games.json";

const BASE = "https://aigengamez.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const gameRoutes = gamesData.map((game) => ({
    url: `${BASE}/games/${game.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: BASE,                lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/explore`,   lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/about`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...gameRoutes,
  ];
}
