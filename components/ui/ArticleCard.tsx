"use client";

import { useState } from "react";
import Link from "next/link";
import { Article } from "@/types";
import styles from "./ArticleCard.module.css";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "compact";
  /** When set, shows an Edit button (for admins). */
  onEdit?: () => void;
}

// Placeholder component for failed/missing images
function ImagePlaceholder() {
  return (
    <div
      className={styles.image}
      style={{
        background: `linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-muted) 100%)`,
      }}
    >
      <span className={styles.imagePlaceholder}>
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
      </span>
    </div>
  );
}

export default function ArticleCard({
  article,
  variant = "default",
  onEdit,
}: ArticleCardProps) {
  const [imageError, setImageError] = useState(false);

  // Use external URL if available, otherwise internal route
  const href = article.externalUrl || `/articles/${article.slug}`;
  const isExternal = !!article.externalUrl;
  const discussionHref = `/articles/${article.slug}/discussion`;

  const TitleLink = isExternal ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.titleLink}
    >
      <h3 className={styles.title}>{article.title}</h3>
    </a>
  ) : (
    <Link href={href} className={styles.titleLink}>
      <h3 className={styles.title}>{article.title}</h3>
    </Link>
  );

  // Check if we have a valid image URL
  const hasImage = article.imageUrl && !imageError;

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
          className={styles.editButton}
          aria-label="Edit article"
        >
          Edit
        </button>
      )}
      <Link
        href={discussionHref}
        className={styles.commentLink}
        onClick={(e) => e.stopPropagation()}
        aria-label="Open comments"
        title="Comments"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      </Link>
      <div className={styles.imageWrapper}>
        {hasImage ? (
          <div className={styles.imageContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title}
              className={styles.image}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <ImagePlaceholder />
        )}
        <span className={styles.category}>{article.category}</span>
      </div>

      <div className={styles.content}>
        {TitleLink}

        {variant === "default" && (
          <p className={styles.excerpt}>{article.excerpt}</p>
        )}

        <div className={styles.meta}>
          <span className={styles.author}>{article.author}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.readTime}>{article.readTime}</span>
        </div>
      </div>
    </article>
  );
}
