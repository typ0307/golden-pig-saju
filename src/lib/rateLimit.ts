import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitRule {
  seconds: number;
  max: number;
}

export const RATE_LIMITS: Record<string, RateLimitRule> = {
  "/api/saju": { seconds: 60, max: 30 },
  "/api/interpret": { seconds: 60, max: 10 },
  "/api/interpret/ask": { seconds: 60, max: 10 },
  "/api/mail": { seconds: 60, max: 5 },
};

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

const USE_UPSTASH = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * Redis 기반 비율 제한 (크로스 인스턴스, Vercel 서버리스용).
 * module-level Map이 아니라 Redis에 기록하므로 여러 인스턴스에서도 누적·공유된다.
 */
const redisRatelimit = USE_UPSTASH
  ? new Ratelimit({
      limiter: Ratelimit.slidingWindow(0, "1 m"),
      redis: Redis.fromEnv(),
    })
  : null;

/**
 * 메모리 폴백 (로컬/단일 인스턴스 한정).
 * route handler는 앱 런타임(같은 프로세스)에서 실행되므로 이 모듈 레벨 Map이
 * 요청 간에 누적된다. proxy(미들웨어)는 요청별 이졸트로 실행되어 이게 안 되므로
 * 반드시 route handler에서 호출해야 한다.
 */
const memoryCounts = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

export async function checkRateLimit(
  ip: string | null | undefined,
  route: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[route];
  if (!rule) return { ok: true };

  const identifier = `${ip ?? "unknown"}:${route}`;

  // Upstash (Redis) 경로 — 프로덕션용
  if (redisRatelimit) {
    const rl = new Ratelimit({
      limiter: Ratelimit.slidingWindow(rule.max, `${rule.seconds} s`),
      redis: Redis.fromEnv(),
    });
    const res = await rl.limit(identifier);
    if (!res.success) {
      return { ok: false, retryAfter: rule.seconds };
    }
    return { ok: true };
  }

  // 메모리 폴백 — 로컬/단일 인스턴스
  const now = Date.now();
  const rec = memoryCounts.get(identifier);
  if (!rec || now > rec.resetAt) {
    memoryCounts.set(identifier, {
      count: 1,
      resetAt: now + rule.seconds * 1000,
    });
    return { ok: true };
  }
  if (rec.count >= rule.max) {
    return {
      ok: false,
      retryAfter: Math.ceil((rec.resetAt - now) / 1000),
    };
  }
  rec.count++;
  return { ok: true };
}

/** 요청 IP 추출 (프록시 뒤) */
export function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}