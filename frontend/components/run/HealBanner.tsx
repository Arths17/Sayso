"use client";

import { useState } from "react";
import { approveHeal } from "@/lib/api/workflows";
import type { HealPatch } from "@/lib/types";

export function HealBanner({
  workflowId,
  executionId,
  patch,
  onResolved,
}: {
  workflowId: string;
  executionId: string;
  patch: HealPatch;
  onResolved: () => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handle(approve: boolean) {
    setLoading(approve ? "approve" : "reject");
    try {
      await approveHeal(workflowId, executionId, approve);
      onResolved();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-md border-2 border-purple-400 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-950">
      <div className="text-sm font-semibold text-purple-900 dark:text-purple-200">
        Self-healing patch proposed for &ldquo;{patch.node_id}&rdquo;
      </div>
      <p className="mt-1 text-xs text-purple-800 dark:text-purple-300">{patch.error}</p>
      <p className="mt-2 text-xs text-purple-700 dark:text-purple-300">{patch.diff_explanation}</p>
      <pre className="font-mono-ui mt-2 max-h-32 overflow-auto rounded bg-white/70 p-2 text-xs text-ink dark:bg-black/20">
        {JSON.stringify(patch.patch, null, 2)}
      </pre>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => handle(true)}
          disabled={loading !== null}
          className="rounded bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {loading === "approve" ? "Applying…" : "Approve fix"}
        </button>
        <button
          onClick={() => handle(false)}
          disabled={loading !== null}
          className="rounded border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:text-purple-300 dark:hover:bg-purple-900"
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
