import { z } from "zod";
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, TIME_SLOTS } from "@/lib/saju/constants";

/**
 * 생년월시 입력 스키마 — 클라/서버 동일 스키마로 이중 검증.
 */
export const birthInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(12, "이름은 12자 이하로 입력해 주세요.")
      .optional()
      .default(""),
    gender: z.enum(["male", "female"], {
      error: "성별을 선택해 주세요.",
    }),
    calendar: z.enum(["solar", "lunar"], {
      error: "양력/음력을 선택해 주세요.",
    }),
    leapMonth: z.boolean().default(false),
    year: z
      .number({ error: "출생 연도를 선택해 주세요." })
      .int()
      .min(MIN_BIRTH_YEAR, `출생 연도는 ${MIN_BIRTH_YEAR}년 이후여야 합니다.`)
      .max(MAX_BIRTH_YEAR, `출생 연도는 ${MAX_BIRTH_YEAR}년 이하여야 합니다.`),
    month: z
      .number({ error: "출생 월을 선택해 주세요." })
      .int()
      .min(1)
      .max(12),
    day: z
      .number({ error: "출생 일을 선택해 주세요." })
      .int()
      .min(1)
      .max(31),
    /** 0~11(자시~해시), null = 시간 모름 */
    timeSlot: z
      .number()
      .int()
      .min(0)
      .max(TIME_SLOTS.length - 1)
      .nullable()
      .default(null),
  })
  .superRefine((v, ctx) => {
    // 월별 일수 검증 (양력 기준, 윤년 반영 — 음력은 30일 이하)
    const maxDay =
      v.calendar === "lunar" ? 30 : daysInMonth(v.year, v.month);
    if (v.day > maxDay) {
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message:
          v.calendar === "lunar"
            ? "음력은 30일까지 입력할 수 있습니다."
            : `${v.year}년 ${v.month}월은 ${maxDay}일까지 있습니다.`,
      });
    }
    // 미래 출생 방지 (당해 연도라면 오늘 이후 불가)
    const now = new Date();
    if (
      v.year === now.getFullYear() &&
      (v.month > now.getMonth() + 1 ||
        (v.month === now.getMonth() + 1 && v.day > now.getDate()))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["year"],
        message: "출생일이 미래 날짜입니다.",
      });
    }
  });

export type BirthInput = z.infer<typeof birthInputSchema>;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 추가 질문 스키마 (150자 제한) */
export const askInputSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, "질문을 2자 이상 입력해 주세요.")
    .max(150, "질문은 150자 이하로 입력해 주세요."),
  sajuCore: z.object({
    사주: z.object({
      년주: z.string(),
      월주: z.string(),
      일주: z.string(),
      시주: z.string().nullable(),
    }),
    오행분포: z.record(z.string(), z.number()),
    일간: z.object({
      간: z.string(),
      오행: z.string(),
      음양: z.string(),
      키워드: z.string().optional(),
    }),
  }),
});
