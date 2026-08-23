import { NextResponse } from "next/server";
import { assembleSaju, toSajuCore } from "@/lib/saju/pillars";
import { lunarToSolar } from "@/lib/saju/kasi";
import { birthInputSchema } from "@/lib/validation/birthSchema";
import { KasiError } from "@/lib/saju/kasi";

export const runtime = "nodejs";

/**
 * POST /api/saju — 만세력 산출.
 * 1) zod 서버 재검증 → 2) 음력이면 KASI 음양력 API로 양력 변환
 * 3) KASI 일진(일주) + 24절기 절입시각(연주·월주) + 시두법(시주) 조립
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

  const parsed = birthInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "입력값이 올바르지 않습니다.",
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    // 음력 → 양력 변환 (음양력 API)
    const solar =
      input.calendar === "lunar"
        ? await lunarToSolar(input.year, input.month, input.day, input.leapMonth)
        : { year: input.year, month: input.month, day: input.day };

    // 4주 팔자 조립 (음양력 API 일진 + 24절기 API 절입시각)
    const saju = await assembleSaju({ solar, timeSlot: input.timeSlot });

    return NextResponse.json({
      saju,
      core: toSajuCore(saju),
      input: {
        gender: input.gender,
        name: input.name,
        calendar: input.calendar,
        timeSlot: input.timeSlot,
      },
    });
  } catch (error) {
    if (error instanceof KasiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[/api/saju]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "만세력 산출 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
