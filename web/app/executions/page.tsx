"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import type { Execution, WorkflowRecord } from "@/app/api/index";
import TopNav from "@/app/components/TopNav";
import DashedDivider from "@/app/components/DashedDivider";

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
    <main className="ex_wrap">
      <TopNav />

      <section className="ex_main">
        {!ready ? (
          <p className="ts-13px color-white-50 mono">Loading...</p>
        ) : (
          <>
            <header className="ex_header">
              <h1 className="ts-16px color-white mono all-caps ex_title">Executions</h1>
            </header>

            <DashedDivider />

            {rows.length === 0 ? (
              <div className="ex_empty">
                <p className="ts-14px color-white-50 ex_empty-text">
                  No runs yet. Run a workflow from the Workflows tab to see its execution log here.
                </p>
              </div>
            ) : (
              <div className="ex_table">
                <div className="ex_row ex_row--head">
                  <span className="ts-11px color-white-50 mono all-caps">Workflow</span>
                  <span className="ts-11px color-white-50 mono all-caps">State</span>
                  <span className="ts-11px color-white-50 mono all-caps">Mode</span>
                  <span className="ts-11px color-white-50 mono all-caps">Started</span>
                </div>
                {rows.map(({ workflow, execution }) => (
                  <div key={execution.id} className="ex_row">
                    <span className="ts-13px color-white">{workflow.spec.name}</span>
                    <span className={`ts-12px mono all-caps ex_state ex_state--${execution.state}`}>
                      {stateLabel(execution.state)}
                    </span>
                    <span className="ts-12px color-white-50">
                      {execution.dry_run ? "Dry run" : "Live"}
                    </span>
                    <span className="ts-12px color-white-50">
                      {execution.created_at ? new Date(execution.created_at).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <style>{`
        .ex_wrap {
          min-height: 100dvh;
          background-color: var(--color--black);
        }

        .ex_main {
          max-width: 72em;
          margin: 0 auto;
          padding: 7.5em 3em 4em;
        }

        .ex_title {
          margin: 0;
        }

        .ex_empty {
          border: 1px dashed var(--color--grey-800);
          padding: 3.5em 2em;
          text-align: center;
          margin-top: 2em;
        }

        .ex_empty-text {
          margin: 0;
        }

        .ex_table {
          border: 1px solid var(--color--grey-800);
          margin-top: 2em;
        }

        .ex_row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.25fr;
          gap: 1em;
          align-items: center;
          padding: 1em 1.25em;
          border-bottom: 1px solid var(--color--grey-800);
        }

        .ex_row:last-child {
          border-bottom: none;
        }

        .ex_row--head {
          background-color: var(--color--grey-900);
        }

        .ex_state {
          color: var(--color--grey-300);
        }

        .ex_state--completed {
          color: var(--color--white);
        }

        .ex_state--failed {
          color: var(--orange);
        }

        .ex_state--running {
          color: var(--color--primary-blue);
        }
      `}</style>
    </main>
  );
}
