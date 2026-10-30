// app/robots.ts — served at /robots.txt.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: "https://pembroke.goodbotai.tech/sitemap.xml",
    host: "https://pembroke.goodbotai.tech",
  };
}
