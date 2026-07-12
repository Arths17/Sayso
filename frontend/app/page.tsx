"use client";

import Link from "next/link";
import { useLenis } from "@/lib/hooks/useLenis";
import { Reveal } from "@/components/marketing/Reveal";
import { SplitLines } from "@/components/marketing/SplitLines";
import { DagHero } from "@/components/marketing/DagHero";

const STEPS = [
  {
    title: "Describe it",
    body: "Tell Sayso what you want automated, in plain English — no drag-and-drop node wiring.",
  },
  {
    title: "Review the plan",
    body: "A planner and critic turn your prompt into a structured workflow, and ask if anything's ambiguous.",
  },
  {
    title: "Run it for real",
    body: "Validated, compiled into an executable DAG, and run with connectors to Gmail, Sheets, Slack, and more.",
  },
];

export default function Home() {
  useLenis();

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-0">
        <div>
          <Reveal>
            <p className="font-mono-ui text-xs font-medium uppercase tracking-[0.18em] text-accent">
              Cursor for automation
            </p>
          </Reveal>
          <h1 className="mt-5 max-w-xl text-5xl font-extrabold tracking-tight text-ink text-balance sm:text-6xl">
            <SplitLines text="Turn plain English into a working automation." />
          </h1>
          <Reveal delay={200} className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
            <p>
              &ldquo;Whenever I receive an invoice PDF in Gmail, extract the total and due date,
              save it to Drive, log it to Sheets, and message me on Slack.&rdquo; Sayso plans,
              validates, compiles, and runs it.
            </p>
          </Reveal>
          <Reveal delay={350} className="mt-10">
            <Link
              href="/dashboard"
              className="inline-block rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              Build a workflow
            </Link>
          </Reveal>
        </div>
        <Reveal delay={150} className="mx-auto w-full max-w-md lg:mx-0">
          <DagHero />
        </Reveal>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 py-24 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 120}>
            <div className="h-full rounded-md bg-ink/[0.035] p-6 dark:bg-white/[0.04]">
              <div className="font-mono-ui text-xs font-semibold text-accent">0{i + 1}</div>
              <h3 className="mt-3 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="contrast-block px-6 py-28">
        <div className="mx-auto w-full max-w-3xl text-center">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance">
              Build → refine → understand → recover → run.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed opacity-70">
              Ask why a node exists, edit a workflow in plain English, and when a step breaks,
              Sayso proposes a fix you approve before it&apos;s applied.
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
