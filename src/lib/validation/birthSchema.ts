import { z } from "zod";
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, TIME_SLOTS } from "@/lib/saju/constants";

/**
 * 생년월시 입력 스키마 — 클라/서버 동일 스키마로 이중 검증.
 */
export const birthInputSchema = z
  .object({
    name: z
      .string({ error: "이름을 입력해 주세요." })
      .trim()
      .min(1, "이름을 입력해 주세요.")
      .max(12, "이름은 12자 이하로 입력해 주세요."),
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

/* ------------------------------------------------------------------ */
/* 메일 수신 스키마                                                     */
/* ------------------------------------------------------------------ */

const mailCharSchema = z.object({
  han: z.string().length(1),
  kor: z.string(),
  element: z.enum(["wood", "fire", "earth", "metal", "water"]),
  polarity: z.enum(["yang", "yin"]),
  tenGod: z.string(),
});

const mailPillarSchema = z.object({
  label: z.string(),
  title: z.string(),
  stem: mailCharSchema,
  branch: mailCharSchema,
});

/** POST /api/mail — 풀이 결과 메일 발송 (받고 싶은 사람만 opt-in) */
export const mailInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .pipe(z.email("이메일 형식이 올바르지 않습니다.")),
  name: z
    .string()
    .trim()
    .min(1, "이름이 없습니다. 처음부터 다시 입력해 주세요.")
    .max(12),
  /** Cloudflare Turnstile 토큰 (사이트 키 설정 시 필수, 미설정 시 무시) */
  turnstileToken: z.string().max(4096).optional(),
  interpretation: z
    .string()
    .min(50, "풀이 결과가 아직 완성되지 않았습니다.")
    .max(8000),
  saju: z.object({
    pillars: z.tuple([
      mailPillarSchema,
      mailPillarSchema,
      mailPillarSchema,
      mailPillarSchema.nullable(),
    ]),
    elements: z.record(
      z.enum(["wood", "fire", "earth", "metal", "water"]),
      z.number(),
    ),
    dayMaster: z.object({
      han: z.string(),
      kor: z.string(),
      element: z.enum(["wood", "fire", "earth", "metal", "water"]),
      polarity: z.enum(["yang", "yin"]),
      keyword: z.string(),
    }),
    solar: z.object({
      year: z.number(),
      month: z.number(),
      day: z.number(),
    }),
    lunar: z
      .object({
        year: z.number(),
        month: z.number(),
        day: z.number(),
        isLeapMonth: z.boolean(),
      })
      .nullable(),
    dayGanji: z.string(),
  }),
});

export type MailInput = z.infer<typeof mailInputSchema>;
