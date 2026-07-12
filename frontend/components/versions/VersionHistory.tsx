"use client";

import { useEffect, useState } from "react";
import { listVersions } from "@/lib/api/workflows";
import type { WorkflowVersion } from "@/lib/types";
import { RevertConfirm } from "@/components/versions/RevertConfirm";

export function VersionHistory({
  workflowId,
  currentVersionId,
  refreshKey,
  onReverted,
}: {
  workflowId: string;
  currentVersionId: string | null;
  refreshKey: number;
  onReverted: () => void;
}) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [pendingRevert, setPendingRevert] = useState<WorkflowVersion | null>(null);

  useEffect(() => {
    listVersions(workflowId).then(setVersions).catch(() => setVersions([]));
  }, [workflowId, refreshKey]);

  return (
    <div className="space-y-2">
      <h3 className="font-mono-ui text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Version history
      </h3>
      <ul className="space-y-1.5">
        {[...versions].reverse().map((v) => (
          <li
            key={v.id}
            className="font-mono-ui flex items-center justify-between rounded-md bg-ink/[0.035] px-2.5 py-1.5 text-xs dark:bg-white/[0.04]"
          >
            <div>
              <div className="font-semibold text-ink">
                {v.id} {v.id === currentVersionId && <span className="text-emerald-600">(current)</span>}
              </div>
              <div className="text-ink-muted">{v.message}</div>
            </div>
            {v.id !== currentVersionId && (
              <button
                onClick={() => setPendingRevert(v)}
                className="rounded border-2 border-ink px-2 py-1 text-ink transition-colors hover:bg-ink hover:text-bg"
              >
                Revert
              </button>
            )}
          </li>
        ))}
        {versions.length === 0 && <li className="text-xs text-ink-muted">No versions yet.</li>}
      </ul>
      {pendingRevert && (
        <RevertConfirm
          workflowId={workflowId}
          version={pendingRevert}
          onCancel={() => setPendingRevert(null)}
          onReverted={() => {
            setPendingRevert(null);
            onReverted();
          }}
        />
      )}
    </div>
  );
}
