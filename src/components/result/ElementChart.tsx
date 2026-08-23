import type { SajuResult } from "@/lib/saju/types";
import { ELEMENT_META, TERM_DESC } from "@/lib/saju/constants";
import type { Element } from "@/lib/saju/types";
import { TermTooltip } from "@/components/ui/TermTooltip";

/** 오행 분포 가로 막대 차트 (목화토금수 5색) */
export function ElementChart({ saju }: { saju: SajuResult }) {
  const total = Object.values(saju.elements).reduce((a, b) => a + b, 0);
  const entries = (Object.keys(saju.elements) as Element[]).map((el) => {
    const count = saju.elements[el];
    return {
      el,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
      meta: ELEMENT_META[el],
    };
  });
  const max = Math.max(...entries.map((e) => e.count), 1);

  return (
    <section
      aria-label="오행 분포"
      className="rounded-2xl border border-gold/25 bg-card/80 p-5"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-hanja text-lg font-semibold text-gold-2">
          <TermTooltip desc={TERM_DESC.elements}>
            <span>
              오행 분포 <span className="text-sm text-gold/60">五行分布</span>
            </span>
          </TermTooltip>
        </h2>
        <p className="text-xs text-muted">총 {total}글자</p>
      </header>
      <ul className="space-y-3">
        {entries.map(({ el, count, percent, meta }) => (
          <li key={el} className="flex items-center gap-3">
            <TermTooltip desc={meta.tip} align="left">
              <span className="inline-flex w-14 shrink-0 items-center text-sm">
                <span className="font-hanja" style={{ color: meta.color }}>
                  {meta.han}
                </span>
                <span className="ml-1 text-xs text-muted">{meta.label}</span>
              </span>
            </TermTooltip>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-ink-2">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: meta.color,
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-ivory/70">
              {count}개 · {percent}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
