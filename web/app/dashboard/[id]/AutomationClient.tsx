"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { dryRunWorkflow, getExecution, getWorkflow, runWorkflow } from "@/lib/api";
import { logsByNode, statusColor } from "@/lib/graph/statusColor";
import type { Execution, WorkflowRecord } from "@/lib/types";
import styles from "./automation.module.css";

const POLL_MS = 1500;
const TERMINAL = new Set(["completed", "failed", "awaiting_heal_approval", "awaiting_approval"]);

export default function AutomationClient({ workflowId }: { workflowId: string }) {
  const [record, setRecord] = useState<WorkflowRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [starting, setStarting] = useState<"dry" | "real" | null>(null);

  useEffect(() => {
    getWorkflow(workflowId)
      .then(setRecord)
      .catch(() => setLoadError("Could not load this automation. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [workflowId]);

  useEffect(() => {
    if (!executionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const ex = await getExecution(workflowId, executionId as string);
        if (cancelled) return;
        setExecution(ex);
        if (!TERMINAL.has(ex.state)) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch {
        // transient — leave the last known state in place
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [workflowId, executionId]);

  async function start(kind: "dry" | "real") {
    setStarting(kind);
    try {
      const res = kind === "dry" ? await dryRunWorkflow(workflowId) : await runWorkflow(workflowId);
      setExecutionId(res.execution_id);
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return <div className={styles.wrap}>Loading…</div>;
  }
  if (loadError || !record) {
    return <div className={styles.wrap}>{loadError ?? "Automation not found."}</div>;
  }

  const statusByNode = execution ? logsByNode(execution.logs) : undefined;

  return (
    <div className={styles.wrap}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to control panel
      </Link>
      <h1 className={styles.heading}>{record.spec.name || record.id}</h1>
      <p className={styles.prompt}>{record.prompt}</p>

      <div className={styles.canvasSection}>
        <FlowCanvas workflowId={workflowId} spec={record.spec} statusByNode={statusByNode} />
      </div>

      <div className={styles.grid}>
        <div>
          <p className={styles.sectionLabel}>Run</p>
          <div className={styles.runRow}>
            <button
              className={styles.btnSecondary}
              disabled={starting !== null}
              onClick={() => start("dry")}
            >
              {starting === "dry" ? "Starting…" : "Dry run"}
            </button>
            <button
              className={styles.btnPrimary}
              disabled={starting !== null}
              onClick={() => start("real")}
            >
              {starting === "real" ? "Starting…" : "Run"}
            </button>
          </div>

          {execution && (
            <div className={styles.execPanel}>
              <div className={styles.execHeader}>
                <span className={styles.execId}>{execution.id}</span>
                <span className={styles.execState}>{execution.state}</span>
              </div>
              <div className={styles.logList}>
                {execution.logs.length === 0 && (
                  <span className={styles.empty}>Waiting for the first node to start…</span>
                )}
                {execution.logs.map((log, i) => (
                  <div className={styles.logRow} key={`${log.node_id}-${i}`}>
                    <span className={styles.logDot} style={{ background: statusColor(log.status) }} />
                    <span className={styles.logNode}>{log.node_id}</span>
                    <span className={styles.logStatus}>{log.status}</span>
                    {log.error && <span className={styles.logError}>{log.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
