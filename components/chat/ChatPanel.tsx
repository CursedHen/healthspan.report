"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useUserStore } from "@/store/useUserStore";
import { useChatStore } from "@/store/useChatStore";
import ChatMessage from "./ChatMessage";
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

function toUIMessage(m: StoredMessage): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  } as UIMessage;
}

function messageToText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .map((part) =>
      part.type === "text" && typeof (part as { text?: string }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("");
}

export default function ChatPanel() {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const close = useChatStore((s) => s.close);
  const consumePendingPrompt = useChatStore((s) => s.consumePendingPrompt);
  const storedConversationId = useChatStore((s) => s.conversationId);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const anonymousHistory = useChatStore((s) => s.anonymousHistory);
  const setAnonymousHistory = useChatStore((s) => s.setAnonymousHistory);
  const clearAnonymousHistory = useChatStore((s) => s.clearAnonymousHistory);

  const [input, setInput] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);
  const conversationCreateInFlight = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport,
  });

  // Hydrate prior messages once the panel opens.
  useEffect(() => {
    if (hydrated) return;

    let cancelled = false;
    async function hydrate() {
      if (isAuthenticated && storedConversationId) {
        try {
          const res = await fetch(
            `/api/chat/conversations/${storedConversationId}/messages`,
            { cache: "no-store" },
          );
          if (cancelled) return;
          if (res.status === 404) {
            setConversationId(null);
          } else if (res.ok) {
            const data = (await res.json()) as { messages: StoredMessage[] };
            const ui = data.messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map(toUIMessage);
            if (ui.length > 0) setMessages(ui);
          }
        } catch {
          /* network blip — just start empty */
        }
      } else if (!isAuthenticated && anonymousHistory.length > 0) {
        setMessages(anonymousHistory.map(toUIMessage));
      }
      if (!cancelled) setHydrated(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    isAuthenticated,
    storedConversationId,
    anonymousHistory,
    setMessages,
    setConversationId,
  ]);

  // Sync anonymous history to localStorage as messages change.
  useEffect(() => {
    if (!hydrated || isAuthenticated) return;
    const flat = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: messageToText(m),
      }));
    setAnonymousHistory(flat);
  }, [messages, hydrated, isAuthenticated, setAnonymousHistory]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status]);

  // Send any pending prompt (set by Summarize button) once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    const prompt = consumePendingPrompt();
    if (!prompt) return;
    void send(prompt.text, prompt.articleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Focus input on first paint.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function ensureConversationId(
    articleId?: string,
    titleSeed?: string,
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
          title: titleSeed?.slice(0, 80) ?? null,
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

  async function send(text: string, articleId?: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (articleId) setActiveArticleId(articleId);

    const conversationId = await ensureConversationId(articleId, trimmed);

    sendMessage(
      { text: trimmed },
      {
        body: {
          articleId: articleId ?? activeArticleId,
          conversationId: conversationId ?? undefined,
        },
      },
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    if (isAuthenticated) setConversationId(null);
    else clearAnonymousHistory();
    inputRef.current?.focus();
  }

  const isBusy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

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

      {error && (
        <div className={styles.errorBanner} role="alert">
          Something went wrong. Try again in a moment.
        </div>
      )}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about longevity research…"
          rows={1}
          disabled={isBusy}
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
