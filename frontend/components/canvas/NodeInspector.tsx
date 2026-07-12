"use client";

import { useState } from "react";
import { Sparkles, X, type LucideIcon } from "lucide-react";
import { connectorMeta } from "@/lib/connectors";
import { connectorIcon } from "@/lib/icons";
import { explainNode } from "@/lib/api/workflows";
import { Button } from "@/components/ui/Button";
import type { NodeStatus, WorkflowNode } from "@/lib/types";

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
      <Icon size={15} />
    </span>
  );
}

export function NodeInspector({
  workflowId,
  node,
  status,
  onClose,
}: {
  workflowId: string;
  node: WorkflowNode;
  status?: NodeStatus;
  onClose: () => void;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const meta = connectorMeta(node.connector);
  const icon = connectorIcon(meta?.icon) ?? Sparkles;

  async function handleExplain() {
    setLoading(true);
    try {
      const res = await explainNode(workflowId, node.id);
      setExplanation(res.explanation);
    } catch {
      setExplanation("Could not load explanation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute right-3 top-3 z-10 w-80 rounded-md border-2 border-ink bg-bg p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <IconBadge icon={icon} />
          <div>
            <div className="font-mono-ui text-sm font-semibold text-ink">{node.id}</div>
            <div className="text-xs text-ink-muted">{meta?.label ?? node.type}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {status && (
        <div className="mt-2 text-xs text-ink-muted">
          Status: <span className="font-semibold text-ink">{status}</span>
        </div>
      )}

      {Object.keys(node.config).length > 0 && (
        <div className="mt-3">
          <div className="font-mono-ui text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Config
          </div>
          <pre className="font-mono-ui mt-1 max-h-40 overflow-auto rounded bg-ink/[0.04] p-2 text-xs text-ink dark:bg-white/[0.06]">
            {JSON.stringify(node.config, null, 2)}
          </pre>
        </div>
      )}

      {node.retry_policy.max_attempts > 1 && (
        <div className="mt-2 text-xs text-ink-muted">
          Retries: {node.retry_policy.max_attempts} (backoff {node.retry_policy.backoff_seconds}s)
        </div>
      )}

      <div className="mt-3">
        {!explanation && (
          <Button variant="secondary" size="sm" onClick={handleExplain} disabled={loading}>
            {loading ? "Explaining…" : "Why this node?"}
          </Button>
        )}
        {explanation && (
          <p className="rounded bg-accent-soft p-2 text-xs text-ink">{explanation}</p>
        )}
      </div>
    </div>
  );
}
