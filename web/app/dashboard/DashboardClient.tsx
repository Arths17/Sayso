"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listWorkflows, latestExecution } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Execution, WorkflowRecord } from "@/lib/types";
import styles from "./dashboard.module.css";

type Status = "never" | "running" | "succeeded" | "failed" | "attention";

function classify(execution: Execution | null): Status {
  if (!execution) return "never";
  switch (execution.state) {
    case "running":
    case "pending":
      return "running";
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "awaiting_heal_approval":
    case "awaiting_approval":
      return "attention";
  }
}

const STATUS_LABEL: Record<Status, string> = {
  never: "never run",
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
  attention: "needs attention",
};

function connectorChips(workflow: WorkflowRecord): string[] {
  const names = workflow.spec.nodes.map((n) => n.connector).filter((n): n is string => Boolean(n));
  return [...new Set(names)].slice(0, 4);
}

export default function DashboardClient() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[] | null>(null);
  const [executions, setExecutions] = useState<Record<string, Execution | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const wfs = await listWorkflows();
        if (cancelled) return;
        setWorkflows(wfs);

        const pairs = await Promise.all(
          wfs.map(async (wf) => [wf.id, await latestExecution(wf.id).catch(() => null)] as const),
        );
        if (cancelled) return;
        setExecutions(Object.fromEntries(pairs));
      } catch {
        if (!cancelled) setError("Could not reach the Sayso API. Is the backend running?");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = workflows === null && !error;
  const rows = (workflows ?? []).map((wf) => ({
    workflow: wf,
    execution: executions[wf.id] ?? null,
    status: classify(executions[wf.id] ?? null),
  }));

  const stats = {
    total: rows.length,
    running: rows.filter((r) => r.status === "running").length,
    succeeded: rows.filter((r) => r.status === "succeeded").length,
    attention: rows.filter((r) => r.status === "attention" || r.status === "failed").length,
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Control panel</p>
      <h1 className={styles.heading}>Automations overview</h1>
      <p className={styles.dek}>
        Everything you&apos;ve built, in one place — what&apos;s running right now, what
        succeeded, and what needs a look.
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statTile}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total automations</div>
        </div>
        <div className={styles.statTile}>
          <div className={`${styles.statValue} ${stats.running ? styles.dotRunning : ""}`}>
            {stats.running}
          </div>
          <div className={styles.statLabel}>Running now</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statValue}>{stats.succeeded}</div>
          <div className={styles.statLabel}>Succeeded</div>
        </div>
        <div className={styles.statTile}>
          <div className={`${styles.statValue} ${stats.attention ? styles.dotAttention : ""}`}>
            {stats.attention}
          </div>
          <div className={styles.statLabel}>Needs attention</div>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeading}>
          <h2>All automations</h2>
          <span className={styles.tableCount}>{rows.length} total</span>
        </div>

        <div className={styles.table}>
          {loading && <div className={styles.emptyState}>Loading automations…</div>}
          {error && <div className={styles.errorState}>{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className={styles.emptyState}>
              No automations yet — generate one from the Sayso API to see it here.
            </div>
          )}
          {rows.map(({ workflow, execution, status }) => (
            <Link href={`/dashboard/${workflow.id}`} className={styles.row} key={workflow.id}>
              <span className={`${styles.statusDot} ${styles[status]}`} />
              <div className={styles.rowMain}>
                <div className={styles.rowName}>{workflow.spec.name || workflow.id}</div>
                <div className={styles.rowPrompt}>{workflow.prompt}</div>
              </div>
              <div className={styles.chips}>
                {connectorChips(workflow).map((name) => (
                  <span key={name} className={styles.chip}>
                    {name}
                  </span>
                ))}
                {connectorChips(workflow).length === 0 && (
                  <span className={styles.chip}>{workflow.spec.nodes.length} steps</span>
                )}
              </div>
              <div className={styles.rowMeta}>
                {execution ? relativeTime(execution.updated_at) : relativeTime(workflow.updated_at)}
              </div>
              <div className={`${styles.statusLabel} ${styles[status]}`}>{STATUS_LABEL[status]}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
