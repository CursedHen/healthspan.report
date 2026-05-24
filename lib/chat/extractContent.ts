import { lookup } from "node:dns/promises";

export interface ExtractResult {
  text: string;
  source: "jina" | "readability";
}

const MAX_CONTENT_CHARS = 15_000;
const MIN_CONTENT_CHARS = 500;
const FETCH_TIMEOUT_MS = 8_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; HealthspanBot/1.0; +https://healthspan.report)";

function ipV4ToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function cidrV4(cidr: string): [number, number] {
  const [ip, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const ipNum = ipV4ToNumber(ip);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return [(ipNum & mask) >>> 0, mask];
}

const PRIVATE_V4_BLOCKS: Array<[number, number]> = [
  cidrV4("0.0.0.0/8"),
  cidrV4("10.0.0.0/8"),
  cidrV4("100.64.0.0/10"),
  cidrV4("127.0.0.0/8"),
  cidrV4("169.254.0.0/16"),
  cidrV4("172.16.0.0/12"),
  cidrV4("192.0.0.0/24"),
  cidrV4("192.168.0.0/16"),
  cidrV4("198.18.0.0/15"),
  cidrV4("224.0.0.0/4"),
  cidrV4("240.0.0.0/4"),
];

function isBlockedV4(ip: string): boolean {
  const ipNum = ipV4ToNumber(ip);
  if (ipNum < 0) return true; // invalid → block to be safe
  return PRIVATE_V4_BLOCKS.some(([base, mask]) => ((ipNum & mask) >>> 0) === base);
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (lower.startsWith("fe80")) return true; // link-local
  return false;
}

async function isUrlSafe(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname;
  if (!host || host === "localhost") return false;
  try {
    const result = await lookup(host, { all: true });
    for (const { address, family } of result) {
      if (family === 4 && isBlockedV4(address)) return false;
      if (family === 6 && isBlockedV6(address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function clamp(text: string): string {
  return text.length > MAX_CONTENT_CHARS
    ? text.slice(0, MAX_CONTENT_CHARS)
    : text;
}

async function tryJina(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length >= MIN_CONTENT_CHARS ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function tryReadability(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*;q=0.8" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    // Check the final URL is still safe (redirects could have escaped to internal hosts).
    if (res.url && !(await isUrlSafe(res.url))) return null;

    const html = await res.text();
    const { Readability } = await import("@mozilla/readability");
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    const text = article?.textContent?.trim() ?? "";
    return text.length >= MIN_CONTENT_CHARS ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractContent(url: string): Promise<ExtractResult | null> {
  if (!(await isUrlSafe(url))) return null;

  const jinaText = await tryJina(url);
  if (jinaText) return { text: clamp(jinaText), source: "jina" };

  const readText = await tryReadability(url);
  if (readText) return { text: clamp(readText), source: "readability" };

  return null;
}
