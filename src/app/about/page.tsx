import Link from "next/link";

const VENMO_TIP_URL =
  "https://venmo.com/shari-paltrowitz?txn=pay&amount=5&note=Partake%20%F0%9F%8D%95";
const VENMO_TIP_OPEN_URL =
  "https://venmo.com/shari-paltrowitz?txn=pay&note=Partake%20%F0%9F%8D%95";

export default function AboutPage() {
  return (
    <main className="min-h-dvh px-5 py-10 pb-safe">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center rounded-full border border-[#E8DDD0] bg-white/90 px-4 py-2 text-sm font-semibold text-[#6F5F51] shadow-sm shadow-[#2D2319]/5 transition-colors hover:border-[#F4A261] hover:bg-[#FFF7EF] hover:text-[#E8613C]"
        >
          ← Back to Partake
        </Link>

        <div className="overflow-hidden rounded-[2rem] border border-[#F5EDE3] bg-white shadow-xl shadow-[#2D2319]/5">
          <div className="relative bg-gradient-to-br from-white via-[#FFF7EF] to-[#F5EDE3] p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#FFD6A5]/45" />
            <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-[#E8613C]/10" />
            <div className="relative">
              <p className="mb-3 inline-flex rounded-full border border-[#FFD6A5] bg-white/80 px-3 py-1 text-xs font-bold text-[#E8613C] shadow-sm">
                About Partake
              </p>
              <h1 className="text-4xl font-black tracking-[-0.05em] text-[#2D2319] sm:text-5xl">
                Built for the part of dinner nobody wants to do.
              </h1>
              <p className="mt-4 text-base leading-7 text-[#6F5F51]">
                Partake started from a very specific kind of group-chat pain: the meal was great, the bill arrived, and suddenly everyone was doing math, scrolling Venmo, and trying not to make it awkward.
              </p>
              <p className="mt-3 text-base leading-7 text-[#6F5F51]">
                I built it so splitting a receipt could feel as easy as the dinner itself. Scan the bill, tap who got what, and send clean payment requests without turning the end of the night into spreadsheet time.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[#FFD6A5] bg-[#FFF7EF] p-5 shadow-lg shadow-[#2D2319]/5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#A87957]">Support the developer</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#2D2319]">Tip me if Partake saved your table math.</h2>
              <p className="mt-2 text-sm leading-6 text-[#6F5F51]">
                Partake is a free side project. If it made splitting dinner easier, a tip helps me keep building, fixing, and polishing it.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <a
                href={VENMO_TIP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#E8613C] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#E8613C]/20 transition-transform hover:-translate-y-0.5"
              >
                🍕 Cover my share — $5
              </a>
              <a
                href={VENMO_TIP_OPEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#A87957] hover:text-[#E8613C] transition-colors"
              >
                or pick your own amount →
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Private by default", "Use Partake anonymously, or sign in when you want bill history to follow you."],
            ["Made for phones", "The flow is optimized for the real moment: standing outside the restaurant with friends."],
            ["Still improving", "Feedback goes straight into the backlog so I can keep smoothing the rough edges."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-[#F5EDE3] bg-white p-4 shadow-sm shadow-[#2D2319]/5">
              <h2 className="text-sm font-bold text-[#2D2319]">{title}</h2>
              <p className="mt-2 text-sm leading-5 text-[#6F5F51]">{description}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#E8DFD4] pt-4 text-center text-xs text-[#C4B5A6]">
          <Link href="/privacy" className="font-semibold transition-colors hover:text-[#9C8E80]">Privacy</Link>
          <span className="mx-3">·</span>
          <Link href="/terms" className="font-semibold transition-colors hover:text-[#9C8E80]">Terms</Link>
        </div>
      </section>
    </main>
  );
}
