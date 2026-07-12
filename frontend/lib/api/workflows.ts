import { api } from "@/lib/api/client";
import type {
  EditResponse,
  Execution,
  GenerateResponse,
  RunResponse,
  WorkflowRecord,
  WorkflowVersion,
} from "@/lib/types";

export function listWorkflows() {
  return api.get<WorkflowRecord[]>("/workflows");
}

export function getWorkflow(id: string) {
  return api.get<WorkflowRecord>(`/workflows/${id}`);
}

export function generateWorkflow(prompt: string) {
  return api.post<GenerateResponse>("/workflows/generate", { prompt });
}

export function clarifyWorkflow(id: string, answers: Record<string, string>) {
  return api.post<GenerateResponse>(`/workflows/${id}/clarify`, { answers });
}

export function editWorkflow(id: string, instruction: string) {
  return api.post<EditResponse>(`/workflows/${id}/edit`, { instruction });
}

export function dryRunWorkflow(id: string) {
  return api.post<RunResponse>(`/workflows/${id}/dry-run`);
}

export function runWorkflow(id: string) {
  return api.post<RunResponse>(`/workflows/${id}/run`);
}

export function getExecutionStatus(id: string, executionId?: string) {
  const qs = executionId ? `?execution_id=${encodeURIComponent(executionId)}` : "";
  return api.get<Execution>(`/workflows/${id}/status${qs}`);
}

export function approveHeal(id: string, executionId: string, approve: boolean) {
  return api.post<{ applied: boolean; state: string; execution_id?: string }>(
    `/workflows/${id}/executions/${executionId}/heal`,
    { approve },
  );
}

export function approveNode(id: string, executionId: string, approve: boolean) {
  return api.post<{ approved: boolean; state: string; execution_id: string }>(
    `/workflows/${id}/executions/${executionId}/approve`,
    { approve },
  );
}

export function listVersions(id: string) {
  return api.get<WorkflowVersion[]>(`/workflows/${id}/versions`);
}

export function revertWorkflow(id: string, versionId: string) {
  return api.post<{ reverted_to: string; new_version: string }>(
    `/workflows/${id}/revert/${versionId}`,
  );
}

export function explainNode(id: string, nodeId: string) {
  return api.get<{ node_id: string; explanation: string }>(
    `/workflows/${id}/nodes/${nodeId}/explain`,
  );
}
