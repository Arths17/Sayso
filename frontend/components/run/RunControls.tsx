"use client";

import { useState } from "react";
import { dryRunWorkflow, runWorkflow } from "@/lib/api/workflows";
import { Button } from "@/components/ui/Button";

export function RunControls({
  workflowId,
  onStarted,
}: {
  workflowId: string;
  onStarted: (executionId: string) => void;
}) {
  const [loading, setLoading] = useState<"dry" | "real" | null>(null);

  async function start(kind: "dry" | "real") {
    setLoading(kind);
    try {
      const res = kind === "dry" ? await dryRunWorkflow(workflowId) : await runWorkflow(workflowId);
      onStarted(res.execution_id);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => start("dry")} disabled={loading !== null}>
        {loading === "dry" ? "Starting…" : "Dry run"}
      </Button>
      <Button onClick={() => start("real")} disabled={loading !== null}>
        {loading === "real" ? "Starting…" : "Run"}
      </Button>
    </div>
  );
}
