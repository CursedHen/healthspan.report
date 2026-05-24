import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/utils/supabase/server";
import { buildSystemPrompt, type ArticleContext } from "@/lib/chat/prompts";
import { checkLimit, RATE_LIMITS } from "@/lib/chat/rateLimit";
import { extractContent } from "@/lib/chat/extractContent";
import { generateConversationTitle } from "@/lib/chat/autoTitle";
import { uiMessageToText } from "@/lib/chat/messageUtils";

export const maxDuration = 60;

const DEFAULT_MODEL = "gpt-4o-mini";
const MIN_GOOD_CONTENT = 500;
const EXTRACTION_BUDGET_MS = 12_000;

interface ChatRequestBody {
  messages: UIMessage[];
  articleId?: string;
  articleUrl?: string;
  conversationId?: string;
}

interface RssItemRow {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  extracted_content: string | null;
  external_url: string | null;
  source: { name?: string } | { name?: string }[] | null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

function extractSourceName(
  src: { name?: string } | { name?: string }[] | null,
): string | null {
  if (!src) return null;
  return Array.isArray(src) ? src[0]?.name ?? null : src.name ?? null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

const ROW_SELECT =
  "id, title, excerpt, content, extracted_content, external_url, source:rss_sources(name)";

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages, articleId, articleUrl, conversationId } = body;
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
      JSON.stringify({ error: "rate_limited", retryAfterSec: limit.retryAfterSec }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfterSec),
        },
      },
    );
  }

  // Resolve the underlying rss_items row, if any.
  let row: RssItemRow | null = null;
  if (articleId) {
    const { data } = await supabase
      .from("rss_items")
      .select(ROW_SELECT)
      .eq("id", articleId)
      .maybeSingle<RssItemRow>();
    row = data ?? null;
  } else if (articleUrl) {
    const { data } = await supabase
      .from("rss_items")
      .select(ROW_SELECT)
      .eq("external_url", articleUrl)
      .maybeSingle<RssItemRow>();
    row = data ?? null;
  }

  // Determine the best available article text.
  let article: ArticleContext | undefined;
  if (row || articleUrl) {
    const title = row?.title ?? "";
    const excerpt = row?.excerpt ?? null;
    const externalUrl = row?.external_url ?? articleUrl ?? null;
    const sourceName = extractSourceName(row?.source ?? null);

    let bestText: string | null = null;

    if (row?.extracted_content && row.extracted_content.length >= MIN_GOOD_CONTENT) {
      bestText = row.extracted_content;
    } else if (row?.content && row.content.length >= MIN_GOOD_CONTENT) {
      bestText = row.content;
    } else if (externalUrl) {
      const result = await withTimeout(
        extractContent(externalUrl),
        EXTRACTION_BUDGET_MS,
      );
      if (result) {
        bestText = result.text;
        if (row) {
          // Best-effort cache write; failures shouldn't block the stream.
          void supabase
            .from("rss_items")
            .update({
              extracted_content: result.text,
              extracted_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
      }
    }

    if (title || bestText || excerpt) {
      article = {
        title: title || "(untitled)",
        excerpt,
        content: bestText,
        externalUrl,
        sourceName,
      };
    }
  }

  const system = buildSystemPrompt(article);
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUserMessage ? uiMessageToText(lastUserMessage).trim() : "";

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
      const convoId = activeConversationId;
      await supabase.from("chat_messages").insert({
        conversation_id: convoId,
        role: "assistant",
        content: text,
      });

      // Auto-title once and only once: short-circuit on title IS NOT NULL so
      // titled conversations skip the count + LLM call on every subsequent turn.
      // The .is("title", null) predicate on the final UPDATE keeps us race-safe
      // against a manual rename landing while we generate.
      try {
        const { data: convo } = await supabase
          .from("chat_conversations")
          .select("title")
          .eq("id", convoId)
          .is("title", null)
          .maybeSingle<{ title: string | null }>();

        if (!convo) return;

        const { data: rows } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", convoId)
          .order("created_at", { ascending: true })
          .limit(4);

        const titlingMessages = (rows ?? []).filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        );

        // Need at least the second user/assistant pair to write a useful title.
        if (titlingMessages.length < 4) return;

        const title = await generateConversationTitle(titlingMessages);
        if (!title) return;

        await supabase
          .from("chat_conversations")
          .update({ title })
          .eq("id", convoId)
          .is("title", null);
      } catch (err) {
        console.error("[chat/onFinish] auto-title failed", err);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
