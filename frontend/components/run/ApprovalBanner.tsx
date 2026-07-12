"use client";

import { useState } from "react";
import { approveNode } from "@/lib/api/workflows";

export function ApprovalBanner({
  workflowId,
  executionId,
  nodeId,
  onResolved,
}: {
  workflowId: string;
  executionId: string;
  nodeId: string;
  onResolved: () => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handle(approve: boolean) {
    setLoading(approve ? "approve" : "reject");
    try {
      await approveNode(workflowId, executionId, approve);
      onResolved();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-md border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
      <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Waiting for your approval: &ldquo;{nodeId}&rdquo;
      </div>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
        This node pauses execution until it&apos;s approved or rejected.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => handle(true)}
          disabled={loading !== null}
          className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => handle(false)}
          disabled={loading !== null}
          className="rounded border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
