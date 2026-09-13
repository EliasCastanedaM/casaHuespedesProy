import { Link } from "react-router-dom";

const LAST_UPDATED = "13 de septiembre de 2026";

export default function LegalPage({ title, intro, children }) {
  return (
    <main className="min-h-[70vh] bg-[#f4efe6] px-5 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-t-[28px] bg-[#2b1d12] px-6 py-10 text-white md:px-10 md:py-12">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d9b48f]">
            Información legal
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
            {intro}
          </p>
        </header>

        <article className="rounded-b-[28px] border border-t-0 border-[#eadfce] bg-white px-6 py-9 text-[#5f5147] shadow-[0_18px_45px_rgba(43,29,18,0.08)] md:px-10 md:py-12">
          <p className="mb-9 border-b border-[#eadfce] pb-5 text-xs font-bold uppercase tracking-[0.14em] text-[#8f623a]">
            Última actualización: {LAST_UPDATED}
          </p>

          <div className="space-y-8 text-[15px] leading-7 md:text-base">
            {children}
          </div>

          <div className="mt-10 border-t border-[#eadfce] pt-6">
            <Link
              to="/"
              className="inline-flex items-center rounded-full bg-[#a87545] px-5 py-3 text-sm font-black text-white transition hover:bg-[#8f623a]"
            >
              Volver al inicio
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black text-[#2b1d12]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ children }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[#a87545]">
      {children}
    </ul>
  );
}
