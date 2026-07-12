import type { Execution, RunResponse, WorkflowRecord } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function listWorkflows(): Promise<WorkflowRecord[]> {
  return request<WorkflowRecord[]>("/workflows");
}

export function getWorkflow(workflowId: string): Promise<WorkflowRecord> {
  return request<WorkflowRecord>(`/workflows/${workflowId}`);
}

export async function latestExecution(workflowId: string): Promise<Execution | null> {
  try {
    return await request<Execution>(`/workflows/${workflowId}/status`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function getExecution(workflowId: string, executionId: string): Promise<Execution> {
  return request<Execution>(`/workflows/${workflowId}/status?execution_id=${encodeURIComponent(executionId)}`);
}

export function dryRunWorkflow(workflowId: string): Promise<RunResponse> {
  return request<RunResponse>(`/workflows/${workflowId}/dry-run`, { method: "POST" });
}

export function runWorkflow(workflowId: string): Promise<RunResponse> {
  return request<RunResponse>(`/workflows/${workflowId}/run`, { method: "POST" });
}

export function explainNode(workflowId: string, nodeId: string): Promise<{ node_id: string; explanation: string }> {
  return request(`/workflows/${workflowId}/nodes/${nodeId}/explain`);
}
