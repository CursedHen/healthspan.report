"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import styles from "./HistoryView.module.css";

interface ConversationRow {
  id: string;
  title: string | null;
  article_id: string | null;
  created_at: string;
  updated_at: string;
}

interface HistoryViewProps {
  currentConversationId: string | null;
  onSelect: (id: string) => void | Promise<void>;
  onNewChat: () => void;
  onBack: () => void;
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "just now";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function titleOrFallback(title: string | null): string {
  if (title && title.trim()) return title;
  return "New chat";
}

export default function HistoryView({
  currentConversationId,
  onSelect,
  onNewChat,
  onBack,
}: HistoryViewProps) {
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/chat/conversations", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setLoadError("Couldn't load history.");
          setConversations([]);
          return;
        }
        const data = (await res.json()) as { conversations: ConversationRow[] };
        setConversations(data.conversations);
      } catch {
        if (!cancelled) {
          setLoadError("Couldn't load history.");
          setConversations([]);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  function startRename(c: ConversationRow, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(c.id);
    setDraftTitle(c.title ?? "");
  }

  async function commitRename(id: string) {
    const next = draftTitle.trim();
    setRenamingId(null);
    if (!conversations) return;

    const current = conversations.find((c) => c.id === id);
    if (!current) return;
    if ((current.title ?? "") === next) return;
    const originalTitle = current.title;
    const nextTitle = next || null;

    setConversations((prev) =>
      prev ? prev.map((c) => (c.id === id ? { ...c, title: nextTitle } : c)) : prev,
    );

    function revert() {
      setConversations((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, title: originalTitle } : c)) : prev,
      );
    }

    try {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) revert();
    } catch {
      revert();
    }
  }

  function handleRenameKey(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenamingId(null);
    }
  }

  async function handleDelete(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!conversations) return;

    const target = conversations.find((c) => c.id === id);
    if (!target) return;
    const label = titleOrFallback(target.title);
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    const originalIndex = conversations.findIndex((c) => c.id === id);

    setConversations((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));

    function revert() {
      setConversations((prev) => {
        if (!prev) return prev;
        if (prev.some((c) => c.id === id)) return prev;
        const next = [...prev];
        const insertAt = Math.min(originalIndex, next.length);
        next.splice(insertAt, 0, target!);
        return next;
      });
    }

    try {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        revert();
        return;
      }
      if (id === currentConversationId) {
        onNewChat();
      }
    } catch {
      revert();
    }
  }

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  const query = search.trim().toLowerCase();
  const filtered = (conversations ?? []).filter((c) => {
    if (!query) return true;
    return titleOrFallback(c.title).toLowerCase().includes(query);
  });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onBack}
          aria-label="Back to chat"
          title="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className={styles.title}>History</h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onNewChat}
          aria-label="Start a new chat"
          title="New chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {conversations === null ? (
        <div className={styles.statusRow}>Loading…</div>
      ) : loadError ? (
        <div className={styles.statusRow}>{loadError}</div>
      ) : (
        <>
          <form className={styles.searchWrap} onSubmit={handleSearchSubmit} role="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={styles.searchIcon} aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search history"
              className={styles.searchInput}
              aria-label="Search history"
            />
          </form>

          {conversations.length === 0 ? (
            <div className={styles.empty}>
              <p>No chats yet.</p>
              <p className={styles.emptyHint}>
                Your conversations will appear here as you ask questions or summarize articles.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.statusRow}>No matches for &ldquo;{search}&rdquo;.</div>
          ) : (
            <ul className={styles.list}>
              {filtered.map((c) => {
                const isActive = c.id === currentConversationId;
                const isRenaming = renamingId === c.id;
                return (
                  <li
                    key={c.id}
                    className={`${styles.item} ${isActive ? styles.active : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.itemMain}
                      onClick={() => {
                        if (isRenaming) return;
                        void onSelect(c.id);
                      }}
                      disabled={isRenaming}
                    >
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          className={styles.renameInput}
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onBlur={() => void commitRename(c.id)}
                          onKeyDown={(e) => handleRenameKey(e, c.id)}
                          onClick={(e) => e.stopPropagation()}
                          maxLength={80}
                        />
                      ) : (
                        <span className={styles.itemTitle}>
                          {titleOrFallback(c.title)}
                        </span>
                      )}
                      <span className={styles.itemTime}>
                        {relativeTime(c.updated_at)}
                      </span>
                    </button>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={(e) => startRename(c, e)}
                        aria-label="Rename"
                        title="Rename"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 20h9" strokeLinecap="round" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={(e) => void handleDelete(c.id, e)}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
