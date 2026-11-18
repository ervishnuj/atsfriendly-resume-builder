import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://theresumerocket.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/ats-checker", changefreq: "monthly", priority: "0.9" },
          { path: "/ai-resume-builder", changefreq: "monthly", priority: "0.9" },
          { path: "/how-it-works", changefreq: "monthly", priority: "0.9" },
          { path: "/resume-templates", changefreq: "monthly", priority: "0.8" },
          { path: "/resume-tips", changefreq: "monthly", priority: "0.8" },
          { path: "/guides", changefreq: "weekly", priority: "0.8" },
          { path: "/guides/ats-resume-format", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/ats-keywords", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/resume-mistakes", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/java-developer-resume", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/resume-for-freshers", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/backend-developer-resume", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/full-stack-developer-resume", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/software-engineer-resume", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/experienced-professional-resume", changefreq: "monthly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/blog/why-ats-rejects-resumes", changefreq: "monthly", priority: "0.7" },
          { path: "/blog/tailor-resume-in-20-minutes", changefreq: "monthly", priority: "0.7" },
          { path: "/blog/resume-bullet-points-that-score", changefreq: "monthly", priority: "0.7" },
          { path: "/blog/ats-myths", changefreq: "monthly", priority: "0.7" },
          { path: "/blog/career-change-resume", changefreq: "monthly", priority: "0.7" },
          { path: "/pricing", changefreq: "monthly", priority: "0.8" },
          { path: "/about", changefreq: "yearly", priority: "0.6" },
          { path: "/contact", changefreq: "yearly", priority: "0.5" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/privacy", changefreq: "yearly", priority: "0.4" },
          { path: "/terms", changefreq: "yearly", priority: "0.4" },
          { path: "/refund-policy", changefreq: "yearly", priority: "0.4" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});