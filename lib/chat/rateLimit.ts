/**
 * In-memory rate limiter. Keyed by user id (signed-in) or IP (anonymous).
 * Acceptable for v1 on a single Vercel region — state resets on cold start
 * (under-counts; never over-counts). Swap for @upstash/ratelimit later.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface LimitOptions {
  max: number;
  windowMs: number;
}

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkLimit(key: string, opts: LimitOptions): LimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.max - 1, retryAfterSec: 0 };
  }

  if (existing.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.max - existing.count,
    retryAfterSec: 0,
  };
}

export const RATE_LIMITS = {
  anonymous: { max: 20, windowMs: 10 * 60 * 1000 },
  signedIn: { max: 60, windowMs: 10 * 60 * 1000 },
} as const;
