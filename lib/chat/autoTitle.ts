import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

interface PlainMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const TITLE_MODEL = "gpt-4o-mini";
const MAX_TITLE_LEN = 60;

const SYSTEM_PROMPT =
  "You produce ultra-short chat titles (4 to 6 words, no quotes, no trailing punctuation) that summarize the topic. Return only the title text.";

function clean(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .slice(0, MAX_TITLE_LEN);
}

export async function generateConversationTitle(
  messages: PlainMessage[],
): Promise<string | null> {
  const transcript = messages
    .filter((m) => m.role !== "system")
    .slice(0, 4)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 600)}`)
    .join("\n\n");

  if (!transcript) return null;

  try {
    const { text } = await generateText({
      model: openai(TITLE_MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Give a short title for this conversation:\n\n${transcript}`,
    });
    const cleaned = clean(text);
    return cleaned.length >= 3 ? cleaned : null;
  } catch {
    return null;
  }
}
