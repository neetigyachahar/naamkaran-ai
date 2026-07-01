import { NAME_GENRES } from "@naamkaran/shared";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { AppHeader } from "../components/AppHeader";
import { LogoMark } from "../components/LogoMark";

const GENRE_INSIGHTS: Record<(typeof NAME_GENRES)[number]["id"], string> = {
  "best-fit":
    "Start here when you know what you're building but not how it should sound. The model reads your product, audience, and tone from your brief and mixes coined words, descriptive hints, or bold swings — whatever fits. It's the equivalent of a good naming agency's first round before you've picked a lane.",
  "action-phrase":
    "This pattern turns your product into a verb customers can picture themselves doing. Imperative + object names work especially well in consumer apps and marketplaces where the job-to-be-done is obvious. They're long for domains, but memorable — and Smart pick helps filter for what's still available.",
  "gen-z":
    "Built for products that live on feeds and in DMs: short, vowel-forward, slightly abstract. The goal isn't to describe features — it's to feel native to how younger audiences name things in group chats. Great for social, creator tools, and anything where 'cool' is part of the value prop.",
  "single-word":
    "One real English word, chosen for evocation rather than literal description. Stripe doesn't mean payments; Bloom doesn't mean finance. These names age well and travel globally, but competition for domains and trademarks is fierce — which is exactly why viability checking matters before you commit.",
  "twisted-word":
    "Take a word people already know and nudge the spelling until it's ownable. The brain still reads the original meaning, but registrars and trademark databases see something distinct. It's the classic startup hack for getting a .com when the dictionary word is long gone.",
  "minimal-tech":
    "The developer-tools aesthetic: tight letter counts, no fluff, sounds like it belongs in a terminal or a GitHub sidebar. These names signal precision and seriousness. They work when your buyer is technical and your brand should feel engineered, not marketed.",
  "desi-modern":
    "Names rooted in Indian languages and culture, written in Roman script so they're easy to type, share, and say on a global call. They feel local-first without being inaccessible abroad — the sweet spot for India's startup ecosystem and diaspora-facing products.",
  "playful":
    "Warm, approachable, human. These names lower the intimidation barrier — perfect for consumer apps, education, health, and anything where trust starts with a smile. They rarely sound 'enterprise,' which is a feature when your competition feels cold and corporate.",
  "premium":
    "Restrained, elevated, quiet confidence. Fewer syllables, softer consonants, nothing gimmicky. The name should feel expensive before anyone sees pricing — think hospitality, luxury goods, high-end services, or any brand where understatement is the point.",
  compound:
    "Fuse two ideas into one portmanteau or compound and you get instant clarity: what you do is baked into the name. The tradeoff is length and domain availability, but the upside is memorability and SEO-adjacent recognizability. Classic pattern for platforms and two-sided markets.",
};

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Naamkaran — Name Generator & Viability Checker" },
    {
      name: "description",
      content:
        "Brainstorm startup names with AI, check domain availability, and score brand uniqueness — manually, with generation, or Smart pick.",
    },
  ];
}

function SectionHeading({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <header className="scroll-mt-24">
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {children}
      </h2>
    </header>
  );
}

