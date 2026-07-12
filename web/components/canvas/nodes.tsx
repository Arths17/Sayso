"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, Repeat, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { connectorMeta } from "@/lib/connectors";
import { connectorIcon } from "@/lib/icons";
import { statusColor } from "@/lib/graph/statusColor";
import type { FlowNodeData } from "@/lib/graph/specToFlow";
import styles from "./canvas.module.css";

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
    <div className={styles.nodeShell} style={{ borderLeftColor: accent }}>
      <div className={styles.nodeHeader}>
        <Icon size={14} className={styles.nodeIcon} color={accent} />
        <span className={styles.nodeTitle}>{title}</span>
        <span className={styles.nodeDot} style={{ background: statusColor(status) }} />
      </div>
      {subtitle && <div className={styles.nodeSub}>{subtitle}</div>}
      {loopOf && <div className={styles.loopBadge}>in loop: {loopOf}</div>}
    </div>
  );
}

export function TriggerNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={styles.triggerNode}>
      <div className={styles.triggerLabel}>
        <Zap size={13} />
        Trigger
      </div>
      <div className={styles.triggerSub}>{d.label}</div>
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
        accent="#298dff"
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
        accent="#ff6c3d"
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
      <div className={styles.approvalShell}>
        <div className={styles.nodeHeader}>
          <ShieldCheck size={14} color="#ff6c3d" />
          <span className={styles.nodeTitle}>Human approval</span>
          <span className={styles.nodeDot} style={{ background: statusColor(d.status) }} />
        </div>
        <div className={styles.approvalPrompt}>{prompt}</div>
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
