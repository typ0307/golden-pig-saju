import type { SajuResult } from "@/lib/saju/types";
import {
  ELEMENT_META,
  TEN_GOD_DESC,
  TERM_DESC,
} from "@/lib/saju/constants";
import type { Element } from "@/lib/saju/types";
import { TermTooltip } from "@/components/ui/TermTooltip";

function SajuGlyph({
  han,
  kor,
  element,
  sub,
}: {
  han: string;
  kor: string;
  element: Element;
  sub: string;
}) {
  const meta = ELEMENT_META[element];
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-hanja text-4xl leading-none sm:text-5xl"
        style={{ color: meta.color }}
      >
        {han}
      </span>
      <span className="text-[11px] text-muted">{kor}</span>
      <TermTooltip desc={meta.tip} align="left">
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
      </TermTooltip>
      <TermTooltip desc={TEN_GOD_DESC[sub] ?? sub} align="left">
        <span className="text-[10px] text-ivory/50">{sub}</span>
      </TermTooltip>
    </div>
  );
}

/**
 * 명식표(命式表) — 사주팔자 사이트 표준 형태.
 * 모바일: 년/월 / 일/시 2×2, sm 이상: 4열.
 */
export function MyeongsigTable({ saju }: { saju: SajuResult }) {
  const [yearP, monthP, dayP, hourP] = saju.pillars;

  return (
    <section
      aria-label="사주팔자 명식표"
      className="rounded-2xl border border-gold/25 bg-card/80 p-5 shadow-xl shadow-black/30"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-hanja text-lg font-semibold text-gold-2">
          <TermTooltip desc={TERM_DESC.myeongsig}>
            <span>
              명식표 <span className="text-sm text-gold/60">四柱命式表</span>
            </span>
          </TermTooltip>
        </h2>
        <p className="text-xs text-muted">
          {saju.solar.year}.{String(saju.solar.month).padStart(2, "0")}.
          {String(saju.solar.day).padStart(2, "0")}
        </p>
      </header>

      {/* 상단: 천간 행 / 하단: 지지 행 구조가 세로 읽기에 유리 → 열=주 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[yearP, monthP, dayP, hourP].map((pillar) =>
          pillar ? (
            <div
              key={pillar.label}
              className="rounded-xl border border-line bg-ink-2/70 p-3"
            >
              <p className="mb-2 text-center text-[11px] font-medium text-muted">
                {pillar.label} · {pillar.title}
              </p>
              <div className="flex flex-col items-center gap-3">
                <SajuGlyph
                  han={pillar.stem.han}
                  kor={pillar.stem.kor}
                  element={pillar.stem.element}
                  sub={pillar.stem.tenGod}
                />
                <SajuGlyph
                  han={pillar.branch.han}
                  kor={pillar.branch.kor}
                  element={pillar.branch.element}
                  sub={pillar.branch.tenGod}
                />
              </div>
            </div>
          ) : (
            <div
              key="no-hour"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-2/40 p-3 text-center"
            >
              <p className="mb-2 text-[11px] font-medium text-muted">시주</p>
              <span className="font-hanja text-4xl text-ivory/25 sm:text-5xl">
                ？
              </span>
              <p className="mt-2 text-[10px] text-ivory/50">
                시간 모름
                <br />
                6자 해석
              </p>
            </div>
          ),
        )}
      </div>

      <footer className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-[11px] text-muted">
        <TermTooltip desc={TERM_DESC.iljin} align="left">
          <span>
            일진 <b className="text-ivory/80">{saju.dayGanji}</b>
          </span>
        </TermTooltip>
        {saju.lunar && (
          <span>
            음력{" "}
            <b className="text-ivory/80">
              {saju.lunar.isLeapMonth ? "윤" : ""}
              {saju.lunar.month}/{saju.lunar.day}
            </b>
          </span>
        )}
      </footer>
    </section>
  );
}
