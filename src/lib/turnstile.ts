/**
 * Cloudflare Turnstile 서버 사이드 검증.
 *
 * 환경 변수:
 *   TURNSTILE_SITE_KEY   — 위젯용 Site Key (클라이언트)
 *   TURNSTILE_SECRET_KEY — 검증용 Secret Key (서버 전용)
 *
 * 키가 없는 개발 환경에서는 검증을 건너뛴다(설정되지 않은 기능은 켜지지 않게).
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY,
  );
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  ip?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  if (!isTurnstileEnabled()) return { ok: true };
  if (!token) return { ok: false, reason: "no_token" };

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY as string,
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };

    const json = (await res.json()) as { success?: boolean };
    return json.success
      ? { ok: true }
      : { ok: false, reason: "verify_failed" };
  } catch {
    // Cloudflare 장애 시 서비스 전면 중단보다 실패 처리
    return { ok: false, reason: "network" };
  }
}

/** 검증 실패 시 클라이언트에 내보낼 고정 메시지 (내부 사유 노출 방지) */
export const TURNSTILE_FAIL_MESSAGE =
  "자동 입력 방지 확인에 실패했어요. 체크박스를 다시 눌러 주세요.";
