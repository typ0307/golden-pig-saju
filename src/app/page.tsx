import { BirthForm } from "@/components/form/BirthForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-16 pt-10 sm:pt-16">
      {/* 히어로 */}
      <header className="mb-8 text-center">
        <p className="font-hanja text-sm tracking-[0.4em] text-gold/80">
          金豚四柱
        </p>
        <h1 className="text-gold-gradient mt-2 text-4xl font-bold sm:text-5xl">
          황금돼지 사주
        </h1>
        <p className="mt-3 text-sm leading-6 text-ivory/70">
          생년월시만 알려주세요. 한국천문연구원 만세력 데이터로
          <br className="hidden sm:block" /> 사주팔자를 짚어주고, 성격 · 재물운 ·
          직업운을 따뜻하게 풀이해 드립니다.
        </p>
      </header>

      {/* 입력 폼 카드 */}
      <section className="rounded-2xl border border-gold/25 bg-card/90 p-5 shadow-2xl shadow-black/40 sm:p-7">
        <h2 className="sr-only">생년월시 입력</h2>
        <BirthForm />
      </section>
    </main>
  );
}
