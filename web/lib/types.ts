export type NodeType = "connector" | "conditional" | "for_each" | "human_approval";

export interface RetryPolicy {
  max_attempts: number;
  backoff_seconds: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  connector: string | null;
  config: Record<string, unknown>;
  depends_on: string[];
  retry_policy: RetryPolicy;
  condition: string | null;
  true_branch: string[];
  false_branch: string[];
  iterate_over: string | null;
  loop_body: string[];
  reasoning: string | null;
}

export interface Trigger {
  type: string;
  config: Record<string, unknown>;
  reasoning: string | null;
}

export interface WorkflowSpec {
  name: string;
  description: string;
  trigger: Trigger;
  variables: Record<string, unknown>;
  nodes: WorkflowNode[];
  reasoning: string | null;
}

export interface WorkflowRecord {
  id: string;
  prompt: string;
  spec: WorkflowSpec;
  current_version_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner_uid: string;
}

export type NodeStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "awaiting_approval"
  | "healing";

export interface ExecutionLog {
  node_id: string;
  status: NodeStatus;
  start_time: string | null;
  end_time: string | null;
  input: unknown;
  output: unknown;
  error: string | null;
  reasoning: string | null;
  attempt: number;
}

export type ExecutionState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "awaiting_heal_approval"
  | "awaiting_approval";

export interface HealPatch {
  node_id: string;
  error: string;
  patch: Record<string, unknown>;
  diff_explanation: string;
  reasoning: string | null;
}

export interface Execution {
  id: string;
  workflow_id: string;
  state: ExecutionState;
  dry_run: boolean;
  logs: ExecutionLog[];
  created_at: string | null;
  updated_at: string | null;
  pending_heal: HealPatch | null;
  pending_approval_node_id: string | null;
}

export interface RunResponse {
  execution_id: string;
  state: ExecutionState;
}
