import type { UIMessage } from "ai";

/**
 * Flatten the text parts of a UIMessage into a single string. Non-text parts
 * (tool calls, files, reasoning, etc.) are ignored. Returns "" when there are
 * no text parts. Callers that need a trimmed result should call .trim() on the
 * output.
 */
export function uiMessageToText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" &&
        typeof (part as { text?: string }).text === "string",
    )
    .map((part) => part.text)
    .join("");
}
