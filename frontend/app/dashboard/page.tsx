"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PromptBar } from "@/components/chat/PromptBar";
import { connectorIcon } from "@/lib/icons";
import { generateWorkflow, listWorkflows } from "@/lib/api/workflows";
import type { WorkflowRecord } from "@/lib/types";

function StepIcons({ workflow }: { workflow: WorkflowRecord }) {
  const connectors = [...new Set(workflow.spec.nodes.map((n) => n.connector).filter(Boolean))].slice(
    0,
    5,
  ) as string[];
  if (connectors.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {connectors.map((name) => {
        const Icon = connectorIcon(name);
        return (
          <span
            key={name}
            className="flex h-6 w-6 items-center justify-center rounded bg-accent-soft text-accent"
          >
            {Icon ? <Icon size={13} /> : null}
          </span>
        );
      })}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .catch(() => setError("Could not load workflows."))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate(prompt: string) {
    const res = await generateWorkflow(prompt);
    sessionStorage.setItem(`sayso:gen:${res.workflow_id}`, JSON.stringify(res));
    router.push(`/workflows/${res.workflow_id}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your workflows</h1>
      <div className="mt-6">
        <PromptBar onSubmit={handleGenerate} submitLabel="Generate" />
      </div>

      <div className="mt-10 space-y-3">
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && workflows.length === 0 && !error && (
          <p className="text-sm text-ink-muted">No workflows yet — describe one above to get started.</p>
        )}
        {workflows.map((wf) => (
          <button
            key={wf.id}
            onClick={() => router.push(`/workflows/${wf.id}`)}
            className="block w-full rounded-md bg-ink/[0.035] p-4 text-left transition-colors hover:bg-ink/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ink">{wf.spec.name || wf.id}</div>
                <div className="mt-1 truncate text-xs text-ink-muted">{wf.prompt}</div>
              </div>
              <StepIcons workflow={wf} />
            </div>
            <div className="font-mono-ui mt-2.5 text-[11px] text-ink-muted">
              {wf.spec.nodes.length} step{wf.spec.nodes.length === 1 ? "" : "s"} · updated{" "}
              {wf.updated_at ?? "—"}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
