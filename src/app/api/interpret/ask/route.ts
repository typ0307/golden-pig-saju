import { NextResponse } from "next/server";
import { streamText } from "ai";
import { aiModel, assertAiConfigured } from "@/lib/ai/client";
import { ASK_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { askInputSchema } from "@/lib/validation/birthSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 추가 질문 출력 토큰 상한 (프롬프트 지시: 약 400 내외) */
const ASK_MAX_OUTPUT_TOKENS = 400;

/**
 * POST /api/interpret/ask — 추가 질문 Q&A (SSE 스트리밍).
 *
 * 토큰 최적화(프롬프트 지시 준수):
 *   - 이전 풀이 원문을 보내지 않고 시스템 프롬프트 + 명식 핵심 JSON + 질문만 전송
 *   - maxOutputTokens 400으로 출력 통제
 *   - 질문 횟수(3회)는 서버가 무상태이므로 클라 상태로 관리하되 스키마로 입력 검증
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const parsed = askInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  try {
    assertAiConfigured();
  } catch {
    return NextResponse.json(
      { error: "AI 서비스 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요." },
      { status: 503 },
    );
  }

  try {
    const result = streamText({
      model: aiModel(),
      system: ASK_SYSTEM_PROMPT,
      prompt: `명식 JSON:
${JSON.stringify(parsed.data.sajuCore)}

사용자 질문: ${parsed.data.question}`,
      temperature: 0.6,
      maxOutputTokens: ASK_MAX_OUTPUT_TOKENS,
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[/api/interpret/ask]", error);
    return NextResponse.json(
      { error: "답변 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
