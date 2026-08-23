import type { SajuResult } from "@/lib/saju/types";
import { ELEMENT_META, TERM_DESC } from "@/lib/saju/constants";
import { TermTooltip } from "@/components/ui/TermTooltip";

/** 일간(Day Master) 카드 */
export function DayMasterCard({ saju }: { saju: SajuResult }) {
  const dm = saju.dayMaster;
  const meta = ELEMENT_META[dm.element];

  return (
    <section
      aria-label="일간 정보"
      className="rounded-2xl border border-gold/25 bg-card/80 p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-hanja text-lg font-semibold text-gold-2">
          <TermTooltip desc={TERM_DESC.dayMaster}>
            <span>
              일간 <span className="text-sm text-gold/60">日干</span>
            </span>
          </TermTooltip>
        </h2>
        <p className="text-xs text-muted">나를 표현하는 중심 글자</p>
      </header>
      <div className="flex items-center gap-4">
        <span
          className="font-hanja flex size-16 items-center justify-center rounded-2xl text-4xl"
          style={{
            color: meta.color,
            backgroundColor: `${meta.color}18`,
            border: `1px solid ${meta.color}44`,
          }}
        >
          {dm.han}
        </span>
        <div>
          <p className="text-base font-semibold text-ivory">
            {dm.kor}일간({dm.han})
            <TermTooltip desc={meta.tip} align="left">
              <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold-2">
                {dm.polarity === "yang" ? "陽" : "陰"} {meta.label}의 기운
              </span>
            </TermTooltip>
          </p>
          <p className="mt-1 text-sm text-ivory/75">{dm.keyword}</p>
          <p className="mt-0.5 text-xs text-muted">{meta.desc}</p>
        </div>
      </div>
    </section>
  );
}
