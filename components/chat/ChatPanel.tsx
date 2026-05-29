"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useUserStore } from "@/store/useUserStore";
import { useChatStore } from "@/store/useChatStore";
import { uiMessageToText } from "@/lib/chat/messageUtils";
import ChatMessage from "./ChatMessage";
import HistoryView from "./HistoryView";
import styles from "./ChatPanel.module.css";

const SUGGESTED_PROMPTS = [
  "What's the latest evidence on rapamycin?",
  "Explain autophagy in plain language",
  "Best lifestyle levers for healthspan?",
];

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type View = "chat" | "history";

function toUIMessage(m: StoredMessage): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  } as UIMessage;
}

function formatCountdown(remainingMs: number): string {
  const secs = Math.max(0, Math.ceil(remainingMs / 1000));
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function ChatPanel() {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const close = useChatStore((s) => s.close);
  const pendingPrompt = useChatStore((s) => s.pendingPrompt);
  const consumePendingPrompt = useChatStore((s) => s.consumePendingPrompt);
  const storedConversationId = useChatStore((s) => s.conversationId);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const anonymousHistory = useChatStore((s) => s.anonymousHistory);
  const setAnonymousHistory = useChatStore((s) => s.setAnonymousHistory);
  const clearAnonymousHistory = useChatStore((s) => s.clearAnonymousHistory);
  const setIsBusy = useChatStore((s) => s.setIsBusy);
  const rateLimitState = useChatStore((s) => s.rateLimit);
  const setRateLimit = useChatStore((s) => s.setRateLimit);

  const [input, setInput] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | undefined>();
  const [activeArticleUrl, setActiveArticleUrl] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<View>("chat");
  const conversationCreateInFlight = useRef(false);
  const loadAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const isRateLimited =
    rateLimitState.resetAt !== null && rateLimitState.resetAt > now;
  const remainingMs = isRateLimited
    ? Math.max(0, (rateLimitState.resetAt ?? 0) - now)
    : 0;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const res = await fetch(input as RequestInfo, init);
          if (res.status === 429) {
            try {
              const data = (await res.clone().json()) as {
                retryAfterSec?: number;
              };
              const seconds =
                typeof data.retryAfterSec === "number" && data.retryAfterSec > 0
                  ? data.retryAfterSec
                  : 60;
              setRateLimit({ resetAt: Date.now() + seconds * 1000 });
            } catch {
              setRateLimit({ resetAt: Date.now() + 60_000 });
            }
          }
          return res;
        },
      }),
    [setRateLimit],
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport,
  });

  // Mirror chat status into the store so SummarizeButton (outside this tree) can react.
  useEffect(() => {
    setIsBusy(status === "submitted" || status === "streaming");
    return () => setIsBusy(false);
  }, [status, setIsBusy]);

  // Tick once a second while a rate-limit countdown is active.
  useEffect(() => {
    if (!isRateLimited) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRateLimited]);

  useEffect(() => {
    if (rateLimitState.resetAt !== null && rateLimitState.resetAt <= now) {
      setRateLimit({ resetAt: null });
    }
  }, [rateLimitState.resetAt, now, setRateLimit]);

  // Single source of truth for loading a conversation's messages.
  // Aborts any in-flight load before starting a new one — without this, two
  // quick selections race and the slower response could overwrite the faster one,
  // pairing the wrong messages with the wrong conversation id.
  const loadConversation = useCallback(
    async (id: string): Promise<boolean> => {
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;

      try {
        const res = await fetch(
          `/api/chat/conversations/${id}/messages`,
          { cache: "no-store", signal: controller.signal },
        );
        if (controller.signal.aborted) return false;
        if (res.status === 404) {
          setConversationId(null);
          setMessages([]);
          return false;
        }
        if (!res.ok) return false;
        const data = (await res.json()) as { messages: StoredMessage[] };
        if (controller.signal.aborted) return false;
        const ui = data.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map(toUIMessage);
        setMessages(ui);
        setConversationId(id);
        return true;
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return false;
        return false;
      }
    },
    [setConversationId, setMessages],
  );

  // Hydrate prior messages once on first open.
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    async function hydrate() {
      if (isAuthenticated && storedConversationId) {
        await loadConversation(storedConversationId);
      } else if (!isAuthenticated && anonymousHistory.length > 0) {
        setMessages(anonymousHistory.map(toUIMessage));
      }
      if (!cancelled) setHydrated(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    isAuthenticated,
    storedConversationId,
    anonymousHistory,
    loadConversation,
    setMessages,
  ]);

  // Sync anonymous history to localStorage as messages change.
  useEffect(() => {
    if (!hydrated || isAuthenticated) return;
    const flat = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: uiMessageToText(m),
      }));
    setAnonymousHistory(flat);
  }, [messages, hydrated, isAuthenticated, setAnonymousHistory]);

  // Auto-scroll to the latest message while in chat view.
  useEffect(() => {
    if (view !== "chat" || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status, view]);

  // Send any pending prompt set by the Summarize button. Reacts to pendingPrompt
  // changes so a Sparkle click works even when the panel is already mounted
  // (e.g., user is in history view).
  useEffect(() => {
    if (!hydrated || !pendingPrompt) return;
    consumePendingPrompt();
    setView("chat");
    void send(pendingPrompt.text, pendingPrompt.articleId, pendingPrompt.articleUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, pendingPrompt]);

  // Focus input on first paint of chat view.
  useEffect(() => {
    if (view === "chat") inputRef.current?.focus();
  }, [view]);

  async function ensureConversationId(
    articleId?: string,
  ): Promise<string | null> {
    if (!isAuthenticated) return null;
    if (storedConversationId) return storedConversationId;
    if (conversationCreateInFlight.current) return null;

    conversationCreateInFlight.current = true;
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: null,
          articleId: articleId ?? null,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { conversation: { id: string } };
      setConversationId(data.conversation.id);
      return data.conversation.id;
    } finally {
      conversationCreateInFlight.current = false;
    }
  }

  async function send(text: string, articleId?: string, articleUrl?: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (articleId) setActiveArticleId(articleId);
    if (articleUrl) setActiveArticleUrl(articleUrl);

    const conversationId = await ensureConversationId(articleId);

    sendMessage(
      { text: trimmed },
      {
        body: {
          articleId: articleId ?? activeArticleId,
          articleUrl: articleUrl ?? activeArticleUrl,
          conversationId: conversationId ?? undefined,
        },
      },
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isRateLimited) return;
    if (status !== "ready" && status !== "error") return;
    const value = input;
    setInput("");
    void send(value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
    }
  }

  function handleNewChat() {
    setMessages([]);
    setActiveArticleId(undefined);
    setActiveArticleUrl(undefined);
    if (isAuthenticated) setConversationId(null);
    else clearAnonymousHistory();
    setView("chat");
    inputRef.current?.focus();
  }

  async function handleSelectFromHistory(id: string) {
    setActiveArticleId(undefined);
    setActiveArticleUrl(undefined);
    setMessages([]);
    await loadConversation(id);
    setView("chat");
  }

  const isBusy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  if (view === "history") {
    return (
      <div className={styles.panel} role="dialog" aria-label="Chat history">
        <HistoryView
          currentConversationId={storedConversationId}
          onSelect={handleSelectFromHistory}
          onNewChat={handleNewChat}
          onBack={() => setView("chat")}
        />
      </div>
    );
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Healthspan assistant">
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.dot} aria-hidden="true" />
          <div>
            <h2 className={styles.title}>Healthspan Assistant</h2>
            <p className={styles.subtitle}>
              {isAuthenticated ? "Signed in · history saved" : "Anonymous · history on this device"}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {isAuthenticated && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setView("history")}
              aria-label="Open chat history"
              title="History"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleNewChat}
            aria-label="Start a new chat"
            title="New chat"
            disabled={isBusy}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={close}
            aria-label="Close chat"
            title="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div ref={scrollRef} className={styles.scroll}>
        {isEmpty ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>How can I help with your longevity reading?</p>
            <p className={styles.emptyBody}>
              Ask anything about healthspan research, or hit the sparkle icon on any
              article card to get a summary.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => void send(prompt)}
                  disabled={isBusy}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className={styles.messageList}>
            {messages.map((m) => (
              <li key={m.id}>
                <ChatMessage message={m} />
              </li>
            ))}
            {status === "submitted" && (
              <li>
                <div className={styles.thinking}>
                  <span /> <span /> <span />
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {isRateLimited ? (
        <div className={styles.rateLimitBanner} role="alert">
          <strong>Whoa — slow down.</strong> You&apos;ve hit the message limit.
          Try again in <span className={styles.countdown}>{formatCountdown(remainingMs)}</span>.
          {isAuthenticated ? null : " Signing in raises the limit."}
        </div>
      ) : error ? (
        <div className={styles.errorBanner} role="alert">
          Something went wrong. Try again in a moment.
        </div>
      ) : null}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRateLimited ? "Rate-limited — please wait…" : "Ask about longevity research…"}
          rows={1}
          disabled={isBusy || isRateLimited}
        />
        {isBusy ? (
          <button
            type="button"
            className={styles.stopButton}
            onClick={() => stop()}
            aria-label="Stop generating"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
