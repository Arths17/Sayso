"use client";

import { useState } from "react";
import { revertWorkflow } from "@/lib/api/workflows";
import { Button } from "@/components/ui/Button";
import type { WorkflowVersion } from "@/lib/types";

export function RevertConfirm({
  workflowId,
  version,
  onCancel,
  onReverted,
}: {
  workflowId: string;
  version: WorkflowVersion;
  onCancel: () => void;
  onReverted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await revertWorkflow(workflowId, version.id);
      onReverted();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-md border-2 border-ink bg-bg p-5 shadow-xl">
        <h3 className="font-display text-sm font-bold text-ink">Revert to {version.id}?</h3>
        <p className="mt-1 text-xs text-ink-muted">
          This creates a new version from &ldquo;{version.message}&rdquo; — existing history stays intact.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? "Reverting…" : "Revert"}
          </Button>
        </div>
      </div>
    </div>
  );
}
