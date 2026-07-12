import dagre from "@dagrejs/dagre";
import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react";
import type { NodeStatus, WorkflowNode, WorkflowSpec } from "@/lib/types";

export const TRIGGER_ID = "__trigger__";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  node?: WorkflowNode;
  trigger?: WorkflowSpec["trigger"];
  status?: NodeStatus;
  loopOf?: string;
}

export type FlowNode = RFNode<FlowNodeData>;
export type FlowEdge = RFEdge;

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;

function nodeKind(node: WorkflowNode): string {
  switch (node.type) {
    case "conditional":
      return "conditionalNode";
    case "for_each":
      return "forEachNode";
    case "human_approval":
      return "approvalNode";
    default:
      return "connectorNode";
  }
}

/**
 * Mirrors app/compiler/graph_builder.py's compile_spec: depends_on edges are
 * plain DAG edges, except a for_each node's own depends_on entries that also
 * appear in its loop_body (the back-edge into the loop isn't a DAG edge there,
 * so it isn't drawn here either).
 */
export function specToFlow(
  spec: WorkflowSpec,
  statusByNode?: Record<string, NodeStatus>,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const loopMembership = new Map<string, string>();
  for (const n of spec.nodes) {
    if (n.type === "for_each") {
      for (const bodyId of n.loop_body) loopMembership.set(bodyId, n.id);
    }
  }

  const nodes: FlowNode[] = [
    {
      id: TRIGGER_ID,
      type: "triggerNode",
      position: { x: 0, y: 0 },
      data: { label: spec.trigger.type },
    },
    ...spec.nodes.map((n) => ({
      id: n.id,
      type: nodeKind(n),
      position: { x: 0, y: 0 },
      data: {
        label: n.connector ?? n.id,
        node: n,
        status: statusByNode?.[n.id],
        loopOf: loopMembership.get(n.id),
      } satisfies FlowNodeData,
    })),
  ];

  const edges: FlowEdge[] = [];
  const coveredByConditional = new Set<string>();
  const coveredByLoop = new Set<string>();

  for (const n of spec.nodes) {
    if (n.type === "conditional") {
      for (const t of n.true_branch) {
        edges.push({
          id: `${n.id}-true-${t}`,
          source: n.id,
          target: t,
          label: "Yes",
          style: { stroke: "#219653" },
          labelStyle: { fill: "#219653", fontWeight: 600 },
        });
        coveredByConditional.add(`${n.id}->${t}`);
      }
      for (const t of n.false_branch) {
        edges.push({
          id: `${n.id}-false-${t}`,
          source: n.id,
          target: t,
          label: "No",
          style: { stroke: "#ef4444" },
          labelStyle: { fill: "#ef4444", fontWeight: 600 },
        });
        coveredByConditional.add(`${n.id}->${t}`);
      }
    }
    if (n.type === "for_each") {
      for (const bodyId of n.loop_body) {
        edges.push({
          id: `${n.id}-loop-${bodyId}`,
          source: n.id,
          target: bodyId,
          style: { strokeDasharray: "4 4", stroke: "#ff6c3d" },
          label: "iterates",
          labelStyle: { fill: "#ff6c3d", fontSize: 10 },
        });
        coveredByLoop.add(`${n.id}->${bodyId}`);
      }
    }
  }

  for (const n of spec.nodes) {
    if (n.depends_on.length === 0) {
      edges.push({ id: `${TRIGGER_ID}-${n.id}`, source: TRIGGER_ID, target: n.id });
      continue;
    }
    for (const dep of n.depends_on) {
      if (n.type === "for_each" && n.loop_body.includes(dep)) continue;
      if (coveredByConditional.has(`${dep}->${n.id}`)) continue;
      if (coveredByLoop.has(`${dep}->${n.id}`)) continue;
      edges.push({ id: `${dep}-${n.id}`, source: dep, target: n.id });
    }
  }

  return { nodes: layout(nodes, edges), edges };
}

function layout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 90 });

  for (const node of nodes) g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const edge of edges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
  });
}
