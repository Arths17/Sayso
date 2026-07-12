import type { ExecutionLog, NodeStatus } from "@/lib/types";

export const STATUS_COLORS: Record<NodeStatus, string> = {
  pending: "#4b515b",
  running: "#298dff",
  succeeded: "#219653",
  failed: "#ef4444",
  skipped: "#343940",
  awaiting_approval: "#ff6c3d",
  healing: "#a855f7",
};

export function statusColor(status: NodeStatus | undefined): string {
  return status ? STATUS_COLORS[status] : STATUS_COLORS.pending;
}

export function logsByNode(logs: ExecutionLog[]): Record<string, NodeStatus> {
  const map: Record<string, NodeStatus> = {};
  for (const log of logs) map[log.node_id] = log.status;
  return map;
}
