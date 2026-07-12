import type { NodeStatus } from "@/lib/types";

export const STATUS_CLASSES: Record<NodeStatus, string> = {
  pending: "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
  running: "border-blue-500 bg-blue-50 animate-pulse dark:bg-blue-950",
  succeeded: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
  failed: "border-red-500 bg-red-50 dark:bg-red-950",
  skipped: "border-zinc-200 bg-zinc-50 opacity-60 dark:bg-zinc-900",
  awaiting_approval: "border-amber-500 bg-amber-50 dark:bg-amber-950",
  healing: "border-purple-500 bg-purple-50 animate-pulse dark:bg-purple-950",
};

export function statusClass(status: NodeStatus | undefined): string {
  return status ? STATUS_CLASSES[status] : STATUS_CLASSES.pending;
}

export function statusDotClass(status: NodeStatus | undefined): string {
  switch (status) {
    case "running":
      return "bg-blue-500";
    case "succeeded":
      return "bg-emerald-500";
    case "failed":
      return "bg-red-500";
    case "awaiting_approval":
      return "bg-amber-500";
    case "healing":
      return "bg-purple-500";
    case "skipped":
      return "bg-zinc-300";
    default:
      return "bg-zinc-300";
  }
}

export function logsByNode(logs: { node_id: string; status: NodeStatus }[]): Record<string, NodeStatus> {
  const map: Record<string, NodeStatus> = {};
  for (const log of logs) map[log.node_id] = log.status;
  return map;
}
