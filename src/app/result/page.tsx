"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { SajuResult, SajuCore } from "@/lib/saju/types";
import { MyeongsigTable } from "@/components/result/MyeongsigTable";
import { ElementChart } from "@/components/result/ElementChart";
import { DayMasterCard } from "@/components/result/DayMasterCard";
import {
  InterpretationView,
} from "@/components/result/InterpretationView";
import { MailReceiver } from "@/components/result/MailReceiver";
import { AskPanel } from "@/components/result/AskPanel";
import { RotateCcw } from "lucide-react";

interface StoredResult {
  saju: SajuResult;
  core: SajuCore;
  input: { gender: "male" | "female"; name?: string; timeSlot: number | null };
}

const subscribeNoop = () => () => {};

export default function ResultPage() {
  // 메일 수신용: 완성된 메인 풀이 텍스트를 InterpretationView에서 들어올림
  const [interpretationText, setInterpretationText] = useState("");

  // sessionStorage는 SSR에 없으므로 서버 스냅샷은 null, 클라이언트에서만 읽는다
  const raw = useSyncExternalStore(
    subscribeNoop,
    () => sessionStorage.getItem("gps-result"),
    () => null,
  );
  const data = useMemo<StoredResult | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredResult;
    } catch {
      return null;
    }
  }, [raw]);

  if (!raw) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-hanja text-5xl text-gold/60">空</p>
        <h1 className="mt-4 text-lg font-semibold text-ivory">
          아직 풀이할 명식이 없습니다
        </h1>
        <p className="mt-2 text-sm text-muted">
          생년월시를 입력하면 사주팔자를 짚어드립니다.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink hover:bg-gold-2"
        >
          사주 보러 가기
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="skeleton h-64 w-full rounded-2xl" aria-label="불러오는 중" />
      </main>
    );
  }

  const { saju, core, input } = data;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 pb-20 pt-8">
      {/* 헤더 */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-gold-gradient mt-1 text-2xl font-bold">
            {input.name ? `${input.name}님의 사주풀이` : "나의 사주풀이"}
          </h1>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-ivory/70 hover:border-gold/50 hover:text-gold-2"
        >
          <RotateCcw className="size-3.5" aria-hidden />새로 입력
        </Link>
      </header>

      {/* 1. 명식표 */}
      <MyeongsigTable saju={saju} />

      {/* 2. 일간 카드 */}
      <DayMasterCard saju={saju} />

      {/* 3. 오행 분포 */}
      <ElementChart saju={saju} />

      {/* 4. 메인 풀이 (SSE 스트리밍) */}
      <InterpretationView
        core={core}
        input={input}
        onComplete={setInterpretationText}
      />

      {/* 5. 메일로 받아보기 (선택) */}
      <MailReceiver
        name={input.name || "고객"}
        saju={saju}
        interpretation={interpretationText}
        ready={interpretationText.trim().length > 100}
      />

      {/* 6. 추가 질문 Q&A */}
      <AskPanel core={core} />

      {/* 개인정보 안심 문구 */}
      <footer className="pt-2 text-center text-[11px] leading-5 text-muted">
        생년월시는 풀이를 만드는 데에만 쓰이고 서버에 남기지 않습니다.
        <br />
        결과 화면은 이 브라우저에서만 보여요 — 창을 닫으면 함께 사라집니다.
      </footer>
    </main>
  );
}
