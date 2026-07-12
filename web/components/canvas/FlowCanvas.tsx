"use client";

import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { NodeStatus, WorkflowSpec } from "@/lib/types";
import { specToFlow, type FlowNodeData } from "@/lib/graph/specToFlow";
import { nodeTypes } from "./nodes";
import { NodeInspector } from "./NodeInspector";
import styles from "./canvas.module.css";

export function FlowCanvas({
  workflowId,
  spec,
  statusByNode,
}: {
  workflowId: string;
  spec: WorkflowSpec;
  statusByNode?: Record<string, NodeStatus>;
}) {
  const { nodes, edges } = useMemo(() => specToFlow(spec, statusByNode), [spec, statusByNode]);
  const [selected, setSelected] = useState<Node<FlowNodeData> | null>(null);

  return (
    <div className={styles.shell}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelected(node as Node<FlowNodeData>)}
        onPaneClick={() => setSelected(null)}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222529" />
        <Controls />
      </ReactFlow>
      {selected && selected.data.node && (
        <NodeInspector
          workflowId={workflowId}
          node={selected.data.node}
          status={selected.data.status}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
