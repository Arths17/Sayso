"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import type { Execution, WorkflowRecord } from "@/app/api/index";
import PageShell from "@/app/components/PageShell";

function stateLabel(state: Execution["state"] | null): string {
  if (!state) return "Not run yet";
  switch (state) {
    case "completed":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "stopped":
      return "Stopped";
    case "awaiting_heal_approval":
      return "Needs approval (heal)";
    case "awaiting_approval":
      return "Needs approval";
    default:
      return "Pending";
  }
}

export default function WorkflowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [ready, setReady] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainLoading, setExplainLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healSubmitting, setHealSubmitting] = useState<"approve" | "reject" | null>(null);
  const [stopping, setStopping] = useState(false);

  const refresh = async () => {
    try {
      const [wf, execs] = await Promise.all([
        apiClient.getWorkflow(workflowId),
        apiClient.listExecutions(workflowId).catch(() => []),
      ]);
      setWorkflow(wf);
      setExecutions(execs);
      setSelectedExecId((prev) => (execs.some((e) => e.id === prev) ? prev : execs[0]?.id ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this workflow.");
    }
  };

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
      await refresh();
      setReady(true);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, workflowId]);

  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, workflowId]);

  const handleStop = async () => {
    setStopping(true);
    try {
      await apiClient.stop(workflowId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop this workflow.");
    } finally {
      setStopping(false);
    }
  };

  const selectedExec = executions.find((e) => e.id === selectedExecId) || null;

  const logFor = (nodeId: string) =>
    selectedExec?.logs.find((l) => l.node_id === nodeId) || null;

  const handleHealDecision = async (approve: boolean) => {
    if (!selectedExec) return;
    setHealSubmitting(approve ? "approve" : "reject");
    try {
      await apiClient.healApproval(workflowId, selectedExec.id, { approve });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the heal decision.");
    } finally {
      setHealSubmitting(null);
    }
  };

  const handleExplain = async (nodeId: string) => {
    setExplainLoading(nodeId);
    try {
      const res = await apiClient.explain(workflowId, nodeId);
      setExplanations((prev) => ({ ...prev, [nodeId]: res.explanation }));
    } catch (err) {
      setExplanations((prev) => ({
        ...prev,
        [nodeId]: err instanceof Error ? err.message : "Could not fetch explanation.",
      }));
    } finally {
      setExplainLoading(null);
    }
  };

  return (
    <PageShell
      eyebrow="Workflow"
      title={workflow?.spec.name || "Workflow"}
      dek={workflow?.spec.description}
      loading={!ready}
    >
      <section className="wd_main">
        {error || !workflow ? (
          <p className="ts-13px wd_error">{error || "Workflow not found."}</p>
        ) : (
          <>
            <Link href="/workflows" className="wd_back">
              <span className="ts-12px color-white-50 mono all-caps">&larr; Workflows</span>
            </Link>

            {executions.length > 0 && (
              <div className="wd_exec-picker">
                <span className="ts-11px color-white-50 mono all-caps">Viewing run</span>
                <select
                  className="wd_exec-select ts-12px mono"
                  value={selectedExecId || ""}
                  onChange={(e) => setSelectedExecId(e.target.value)}
                >
                  {executions.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.created_at ? new Date(ex.created_at).toLocaleString() : ex.id} —{" "}
                      {stateLabel(ex.state)} {ex.dry_run ? "(dry run)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="wd_trigger">
              <div className="wd_trigger-top">
                <div>
                  <span className="ts-11px color-white-50 mono all-caps">Trigger</span>
                  <p className="ts-14px color-white">{workflow.spec.trigger.type}</p>
                </div>
                {workflow.active && (
                  <button
                    type="button"
                    className="wd_stop-btn"
                    onClick={handleStop}
                    disabled={stopping}
                  >
                    <span className="ts-11px mono all-caps">
                      {stopping ? "Stopping..." : "Stop workflow"}
                    </span>
                  </button>
                )}
              </div>
              {workflow.spec.trigger.reasoning && (
                <p className="ts-13px color-white-50 wd_reasoning">
                  {workflow.spec.trigger.reasoning}
                </p>
              )}
            </div>

            {selectedExec?.state === "awaiting_heal_approval" && selectedExec.pending_heal && (
              <div className="wd_heal">
                <span className="ts-11px mono all-caps wd_heal-label">Self-healing agent proposes a fix</span>
                <p className="ts-13px color-white-50 wd_heal-error">
                  <strong className="color-white">{selectedExec.pending_heal.node_id}</strong> failed:{" "}
                  {selectedExec.pending_heal.error}
                </p>
                <p className="ts-14px color-white wd_heal-diff">
                  {selectedExec.pending_heal.diff_explanation}
                </p>
                {selectedExec.pending_heal.reasoning && (
                  <p className="ts-13px color-white-50 wd_reasoning">
                    {selectedExec.pending_heal.reasoning}
                  </p>
                )}
                <pre className="ts-12px mono wd_heal-patch">
                  {JSON.stringify(selectedExec.pending_heal.patch, null, 2)}
                </pre>
                <div className="wd_heal-actions">
                  <button
                    type="button"
                    className="wd_heal-reject"
                    onClick={() => handleHealDecision(false)}
                    disabled={healSubmitting !== null}
                  >
                    <span className="ts-12px mono all-caps">
                      {healSubmitting === "reject" ? "Rejecting..." : "Reject"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="cta-button is--blue"
                    onClick={() => handleHealDecision(true)}
                    disabled={healSubmitting !== null}
                  >
                    {healSubmitting === "approve" ? "Applying..." : "Approve & retry"}
                  </button>
                </div>
              </div>
            )}

            <div className="wd_steps">
              {workflow.spec.nodes.map((node, i) => {
                const log = logFor(node.id);
                return (
                  <div key={node.id} className="wd_step">
                    <div className="wd_step-top">
                      <div className="wd_step-heading">
                        <span className="ts-11px mono wd_step-index">{String(i + 1).padStart(2, "0")}</span>
                        <span className="ts-14px color-white wd_step-name">
                          {node.connector || node.type}
                        </span>
                      </div>
                      {log && (
                        <span className={`ts-11px mono all-caps wd_step-status wd_step-status--${log.status}`}>
                          {log.status}
                        </span>
                      )}
                    </div>

                    {node.reasoning && (
                      <p className="ts-13px color-white-50 wd_reasoning">{node.reasoning}</p>
                    )}

                    {log && (
                      <div className="wd_log">
                        {log.output != null && (
                          <div className="wd_log-row">
                            <span className="ts-11px color-white-50 mono all-caps">Result</span>
                            <pre className="ts-12px mono wd_log-pre">
                              {JSON.stringify(log.output, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.error && (
                          <div className="wd_log-row">
                            <span className="ts-11px mono all-caps wd_log-error-label">Error</span>
                            <p className="ts-12px mono wd_log-error">{log.error}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className="wd_explain-btn"
                      onClick={() => handleExplain(node.id)}
                      disabled={explainLoading === node.id}
                    >
                      <span className="ts-11px color-white-50 mono all-caps">
                        {explainLoading === node.id
                          ? "Thinking..."
                          : explanations[node.id]
                          ? "Refresh explanation"
                          : "Why this step?"}
                      </span>
                    </button>

                    {explanations[node.id] && (
                      <p className="ts-13px color-white wd_explanation">{explanations[node.id]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <style>{`
        .wd_main {
          max-width: 56em;
          margin: 0 auto;
        }

        .wd_error {
          color: var(--orange);
        }

        .wd_back {
          display: inline-block;
          text-decoration: none;
          margin-bottom: 1.5em;
        }

        .wd_back:hover span {
          color: var(--color--white) !important;
        }

        .wd_exec-picker {
          display: flex;
          align-items: center;
          gap: 0.75em;
          margin: 2em 0;
        }

        .wd_exec-select {
          background-color: var(--color--grey-900);
          color: var(--color--white);
          border: 1px solid var(--color--grey-700);
          padding: 0.5em 0.75em;
        }

        .wd_trigger {
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.25em 1.5em;
          margin-bottom: 2em;
        }

        .wd_trigger p:first-of-type {
          margin: 0.5em 0 0;
        }

        .wd_trigger-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1em;
        }

        .wd_stop-btn {
          border: 1px solid var(--orange);
          background-color: transparent;
          color: var(--orange);
          padding: 0.625em 1em;
          cursor: pointer;
          transition: background-color 0.15s, color 0.15s;
          white-space: nowrap;
        }

        .wd_stop-btn:hover {
          background-color: var(--orange);
          color: var(--color--black);
        }

        .wd_reasoning {
          margin: 0.5em 0 0;
        }

        .wd_heal {
          border: 1px solid var(--color--primary-blue);
          background-color: var(--color--grey-900);
          padding: 1.5em 1.75em;
          margin-bottom: 2em;
        }

        .wd_heal-label {
          color: var(--color--primary-blue);
        }

        .wd_heal-error {
          margin: 0.75em 0 0;
        }

        .wd_heal-diff {
          margin: 0.75em 0 0;
        }

        .wd_heal-patch {
          margin: 1em 0 0;
          padding: 0.875em 1em;
          background-color: var(--color--black);
          border: 1px solid var(--color--grey-800);
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--color--grey-300);
        }

        .wd_heal-actions {
          display: flex;
          align-items: center;
          gap: 1em;
          margin-top: 1.25em;
        }

        .wd_heal-reject {
          border: 1px solid var(--color--grey-700);
          background-color: transparent;
          color: var(--color--grey-300);
          padding: 1em 1.875em;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .wd_heal-reject:hover {
          border-color: var(--orange);
          color: var(--orange);
        }

        .wd_steps {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background-color: var(--color--grey-800);
          border: 1px solid var(--color--grey-800);
        }

        .wd_step {
          background-color: var(--color--black);
          padding: 1.5em 1.75em;
        }

        .wd_step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5em;
        }

        .wd_step-heading {
          display: flex;
          align-items: center;
          gap: 0.75em;
        }

        .wd_step-index {
          color: var(--color--grey-600);
        }

        .wd_step-name {
          text-transform: uppercase;
        }

        .wd_step-status {
          color: var(--color--grey-300);
        }

        .wd_step-status--succeeded {
          color: var(--color--white);
        }

        .wd_step-status--failed {
          color: var(--orange);
        }

        .wd_step-status--running,
        .wd_step-status--healing,
        .wd_step-status--awaiting_approval {
          color: var(--color--primary-blue);
        }

        .wd_log {
          margin-top: 1em;
          border-top: 1px solid var(--color--grey-800);
          padding-top: 1em;
        }

        .wd_log-row {
          margin-bottom: 0.75em;
        }

        .wd_log-row:last-child {
          margin-bottom: 0;
        }

        .wd_log-pre {
          margin: 0.375em 0 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--color--grey-300);
        }

        .wd_log-error-label {
          color: var(--orange);
        }

        .wd_log-error {
          margin: 0.375em 0 0;
          color: var(--orange);
        }

        .wd_explain-btn {
          margin-top: 1em;
          border: 1px solid var(--color--grey-700);
          background-color: transparent;
          padding: 0.5em 0.875em;
          cursor: pointer;
          transition: border-color 0.15s;
        }

        .wd_explain-btn:hover {
          border-color: var(--color--primary-blue);
        }

        .wd_explanation {
          margin: 1em 0 0;
          padding-top: 1em;
          border-top: 1px solid var(--color--grey-800);
        }
      `}</style>
    </PageShell>
  );
}
