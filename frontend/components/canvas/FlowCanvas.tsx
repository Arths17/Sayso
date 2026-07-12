"use client";

import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { NodeStatus, WorkflowSpec } from "@/lib/types";
import { specToFlow, type FlowNodeData } from "@/lib/graph/specToFlow";
import { nodeTypes } from "@/components/canvas/nodes";
import { NodeInspector } from "@/components/canvas/NodeInspector";

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
    <div className="relative h-[70vh] w-full overflow-hidden rounded-md border-2 border-ink">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelected(node as Node<FlowNodeData>)}
        onPaneClick={() => setSelected(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable className="!bg-bg" />
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
