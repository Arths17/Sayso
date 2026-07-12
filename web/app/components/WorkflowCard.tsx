"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/api/index";
import type { ExecutionState, WorkflowRecord } from "@/app/api/index";

function statusLabel(state: ExecutionState | null): string {
  if (!state) return "Not run yet";
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

export default function WorkflowCard({ record }: { record: WorkflowRecord }) {
  const router = useRouter();
  const [status, setStatus] = useState<ExecutionState | null>(null);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [running, setRunning] = useState<"live" | "dry" | null>(null);

  const refreshStatus = () => {
    apiClient
      .getStatus(record.id)
      .then((ex) => {
        setStatus(ex.state);
        const failedNode = ex.logs.find((l) => l.status === "failed" && l.error);
        setErrorSummary(failedNode ? `${failedNode.node_id}: ${failedNode.error}` : null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  const handleRun = async (dryRun: boolean) => {
    setRunning(dryRun ? "dry" : "live");
    try {
      const res = dryRun ? await apiClient.dryRun(record.id) : await apiClient.run(record.id);
      setStatus(res.state);
      refreshStatus();
    } catch {
      setStatus("failed");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div
      className="wf-card"
      onClick={() => router.push(`/workflows/${record.id}`)}
      role="button"
      tabIndex={0}
    >
      <div className="wf-card-top">
        <h3 className="ts-14px color-white wf-card-title">{record.spec.name}</h3>
        <span className={`ts-11px mono all-caps wf-card-status wf-card-status--${status ?? "none"}`}>
          {statusLabel(status)}
        </span>
      </div>
      <p className="ts-13px color-white-50 wf-card-desc">{record.spec.description}</p>
      {status === "failed" && errorSummary && (
        <p className="ts-11px wf-card-error" title={errorSummary}>
          {errorSummary}
        </p>
      )}
      <div className="wf-card-bottom">
        <span className="ts-11px color-white-50 mono">{record.spec.nodes.length} steps</span>
        <div className="wf-card-actions">
          <button
            type="button"
            className="wf-card-dry-run"
            onClick={(e) => {
              e.stopPropagation();
              handleRun(true);
            }}
            disabled={running !== null}
          >
            {running === "dry" ? "Running..." : "Dry Run"}
          </button>
          <button
            type="button"
            className="cta-button is--blue wf-card-run"
            onClick={(e) => {
              e.stopPropagation();
              handleRun(false);
            }}
            disabled={running !== null}
          >
            {running === "live" ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      <style>{`
        .wf-card {
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.5em;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: border-color 0.15s;
        }

        .wf-card:hover {
          border-color: var(--color--primary-blue);
        }

        .wf-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75em;
          margin-bottom: 0.5em;
        }

        .wf-card-title {
          margin: 0;
        }

        .wf-card-status {
          white-space: nowrap;
          padding: 0.25em 0.5em;
          border: 1px solid var(--color--grey-700);
          color: var(--color--grey-300);
        }

        .wf-card-status--completed {
          border-color: var(--color--white);
          color: var(--color--white);
        }

        .wf-card-status--failed {
          border-color: var(--orange);
          color: var(--orange);
        }

        .wf-card-status--running {
          border-color: var(--color--primary-blue);
          color: var(--color--primary-blue);
        }

        .wf-card-desc {
          margin: 0 0 1em;
        }

        .wf-card-error {
          margin: 0 0 1em;
          color: var(--orange);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wf-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
        }

        .wf-card-actions {
          display: flex;
          align-items: center;
          gap: 0.75em;
        }

        .wf-card-run {
          border: none;
          cursor: pointer;
        }

        .wf-card-dry-run {
          border: 1px solid var(--color--grey-700);
          background-color: transparent;
          color: var(--color--grey-300);
          padding: 0.75em 1.25em;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .wf-card-dry-run:hover {
          border-color: var(--color--white);
          color: var(--color--white);
        }
      `}</style>
    </div>
  );
}