function WayCard({
  number,
  title,
  tagline,
  children,
}: {
  number: string;
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm font-medium text-indigo-600">{tagline}</p>
          <div className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-slate-600">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

function GenreCard({
  label,
  description,
  example,
  insight,
}: {
  label: string;
  description: string;
  example: string;
  insight: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
      <h3 className="font-semibold text-slate-900">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{insight}</p>
      <p className="mt-3 text-xs font-medium text-indigo-600">e.g. {example}</p>
    </article>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <AppHeader />

      <main className="flex-1">
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-white">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.12),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="flex items-center gap-3">
              <LogoMark variant="mark" size={56} />
              <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Name · Validate · Launch
              </p>
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Name your company before the domain registrar names your regret.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl sm:leading-relaxed">
              <span className="font-medium text-slate-800">Naamkaran</span> is where naming
              creativity meets reality checks. Brainstorm with AI in ten distinct styles, verify
              domains across TLDs, scan for brand collisions on Google, and walk away with a
              shortlist you can actually register — not just admire.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/workspace"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
              >
                Open workspace
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#ways-to-explore"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                How it works
              </a>
            </div>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <section className="space-y-5 text-[1.05rem] leading-relaxed text-slate-600">
            <p>
              Picking a name feels romantic until you search it. The .com is parked. A YC company
              from 2019 already owns the Twitter handle. Your co-founder&apos;s cousin had the same
              idea. Suddenly you&apos;re three weeks into a rebrand you never planned.
            </p>
            <p>
              Naamkaran shortens that loop. The workspace splits into two panes: a conversational
              name generator on the left and a live viability panel on the right. Generate wildly,
              check manually, or let Smart pick filter as it goes — whatever matches how you think.
              Read on, then step into the tool when you&apos;re ready.
            </p>
          </section>

          <section className="mt-16 space-y-6" aria-labelledby="ways-to-explore">
            <SectionHeading id="ways-to-explore" eyebrow="The workspace">
              Three ways to explore names
            </SectionHeading>
            <p className="text-[1.05rem] leading-relaxed text-slate-600">
              Every path ends in the same viability panel. You choose how much automation you want
              on the way there.
            </p>

            <div className="space-y-5">
              <WayCard
                number="1"
                title="Manual viability check"
                tagline="You bring the name — we run the checks"
              >
                <p>
                  Already have a favorite? Skip the chat. In the workspace, use the manual check
                  field at the bottom of the <strong className="font-medium text-slate-800">Viability
                    score</strong> panel: type any name, optionally pick a product category for sharper
                  brand-search context, and hit <strong>Check</strong>.
                </p>
                <p>
                  Results stream in live — domain availability via RDAP (with WHOIS fallback across
                  TLDs), then brand uniqueness through grounded Google Search from multiple angles.
                  Domain and brand each contribute 50% to a composite score you can compare across
                  finalists.
                </p>
                <p>
                  Perfect for shower thoughts, stress-testing a shortlist, or answering
                  &ldquo;is this taken?&rdquo; before your next standup.
                </p>
              </WayCard>

              <WayCard
                number="2"
                title="Generate names (ideas only)"
                tagline="Brainstorm freely — check when you're ready"
              >
                <p>
                  Pick a naming style, add optional product context, describe what you&apos;re
                  building, and send. With <strong className="font-medium text-slate-800">Smart pick
                    off</strong>, you get raw creative output: a batch of on-style suggestions as
                  clickable chips, no filtering yet.
                </p>
                <p>
                  Click any name to run a full analysis on the right, or keep chatting —
                  &ldquo;shorter,&rdquo; &ldquo;more Desi,&rdquo; &ldquo;avoid hyphens&rdquo; — until
                  the list feels right. Maximum creative range; you decide what earns a check.
                </p>
              </WayCard>

              <WayCard
                number="3"
                title="Smart pick — generate and validate together"
                tagline="AI brainstorms, then only surfaces names that pass"
              >
                <p>
                  Flip <strong className="font-medium text-slate-800">Smart pick</strong> on before
                  you generate. Each candidate runs domain and brand checks automatically — you watch
                  considering → domain → brand search → score unfold in the chat.
                </p>
                <p>
                  Names below the bar are set aside; names scoring{" "}
                  <strong className="font-medium text-slate-800">60+</strong> appear with their scores.
                  Click any winner for the full TLD breakdown, search evidence, and composite ring on
                  the right.
                </p>
                <p>
                  The fastest route from product idea to an ownable shortlist — fewer beautiful names
                  that were dead on arrival.
                </p>
              </WayCard>
            </div>
          </section>

          <section className="mt-16 space-y-5" aria-labelledby="what-we-check">
            <SectionHeading id="what-we-check" eyebrow="Under the hood">
              What &ldquo;viable&rdquo; means
            </SectionHeading>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm">
                    🌐
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Domain availability</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Registration data across common TLDs via RDAP (IANA bootstrap), with WHOIS
                      fallback. Per-TLD status at a glance — no dozen registrar tabs.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-sm">
                    🔍
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Brand uniqueness</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Gemini runs grounded Google Search — exact name, name plus category, similar
                      spellings — and returns a score with cited evidence. Not legal clearance, but
                      it catches obvious collisions early.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm">
                    ◎
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Composite score</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      One number to rank finalists: 50% domain, 50% brand. Streams in as checks
                      complete — no staring at a blank panel.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="mt-16 space-y-6" aria-labelledby="naming-styles">
            <SectionHeading id="naming-styles" eyebrow="Creative range">
              Ten naming styles — and the idea behind each
            </SectionHeading>
            <p className="text-[1.05rem] leading-relaxed text-slate-600">
              Great names aren&apos;t random; they follow patterns that signal intent to your
              audience. Naamkaran doesn&apos;t use one generic prompt — each style encodes a
              different creative strategy, tuned for how real companies actually get named. Pick one
              before your first message, or start with Best fit and let the model choose.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {NAME_GENRES.map((genre) => (
                <GenreCard
                  key={genre.id}
                  label={genre.label}
                  description={genre.description}
                  example={genre.example}
                  insight={GENRE_INSIGHTS[genre.id]}
                />
              ))}
            </div>

            <p className="text-sm leading-relaxed text-slate-500">
              Styles lock in after your first message so the conversation stays coherent — but you
              can steer with follow-ups (&ldquo;more like Linear,&rdquo; &ldquo;less cute&rdquo;) until
              it clicks. Try a different style on your next session if you want a fresh direction.
            </p>
          </section>

          <section className="mt-16 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 text-center sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">Your turn.</h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-600">
              Open the workspace, type a name you&apos;re curious about, or turn Smart pick on and
              let Naamkaran build a scored shortlist while you watch.
            </p>
            <Link
              to="/workspace"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Start naming
              <span aria-hidden>→</span>
            </Link>
          </section>
        </article>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <p>Naamkaran — name with confidence.</p>
      </footer>
    </div>
  );
}
