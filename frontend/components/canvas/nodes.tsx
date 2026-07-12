"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, Repeat, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { connectorMeta } from "@/lib/connectors";
import { connectorIcon } from "@/lib/icons";
import type { FlowNodeData } from "@/lib/graph/specToFlow";
import { statusClass, statusDotClass } from "@/lib/graph/statusColor";

function NodeShell({
  icon: Icon,
  title,
  subtitle,
  accent,
  status,
  loopOf,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: string;
  status?: FlowNodeData["status"];
  loopOf?: string;
}) {
  return (
    <div
      className={`w-[220px] rounded-md border-2 px-3 py-2 shadow-sm transition-colors ${statusClass(status)}`}
      style={{ borderLeftColor: accent, borderLeftWidth: 5 }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className="shrink-0" style={{ color: accent }} />
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`} />
      </div>
      {subtitle && <div className="font-mono-ui mt-1 truncate text-[11px] text-ink-muted">{subtitle}</div>}
      {loopOf && (
        <div className="mt-1.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
          in loop: {loopOf}
        </div>
      )}
    </div>
  );
}

export function TriggerNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className="w-[220px] rounded-full bg-ink px-4 py-3 text-center shadow-sm">
      <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-bg">
        <Zap size={13} />
        Trigger
      </div>
      <div className="font-mono-ui truncate text-[11px] text-bg opacity-60">{d.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function ConnectorNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const meta = connectorMeta(d.node?.connector);
  const Icon = connectorIcon(meta?.icon) ?? Zap;
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        icon={Icon}
        title={meta?.label ?? d.label}
        subtitle={d.node?.id}
        accent="var(--accent)"
        status={d.status}
        loopOf={d.loopOf}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function ConditionalNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        icon={GitBranch}
        title="Condition"
        subtitle={d.node?.condition ?? d.node?.id}
        accent="#ca8a04"
        status={d.status}
        loopOf={d.loopOf}
      />
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: "65%" }} />
    </div>
  );
}

export function ForEachNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        icon={Repeat}
        title="For each"
        subtitle={d.node?.iterate_over ?? d.node?.id}
        accent="#a855f7"
        status={d.status}
        loopOf={d.loopOf}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function ApprovalNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const prompt = (d.node?.config?.prompt as string | undefined) ?? "Approval required";
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <div
        className={`w-[220px] rounded-md border-2 border-dashed px-3 py-2 shadow-sm transition-colors ${statusClass(d.status)}`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="shrink-0 text-amber-600" />
          <div className="truncate text-sm font-semibold text-ink">Human approval</div>
          <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${statusDotClass(d.status)}`} />
        </div>
        <div className="mt-1 truncate text-xs text-ink-muted">{prompt}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const nodeTypes = {
  triggerNode: TriggerNode,
  connectorNode: ConnectorNode,
  conditionalNode: ConditionalNode,
  forEachNode: ForEachNode,
  approvalNode: ApprovalNode,
};
