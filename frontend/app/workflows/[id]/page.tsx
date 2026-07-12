"use client";

import { use, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { ClarifyModal } from "@/components/chat/ClarifyModal";
import { EditBar } from "@/components/chat/EditBar";
import { RunControls } from "@/components/run/RunControls";
import { StatusPoller } from "@/components/run/StatusPoller";
import { HealBanner } from "@/components/run/HealBanner";
import { ApprovalBanner } from "@/components/run/ApprovalBanner";
import { VersionHistory } from "@/components/versions/VersionHistory";
import { useExecutionStatus } from "@/lib/hooks/useExecutionStatus";
import { logsByNode } from "@/lib/graph/statusColor";
import { clarifyWorkflow, getWorkflow } from "@/lib/api/workflows";
import type { GenerateResponse, WorkflowRecord } from "@/lib/types";

function readStashedGenerateResponse(workflowId: string): GenerateResponse | null {
  if (typeof window === "undefined") return null;
  const stashed = sessionStorage.getItem(`sayso:gen:${workflowId}`);
  return stashed ? (JSON.parse(stashed) as GenerateResponse) : null;
}

function WorkflowBuilder({ workflowId }: { workflowId: string }) {
  const [record, setRecord] = useState<WorkflowRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [clarification, setClarification] = useState<string[] | null>(() => {
    const res = readStashedGenerateResponse(workflowId);
    return res?.status === "needs_clarification" && res.clarification
      ? res.clarification.questions
      : null;
  });
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [versionRefresh, setVersionRefresh] = useState(0);
  const [statusRefresh, setStatusRefresh] = useState(0);

  useEffect(() => {
    sessionStorage.removeItem(`sayso:gen:${workflowId}`);
  }, [workflowId]);

  useEffect(() => {
    getWorkflow(workflowId)
      .then(setRecord)
      .finally(() => setLoading(false));
  }, [workflowId]);

  const { execution } = useExecutionStatus(workflowId, executionId, statusRefresh);

  async function handleClarify(answers: Record<string, string>) {
    const res = await clarifyWorkflow(workflowId, answers);
    if (res.status === "needs_clarification" && res.clarification) {
      setClarification(res.clarification.questions);
    } else {
      setClarification(null);
      const fresh = await getWorkflow(workflowId);
      setRecord(fresh);
    }
  }

  if (loading) {
    return <div className="p-16 text-center text-sm text-ink-muted">Loading workflow…</div>;
  }
  if (!record) {
    return <div className="p-16 text-center text-sm text-red-600">Workflow not found.</div>;
  }

  const statusByNode = execution ? logsByNode(execution.logs) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-bold text-ink">{record.spec.name || record.id}</h1>
        <p className="mt-1 text-sm text-ink-muted">{record.prompt}</p>
      </div>

      <FlowCanvas workflowId={workflowId} spec={record.spec} statusByNode={statusByNode} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section>
            <h2 className="font-mono-ui mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Edit with natural language
            </h2>
            <EditBar
              workflowId={workflowId}
              onApplied={(res) => {
                setRecord((prev) => (prev ? { ...prev, spec: res.spec, current_version_id: res.version } : prev));
                setVersionRefresh((n) => n + 1);
              }}
            />
          </section>

          <section>
            <h2 className="font-mono-ui mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Run
            </h2>
            <RunControls workflowId={workflowId} onStarted={setExecutionId} />
            <div className="mt-3 space-y-3">
              {execution?.pending_heal && (
                <HealBanner
                  workflowId={workflowId}
                  executionId={execution.id}
                  patch={execution.pending_heal}
                  onResolved={() => setStatusRefresh((n) => n + 1)}
                />
              )}
              {execution?.pending_approval_node_id && (
                <ApprovalBanner
                  workflowId={workflowId}
                  executionId={execution.id}
                  nodeId={execution.pending_approval_node_id}
                  onResolved={() => setStatusRefresh((n) => n + 1)}
                />
              )}
              <StatusPoller execution={execution} />
            </div>
          </section>
        </div>

        <aside>
          <VersionHistory
            workflowId={workflowId}
            currentVersionId={record.current_version_id}
            refreshKey={versionRefresh}
            onReverted={async () => {
              const fresh = await getWorkflow(workflowId);
              setRecord(fresh);
              setVersionRefresh((n) => n + 1);
            }}
          />
        </aside>
      </div>

      {clarification && (
        <ClarifyModal
          questions={clarification}
          onSubmit={handleClarify}
          onCancel={() => setClarification(null)}
        />
      )}
    </main>
  );
}

export default function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <WorkflowBuilder workflowId={id} />
    </RequireAuth>
  );
}
