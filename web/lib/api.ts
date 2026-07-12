import type { Execution, WorkflowRecord } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { "content-type": "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function listWorkflows(): Promise<WorkflowRecord[]> {
  return request<WorkflowRecord[]>("/workflows");
}

export async function latestExecution(workflowId: string): Promise<Execution | null> {
  try {
    return await request<Execution>(`/workflows/${workflowId}/status`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
