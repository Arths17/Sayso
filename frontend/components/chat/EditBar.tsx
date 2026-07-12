"use client";

import { useState } from "react";
import { editWorkflow } from "@/lib/api/workflows";
import { DiffView } from "@/components/chat/DiffView";
import { Button } from "@/components/ui/Button";
import type { EditResponse } from "@/lib/types";

export function EditBar({
  workflowId,
  onApplied,
}: {
  workflowId: string;
  onApplied: (result: EditResponse) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<EditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await editWorkflow(workflowId, instruction.trim());
      setLastResult(result);
      onApplied(result);
      setInstruction("");
    } catch {
      setError("Could not apply that edit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. only run this if amount > 500"
          className="flex-1 rounded-md border-2 border-border p-2.5 text-sm outline-none focus:border-accent"
        />
        <Button type="submit" disabled={loading || !instruction.trim()} className="shrink-0">
          {loading ? "Applying…" : "Apply edit"}
        </Button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {lastResult && (
        <div>
          <div className="font-mono-ui mb-1 text-xs font-medium text-ink-muted">
            New version: {lastResult.version}
          </div>
          <DiffView diff={lastResult.diff} />
        </div>
      )}
    </div>
  );
}
