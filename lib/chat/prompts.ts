/**
 * System prompts + article-context builder for the chat API.
 * Article content + instructions go in `system`; conversational turns stay clean.
 */

export interface ArticleContext {
  title: string;
  excerpt: string | null;
  content: string | null;
  externalUrl: string | null;
  sourceName: string | null;
}

const BASE_SYSTEM_PROMPT = `You are the Healthspan.report assistant — a knowledgeable, friendly guide for evidence-based longevity, healthspan, anti-aging, and wellness research.

Style:
- Plain, direct prose. Use short paragraphs and bullet points where they help.
- Cite specifics (study names, researchers, mechanisms) when you're confident; flag uncertainty otherwise.
- Distinguish strong evidence (RCTs, meta-analyses) from emerging/observational findings.
- Never invent citations or studies. If you don't know, say so.
- You're talking to curious readers, not clinicians — keep jargon accessible.
- Do not give personalized medical advice; suggest consulting a clinician for individual decisions.`;

const MAX_ARTICLE_CHARS = 12_000;

export function buildSystemPrompt(article?: ArticleContext): string {
  if (!article) return BASE_SYSTEM_PROMPT;

  const body =
    (article.content && article.content.trim()) ||
    (article.excerpt && article.excerpt.trim()) ||
    "";

  const truncated =
    body.length > MAX_ARTICLE_CHARS
      ? body.slice(0, MAX_ARTICLE_CHARS) + "\n\n[…content truncated]"
      : body;

  const hasFullContent = !!(article.content && article.content.trim());

  const articleBlock = [
    "The user is asking about a specific article. Use it as your primary source.",
    "",
    `Title: ${article.title}`,
    article.sourceName ? `Source: ${article.sourceName}` : null,
    article.externalUrl ? `URL: ${article.externalUrl}` : null,
    "",
    hasFullContent
      ? "Full article content:"
      : "Only the excerpt is available — be explicit that your summary is based on the excerpt only.",
    "---",
    truncated || "(no content available)",
    "---",
    "",
    "When the user asks for a summary, deliver:",
    "- A one-sentence TL;DR",
    "- 3–5 key bullet points",
    "- A brief 'why it matters' line tying the article back to longevity/healthspan",
  ]
    .filter(Boolean)
    .join("\n");

  return `${BASE_SYSTEM_PROMPT}\n\n${articleBlock}`;
}
