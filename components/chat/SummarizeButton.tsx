"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useChatStore } from "@/store/useChatStore";
import styles from "./SummarizeButton.module.css";

interface SummarizeButtonProps {
  /** Preferred: direct rss_items.id. */
  articleId?: string;
  /** Fallback: external URL when no DB id is available (e.g., search results). */
  articleUrl?: string;
  /** Article title — used to seed the prompt. */
  title: string;
  variant?: "overlay" | "inline";
  className?: string;
}

const CLICK_COOLDOWN_MS = 1500;

const SparkleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-5.8L4 10l5.8-1.9L12 3z" />
    <path d="M5 19l.7 1.7L7.5 21l-1.7.7L5 23.5 4.3 21.7 2.5 21l1.7-.7L5 19z" />
  </svg>
);

function formatRemaining(ms: number): string {
  const secs = Math.max(1, Math.ceil(ms / 1000));
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export default function SummarizeButton({
  articleId,
  articleUrl,
  title,
  variant = "overlay",
  className,
}: SummarizeButtonProps) {
  const isBusy = useChatStore((s) => s.isBusy);
  const resetAt = useChatStore((s) => s.rateLimit.resetAt);
  const [clickedRecently, setClickedRecently] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRateLimited = resetAt !== null && resetAt > now;
  const remainingMs = isRateLimited && resetAt !== null ? resetAt - now : 0;

  // Refresh `now` every second while limited so the tooltip stays current.
  useEffect(() => {
    if (resetAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resetAt]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  if (!articleId && !articleUrl) return null;

  const disabled = isBusy || isRateLimited || clickedRecently;

  function tooltipText(): string {
    if (isRateLimited) return `Rate-limited — try again in ${formatRemaining(remainingMs)}`;
    if (isBusy) return "Wait for the current response to finish";
    if (clickedRecently) return "Opening…";
    return "Summarize with AI";
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    const store = useChatStore.getState();
    store.setPendingPrompt({
      text: `Summarize this article: "${title}"`,
      articleId,
      articleUrl,
    });
    store.open();

    setClickedRecently(true);
    cooldownTimer.current = setTimeout(
      () => setClickedRecently(false),
      CLICK_COOLDOWN_MS,
    );
  }

  const variantClass = variant === "inline" ? styles.inline : styles.overlay;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${variantClass} ${className ?? ""}`.trim()}
      disabled={disabled}
      aria-label="Summarize this article"
      title={tooltipText()}
    >
      <SparkleIcon />
      {variant === "inline" && <span>Summarize</span>}
    </button>
  );
}
