// app/sitemap.ts — served at /sitemap.xml. Public pages only.
import type { MetadataRoute } from "next";

const BASE = "https://pembroke.goodbotai.tech";

const PAGES: Array<{ path: string; freq: "hourly" | "daily" | "weekly" | "monthly"; priority: number }> = [
  { path: "/", freq: "hourly", priority: 1 },
  { path: "/decisions", freq: "daily", priority: 0.9 },
  { path: "/property-values", freq: "daily", priority: 0.9 },
  { path: "/calendar", freq: "daily", priority: 0.8 },
  { path: "/agendas", freq: "daily", priority: 0.8 },
  { path: "/archive", freq: "daily", priority: 0.6 },
  { path: "/ask", freq: "weekly", priority: 0.6 },
  { path: "/officials", freq: "weekly", priority: 0.7 },
  { path: "/trash", freq: "monthly", priority: 0.7 },
  { path: "/report", freq: "monthly", priority: 0.6 },
  { path: "/participate", freq: "monthly", priority: 0.5 },
  { path: "/welcome", freq: "monthly", priority: 0.5 },
  { path: "/schools", freq: "monthly", priority: 0.5 },
  { path: "/stats", freq: "weekly", priority: 0.4 },
  { path: "/status", freq: "hourly", priority: 0.2 },
  { path: "/about", freq: "monthly", priority: 0.4 },
  { path: "/privacy", freq: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
