import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/utils/supabase/server";
import { buildSystemPrompt, type ArticleContext } from "@/lib/chat/prompts";
import { checkLimit, RATE_LIMITS } from "@/lib/chat/rateLimit";

export const maxDuration = 30;

const DEFAULT_MODEL = "gpt-4o-mini";

interface ChatRequestBody {
  messages: UIMessage[];
  articleId?: string;
  conversationId?: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

function extractTextFromMessage(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof (part as { text?: string }).text === "string",
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages, articleId, conversationId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limitKey = user?.id ?? getClientIp(req);
  const limit = checkLimit(limitKey, user ? RATE_LIMITS.signedIn : RATE_LIMITS.anonymous);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        retryAfterSec: limit.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfterSec),
        },
      },
    );
  }

  let article: ArticleContext | undefined;
  if (articleId) {
    const { data } = await supabase
      .from("rss_items")
      .select("title, excerpt, content, external_url, source:rss_sources(name)")
      .eq("id", articleId)
      .maybeSingle();

    if (data) {
      const src = (data.source as { name?: string } | { name?: string }[] | null) ?? null;
      const sourceName = Array.isArray(src) ? src[0]?.name ?? null : src?.name ?? null;
      article = {
        title: data.title,
        excerpt: data.excerpt ?? null,
        content: data.content ?? null,
        externalUrl: data.external_url ?? null,
        sourceName,
      };
    }
  }

  const system = buildSystemPrompt(article);
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUserMessage ? extractTextFromMessage(lastUserMessage) : "";

  let activeConversationId: string | null = null;
  if (user && conversationId && lastUserText) {
    const { data: convo } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (convo) {
      activeConversationId = convo.id;
      await supabase.from("chat_messages").insert({
        conversation_id: convo.id,
        role: "user",
        content: lastUserText,
      });
    }
  }

  const modelId = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const result = streamText({
    model: openai(modelId),
    system,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      if (!activeConversationId || !text.trim()) return;
      await supabase.from("chat_messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: text,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
