// API Client for Sayso Backend
// This client connects to all API routes defined in app/main.py

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Types matching app/schemas.py
export type NodeType = "connector" | "conditional" | "for_each" | "human_approval";

export interface RetryPolicy {
  max_attempts: number;
  backoff_seconds: number;
}

export interface Node {
  id: string;
  type: NodeType;
  connector: string | null;
  config: Record<string, unknown>;
  depends_on: string[];
  retry_policy: RetryPolicy;
  condition?: string;
  true_branch?: string[];
  false_branch?: string[];
  iterate_over?: string;
  loop_body?: string[];
  reasoning?: string;
}

export interface Trigger {
  type: string;
  config: Record<string, unknown>;
  reasoning?: string;
}

export interface WorkflowSpec {
  name: string;
  description: string;
  trigger: Trigger;
  variables: Record<string, unknown>;
  nodes: Node[];
  reasoning?: string;
}

export type NodeStatus = "pending" | "running" | "succeeded" | "failed" | "skipped" | "awaiting_approval" | "healing";

export type ExecutionState = "pending" | "running" | "completed" | "failed" | "awaiting_heal_approval" | "awaiting_approval";

export interface ExecutionLog {
  node_id: string;
  status: NodeStatus;
  start_time?: string;
  end_time?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  reasoning?: string;
  attempt: number;
}

export interface HealPatch {
  node_id: string;
  error: string;
  patch: Record<string, unknown>;
  diff_explanation: string;
  reasoning?: string;
}

export interface Execution {
  id: string;
  workflow_id: string;
  version_id?: string;
  state: ExecutionState;
  dry_run: boolean;
  logs: ExecutionLog[];
  context: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  pending_heal?: HealPatch | null;
  pending_approval_node_id?: string | null;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  spec: WorkflowSpec;
  diff: Record<string, unknown>;
  message: string;
  created_at?: string;
}

export interface WorkflowRecord {
  id: string;
  prompt: string;
  spec: WorkflowSpec;
  current_version_id?: string;
  created_at?: string;
  updated_at?: string;
  clarification_answers: Record<string, string>;
  owner_uid: string;
}

export interface ClarificationRequest {
  status: "ok" | "needs_clarification";
  questions: string[];
  reasoning?: string;
}

export interface ValidationResult {
  passed: boolean;
  errors: { node_id: string | null; reason: string }[];
}

// Request/Response types
export interface GenerateRequest {
  prompt: string;
}

export interface GenerateResponse {
  workflow_id: string;
  status: "validated" | "needs_clarification" | "invalid";
  spec?: WorkflowSpec;
  clarification?: ClarificationRequest;
  validation?: ValidationResult;
}

export interface ClarifyRequest {
  answers: Record<string, string>;
}

export interface EditRequest {
  instruction: string;
}

export interface RunResponse {
  execution_id: string;
  state: ExecutionState;
}

export interface HealApprovalRequest {
  approve: boolean;
}

export interface ApprovalRequest {
  approve: boolean;
}

// API Client class
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

   private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
     const headers: Record<string, string> = {
       "Content-Type": "application/json",
       ...(options.headers as Record<string, string> || {}),
     };

     if (this.token) {
       headers["Authorization"] = `Bearer ${this.token}`;
     }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async health(): Promise<{ status: string; service: string; connectors: string[] }> {
    return this.request("/health");
  }

  // OAuth routes
  async googleOAuthStart(): Promise<{ auth_url: string }> {
    return this.request("/oauth/google/start");
  }

  async googleOAuthStatus(): Promise<{ connected: boolean }> {
    return this.request("/oauth/google/status");
  }

  // Workflow routes
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    return this.request("/workflows/generate", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async clarify(workflowId: string, req: ClarifyRequest): Promise<GenerateResponse> {
    return this.request(`/workflows/${workflowId}/clarify`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async edit(workflowId: string, req: EditRequest): Promise<{ workflow_id: string; version: string; diff: Record<string, unknown>; spec: WorkflowSpec }> {
    return this.request(`/workflows/${workflowId}/edit`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    return this.request("/workflows");
  }

  async getWorkflow(workflowId: string): Promise<WorkflowRecord> {
    return this.request(`/workflows/${workflowId}`);
  }

  async dryRun(workflowId: string): Promise<RunResponse> {
    return this.request(`/workflows/${workflowId}/dry-run`, {
      method: "POST",
    });
  }

  async run(workflowId: string): Promise<RunResponse> {
    return this.request(`/workflows/${workflowId}/run`, {
      method: "POST",
    });
  }

  async listExecutions(workflowId: string): Promise<Execution[]> {
    return this.request(`/workflows/${workflowId}/executions`);
  }

  async getStatus(workflowId: string, executionId?: string): Promise<Execution> {
    const query = executionId ? `?execution_id=${executionId}` : "";
    return this.request(`/workflows/${workflowId}/status${query}`);
  }

  async healApproval(workflowId: string, executionId: string, req: HealApprovalRequest): Promise<{ applied: boolean; state: ExecutionState; execution_id: string }> {
    return this.request(`/workflows/${workflowId}/executions/${executionId}/heal`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async approve(workflowId: string, executionId: string, req: ApprovalRequest): Promise<{ approved: boolean; state: ExecutionState; execution_id: string }> {
    return this.request(`/workflows/${workflowId}/executions/${executionId}/approve`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async listVersions(workflowId: string): Promise<WorkflowVersion[]> {
    return this.request(`/workflows/${workflowId}/versions`);
  }

  async revert(workflowId: string, versionId: string): Promise<{ reverted_to: string; new_version: string }> {
    return this.request(`/workflows/${workflowId}/revert/${versionId}`, {
      method: "POST",
    });
  }

  async explain(workflowId: string, nodeId: string): Promise<{ node_id: string; explanation: string }> {
    return this.request(`/workflows/${workflowId}/nodes/${nodeId}/explain`);
  }

  // WebSocket for streaming execution updates
  connectStream(workflowId: string, executionId: string, onMessage: (data: { state: ExecutionState; logs: ExecutionLog[] }) => void, onError?: (error: Error) => void): WebSocket {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/workflows/${workflowId}/stream?execution_id=${executionId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    ws.onerror = (error) => {
      if (onError) onError(new Error("WebSocket error"));
    };
    
    return ws;
  }
}

export const apiClient = new ApiClient();
export default ApiClient;