"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import styles from "./ChatMessage.module.css";

interface ChatMessageProps {
  message: UIMessage;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const text = Array.isArray(message.parts)
    ? message.parts
        .map((part) =>
          part.type === "text" && typeof (part as { text?: string }).text === "string"
            ? (part as { text: string }).text
            : "",
        )
        .join("")
    : "";

  if (!text) return null;

  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.bubble}>
        {isUser ? (
          <p className={styles.userText}>{text}</p>
        ) : (
          <div className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);
