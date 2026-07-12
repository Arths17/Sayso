export interface WorkflowNode {
  id: string;
  type: "connector" | "conditional" | "for_each" | "human_approval";
  connector: string | null;
}

export interface WorkflowSpec {
  name: string;
  description: string;
  nodes: WorkflowNode[];
}

export interface WorkflowRecord {
  id: string;
  prompt: string;
  spec: WorkflowSpec;
  created_at: string | null;
  updated_at: string | null;
  owner_uid: string;
}

export type ExecutionState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "awaiting_heal_approval"
  | "awaiting_approval";

export interface Execution {
  id: string;
  workflow_id: string;
  state: ExecutionState;
  dry_run: boolean;
  created_at: string | null;
  updated_at: string | null;
}
