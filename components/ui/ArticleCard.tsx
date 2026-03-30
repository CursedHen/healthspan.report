"use client";

import { useState } from "react";
import Link from "next/link";
import { Article } from "@/types";
import styles from "./ArticleCard.module.css";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "compact";
}

function ImagePlaceholder() {
  return (
    <div className={styles.imagePlaceholder}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

export default function ArticleCard({
  article,
  variant = "default",
}: ArticleCardProps) {
  const fallbackImageUrl = getArticleFallbackImage(article);
  const primaryImageUrl = normalizeImageUrl(article.imageUrl);
  const [usingFallback, setUsingFallback] = useState(!primaryImageUrl);
  const [imageError, setImageError] = useState(false);
  const imageSrc = usingFallback ? fallbackImageUrl : primaryImageUrl || fallbackImageUrl;

  const href = article.externalUrl || `/articles/${article.slug}`;
  const isExternal = !!article.externalUrl;
  const sourceName = article.sourceName || article.author || article.category;

  const titleNode = <h3 className={styles.title}>{article.title}</h3>;
  const TitleLink = isExternal ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.titleLink}
    >
      {titleNode}
    </a>
  ) : (
    <Link href={href} className={styles.titleLink}>
      {titleNode}
    </Link>
  );

  const hasImage = !!imageSrc && !imageError;

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.imageWrap}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={article.title}
            className={styles.image}
            onError={() => {
              if (!usingFallback) {
                setUsingFallback(true);
                return;
              }
              setImageError(true);
            }}
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      <div className={styles.content}>
        {TitleLink}
        <p className={styles.meta}>
          <span>{formatDate(article.publishedAt)}</span>
          <span className={styles.dot}>|</span>
          <span>{article.readTime}</span>
          <span className={styles.dot}>|</span>
          <span>{sourceName}</span>
        </p>
      </div>
    </article>
  );
}

function formatDate(rawDate: string): string {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getArticleFallbackImage(article: Article): string {
  const sourceText = `${article.sourceName || ""} ${article.author || ""} ${article.category || ""}`
    .toLowerCase()
    .trim();

  if (sourceText.includes("peter attia")) {
    return "/images/placeholders/attia.png";
  }
  if (sourceText.includes("longevity.technology") || sourceText.includes("longevity")) {
    return "/images/placeholders/longevity.png";
  }
  if (sourceText.includes("novos")) {
    return "/images/placeholders/NOVOSLabs.png";
  }

  return "/images/placeholders/article.svg";
}

function normalizeImageUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  const value = rawUrl.trim();
  if (!value) return null;
  if (value.startsWith("/")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, "https://");
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;

  return null;
}
