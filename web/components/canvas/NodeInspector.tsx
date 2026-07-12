"use client";

import { useState } from "react";
import { Sparkles, X, type LucideIcon } from "lucide-react";
import { connectorMeta } from "@/lib/connectors";
import { connectorIcon } from "@/lib/icons";
import { explainNode } from "@/lib/api";
import type { NodeStatus, WorkflowNode } from "@/lib/types";
import styles from "./canvas.module.css";

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className={styles.inspectorBadge}>
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
    <div className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <div className={styles.inspectorTitleRow}>
          <IconBadge icon={icon} />
          <div>
            <div className={styles.inspectorId}>{node.id}</div>
            <div className={styles.inspectorType}>{meta?.label ?? node.type}</div>
          </div>
        </div>
        <button onClick={onClose} className={styles.inspectorClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {status && (
        <div className={styles.inspectorStatus}>
          Status: <b>{status}</b>
        </div>
      )}

      {Object.keys(node.config).length > 0 && (
        <div>
          <div className={styles.inspectorLabel}>Config</div>
          <pre className={styles.inspectorConfig}>{JSON.stringify(node.config, null, 2)}</pre>
        </div>
      )}

      {node.retry_policy.max_attempts > 1 && (
        <div className={styles.inspectorRetry}>
          Retries: {node.retry_policy.max_attempts} (backoff {node.retry_policy.backoff_seconds}s)
        </div>
      )}

      {!explanation && (
        <button onClick={handleExplain} disabled={loading} className={styles.explainButton}>
          {loading ? "Explaining…" : "Why this node?"}
        </button>
      )}
      {explanation && <p className={styles.explainText}>{explanation}</p>}
    </div>
  );
}
