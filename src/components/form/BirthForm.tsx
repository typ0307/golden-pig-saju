"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import {
  birthInputSchema,
  type BirthInput,
} from "@/lib/validation/birthSchema";
import {
  MAX_BIRTH_YEAR,
  MIN_BIRTH_YEAR,
  TIME_SLOTS,
} from "@/lib/saju/constants";

type FormValues = {
  name: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  leapMonth: boolean;
  year: number;
  month: number;
  day: number;
  timeSlot: number | null;
};

const YEARS = Array.from(
  { length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 },
  (_, i) => MAX_BIRTH_YEAR - i,
);

/** 입력 폼 → API 페이로드로 쓰는 BirthInput과의 정합을 위해 select는 string으로 다룬 뒤 변환 */
export function BirthForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(birthInputSchema as never) as never,
    defaultValues: {
      name: "",
      gender: "male",
      calendar: "solar",
      leapMonth: false,
      year: 2000,
      month: 1,
      day: 1,
      timeSlot: null,
    },
  });

  const calendar = watch("calendar");
  const year = watch("year");
  const month = watch("month");

  const days = useMemo(() => {
    const maxDay =
      calendar === "lunar" ? 30 : new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: maxDay }, (_, i) => i + 1);
  }, [calendar, year, month]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload: BirthInput = {
        ...values,
        name: values.name?.trim() ?? "",
      };
      const res = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        saju?: unknown;
        core?: unknown;
        input?: unknown;
      };
      if (!res.ok || !data.saju) {
        toast.error(data.error ?? "만세력 산출에 실패했습니다.");
        return;
      }
      sessionStorage.setItem(
        "gps-result",
        JSON.stringify({ saju: data.saju, core: data.core, input: data.input }),
      );
      router.push("/result");
    } catch {
      toast.error(
        "서버와 통신할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      );
    }
  });

  const selectCls = "field-input";
  const labelCls = "mb-1.5 block text-sm font-medium text-ivory/80";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* 이름 */}
      <div>
        <label htmlFor="name" className={labelCls}>
          이름
        </label>
        <input
          id="name"
          type="text"
          placeholder="이름 또는 별명"
          maxLength={12}
          className={selectCls}
          style={{ backgroundImage: "none" }}
          {...register("name")}
        />
      </div>

      {/* 성별 */}
      <div>
        <span className={labelCls}>성별</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["male", "남성"],
              ["female", "여성"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={watch("gender") === value}
              onClick={() =>
                setValue("gender", value, { shouldValidate: true })
              }
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                watch("gender") === value
                  ? "border-gold bg-gold/15 text-gold-2"
                  : "border-line bg-ink-2 text-ivory/70 hover:border-gold/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.gender && (
          <p className="mt-1.5 text-xs text-vermilion">{errors.gender.message}</p>
        )}
      </div>

      {/* 양력/음력 */}
      <div>
        <span className={labelCls}>생일 형식</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["solar", "양력"],
              ["lunar", "음력"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={calendar === value}
              onClick={() =>
                setValue("calendar", value, { shouldValidate: true })
              }
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                calendar === value
                  ? "border-gold bg-gold/15 text-gold-2"
                  : "border-line bg-ink-2 text-ivory/70 hover:border-gold/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {calendar === "lunar" && (
          <label className="mt-2 flex items-center gap-2 text-xs text-ivory/70">
            <input
              type="checkbox"
              className="size-4 accent-[#d4af37]"
              {...register("leapMonth")}
            />
            윤달 출생입니다
          </label>
        )}
      </div>

      {/* 생년월일 */}
      <div>
        <span className={labelCls}>생년월일</span>
        <div className="grid grid-cols-3 gap-2">
          <select aria-label="출생 연도" className={selectCls} {...register("year", { valueAsNumber: true })}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select aria-label="출생 월" className={selectCls} {...register("month", { valueAsNumber: true })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <select aria-label="출생 일" className={selectCls} {...register("day", { valueAsNumber: true })}>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>
        {(errors.year || errors.month || errors.day) && (
          <p className="mt-1.5 text-xs text-vermilion">
            {errors.year?.message ??
              errors.month?.message ??
              errors.day?.message}
          </p>
        )}
      </div>

      {/* 출생 시간 (시두법 슬롯) */}
      <div>
        <span className={labelCls}>출생 시간</span>
        <select
          aria-label="출생 시간"
          className={selectCls}
          value={watch("timeSlot") ?? ""}
          onChange={(e) =>
            setValue("timeSlot", e.target.value === "" ? null : Number(e.target.value), {
              shouldValidate: true,
            })
          }
        >
          <option value="">시간 모름 (시주 제외 6자 해석)</option>
          {TIME_SLOTS.map((slot, i) => (
            <option key={slot.label} value={i}>
              {slot.label} · {slot.range}
            </option>
          ))}
        </select>
      </div>

      {/* 제출 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="relative w-full rounded-xl bg-gradient-to-r from-[#e8ce7a] via-[#d4af37] to-[#b8860b] px-6 py-4 text-base font-bold text-ink shadow-lg shadow-gold/20 transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            별자리를 읽는 중…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden />
            무료 사주 풀이 보기
          </span>
        )}
      </button>
    </form>
  );
}
