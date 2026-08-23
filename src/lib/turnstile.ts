/**
 * Cloudflare Turnstile 서버 사이드 검증 (canonical siteverify).
 *
 * 환경 변수:
 *   TURNSTILE_SITE_KEY    — 위젯용 Site Key (클라이언트)
 *   TURNSTILE_SECRET_KEY  — 검증용 Secret Key (서버 전용)
 *   TURNSTILE_HOSTNAMES   — 프론트엔드 호스트명 허용목록(쉼표 구분).
 *                           로컬 개발: "localhost,127.0.0.1"
 *                           프로덕션: 배포 도메인만 (localhost 포함 금지)
 *
 * 검증 계약 (Cloudflare Spin canonical):
 *   1. success === true
 *   2. result.action === 보호 대표면의 action
 *   3. result.hostname ∈ TURNSTILE_HOSTNAMES 허용목록
 *   4. 토큰은 1회용 — 프론트엔드는 요청 완료 후 위젯을 reset해 새 토큰을 받는다.
 *
 * 키가 없는 개발 환경에서는 Turnstile 기능 전체가 비활성화된다.
 * 키는 설정되어 있으나 HOSTNAMES가 비어 있으면 fail-closed(403)로 동작한다.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Turnstile 토큰 최대 길이 (canonical: 2048) */
export const TURNSTILE_TOKEN_MAX = 2048;

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY,
  );
}

/** 허용 호스트명 목록 (비어 있으면 설정 누락) */
function allowedHostnames(): Set<string> {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

export interface TurnstileVerdict {
  ok: boolean;
  reason?:
    | "no_token"
    | "invalid_token"
    | "misconfigured"
    | "verify_failed"
    | "action_mismatch"
    | "hostname_mismatch"
    | "network";
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  opts: { action: string; ip?: string | null },
): Promise<TurnstileVerdict> {
  if (!isTurnstileEnabled()) return { ok: true };

  // 토큰 형식 사전 검사 — canonical 길이 제한 준수
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "no_token" };
  }
  if (token.length > TURNSTILE_TOKEN_MAX) {
    return { ok: false, reason: "invalid_token" };
  }

  const expectedHostnames = allowedHostnames();
  if (expectedHostnames.size === 0) {
    // 허용목록 미설정 → fail-closed
    return { ok: false, reason: "misconfigured" };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY as string,
    response: token,
  });
  if (opts.ip) body.set("remoteip", opts.ip);

  let result: {
    success?: boolean;
    action?: string;
    hostname?: string;
  };
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reason: "verify_failed" };
    result = (await res.json()) as typeof result;
  } catch {
    // Cloudflare 장애 시 서비스 전면 중단보다 실패 처리
    return { ok: false, reason: "network" };
  }

  // 계약 1: success
  if (result.success !== true) return { ok: false, reason: "verify_failed" };
  // 계약 2: action 일치
  if (result.action !== opts.action) {
    return { ok: false, reason: "action_mismatch" };
  }
  // 계약 3: hostname 허용목록
  if (
    !result.hostname ||
    !expectedHostnames.has(result.hostname.toLowerCase())
  ) {
    return { ok: false, reason: "hostname_mismatch" };
  }

  return { ok: true };
}

/** 검증 실패 시 클라이언트에 내보낼 고정 메시지 (내부 사유 노출 방지) */
export const TURNSTILE_FAIL_MESSAGE =
  "자동 입력 방지 확인에 실패했어요. 체크박스를 다시 눌러 주세요.";
