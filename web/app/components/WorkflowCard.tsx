"use client";

import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState<ExecutionState | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getStatus(record.id)
      .then((ex) => {
        if (!cancelled) setStatus(ex.state);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [record.id]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await apiClient.run(record.id);
      setStatus(res.state);
    } catch {
      setStatus("failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="wf-card">
      <div className="wf-card-top">
        <h3 className="ts-14px color-white wf-card-title">{record.spec.name}</h3>
        <span className={`ts-11px mono all-caps wf-card-status wf-card-status--${status ?? "none"}`}>
          {statusLabel(status)}
        </span>
      </div>
      <p className="ts-13px color-white-50 wf-card-desc">{record.spec.description}</p>
      <div className="wf-card-bottom">
        <span className="ts-11px color-white-50 mono">{record.spec.nodes.length} steps</span>
        <button
          type="button"
          className="cta-button is--blue wf-card-run"
          onClick={handleRun}
          disabled={running}
        >
          {running ? "Running..." : "Run"}
        </button>
      </div>

      <style>{`
        .wf-card {
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.5em;
          display: flex;
          flex-direction: column;
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
          margin: 0 0 1.5em;
          flex: 1;
        }

        .wf-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .wf-card-run {
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
