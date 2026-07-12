"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import type { Execution, WorkflowRecord } from "@/app/api/index";
import PageShell from "@/app/components/PageShell";
import RowDivider from "@/app/components/RowDivider";

interface Row {
  workflow: WorkflowRecord;
  execution: Execution;
}

function stateLabel(state: Execution["state"]): string {
  switch (state) {
    case "completed":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "awaiting_heal_approval":
      return "Needs approval (heal)";
    case "awaiting_approval":
      return "Needs approval";
    default:
      return "Pending";
  }
}

export default function ExecutionsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!auth) {
      router.push("/login");
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();
      apiClient.setToken(token);
      try {
        const workflows = await apiClient.listWorkflows();
        const perWorkflow = await Promise.all(
          workflows.map(async (wf) => {
            try {
              const execs = await apiClient.listExecutions(wf.id);
              return execs.map((ex) => ({ workflow: wf, execution: ex }));
            } catch {
              return [];
            }
          })
        );
        const all = perWorkflow.flat().sort((a, b) =>
          (b.execution.created_at || "").localeCompare(a.execution.created_at || "")
        );
        setRows(all);
      } catch {
        setRows([]);
      }
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  return (
    <PageShell
      eyebrow="Executions"
      title="Every run, on the record"
      dek="State, mode, and timing for each run across all your workflows."
      loading={!ready}
      action={
        rows.length > 0 ? (
          <span className="ts-24px mono app-row-stat">
            {String(rows.length).padStart(2, "0")}
          </span>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <div className="app-empty">
          <p className="ts-16px app-dek">
            No runs yet. Run a workflow from the Workflows tab to see its execution log here.
          </p>
        </div>
      ) : (
        <div className="app-rows">
          <div className="app-tr">
            <span className="ts-11px mono all-caps color-white-50">Workflow</span>
            <span className="ts-11px mono all-caps color-white-50">State</span>
            <span className="ts-11px mono all-caps color-white-50">Mode</span>
            <span className="ts-11px mono all-caps color-white-50">Started</span>
          </div>
          {rows.map(({ workflow, execution }) => (
            <div key={execution.id}>
              <RowDivider />
              <div className="app-tr">
                <span className="ts-16px color-white">{workflow.spec.name}</span>
                <span className={`ts-13px mono all-caps app-state is--${execution.state}`}>
                  {stateLabel(execution.state)}
                </span>
                <span className="ts-13px color-white-50">
                  {execution.dry_run ? "Dry run" : "Live"}
                </span>
                <span className="ts-13px mono color-white-50">
                  {execution.created_at ? new Date(execution.created_at).toLocaleString() : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
