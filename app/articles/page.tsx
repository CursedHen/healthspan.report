"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { ArticleCard } from "@/components/ui";
import { slugify } from "@/lib/rss/rssFetcher";
import type { Article } from "@/types";
import type { RSSAPIResponse, RSSSource } from "@/types/rss";
import styles from "./page.module.css";

// Get source-specific placeholder based on feed URL or source name
function getSourcePlaceholder(sourceUrl: string, sourceName: string): string {
  const url = sourceUrl.toLowerCase();
  const name = sourceName.toLowerCase();
  
  if (url.includes("peterattiamd.com") || name.includes("peter attia")) {
    return "/images/placeholders/attia.png";
  }
  if (url.includes("longevity.technology") || name.includes("longevity.technology")) {
    return "/images/placeholders/longevity.png";
  }
  // Default fallback for other sources (NOVOS Labs, etc.)
  return "/images/placeholders/NOVOSLabs.png";
}

function mapRSSToArticles(sources: RSSSource[]): Article[] {
  const articles: Article[] = [];

  for (const source of sources) {
    const sourcePlaceholder = getSourcePlaceholder(source.source.link || "", source.source.title || "");
    
    for (const item of source.articles) {
      // Use item thumbnail, then source-specific placeholder (skip external source images that may fail)
      const imageUrl = item.thumbnail || sourcePlaceholder;

      articles.push({
        id: item.link,
        title: item.title,
        excerpt: item.contentSnippet || "",
        category: source.source.title,
        author: item.creator || source.source.title,
        publishedAt: item.pubDate,
        readTime: "5 min read",
        imageUrl,
        slug: slugify(item.title),
        externalUrl: item.link,
      });
    }
  }

  // Sort by date
  return articles.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const response = await fetch("/api/rss?type=article");
        if (!response.ok) throw new Error("Failed to fetch articles");

        const data: RSSAPIResponse = await response.json();
        const mappedArticles = mapRSSToArticles(data.sources);
        setArticles(mappedArticles);
      } catch (err) {
        console.error("Failed to fetch RSS articles:", err);
        setError("Failed to load articles. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticles();
  }, []);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Articles</h1>
            <p className={styles.subtitle}>
              Evidence-based research and insights on longevity, healthspan, and
              wellness.
            </p>
          </div>

          {isLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeleton}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonCategory} />
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonExcerpt} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className={styles.empty}>
              <p>No articles available at the moment.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
