"""Workflow compiler — validated WorkflowSpec -> executable DAG.

Conditional branches and for_each loops are first-class node types. The DAG is
a networkx.DiGraph of node ids; each node carries its compiled config. Control
edges (branch/loop) are stored separately so the executor can honour them
without treating them as ordering dependencies.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import networkx as nx

from app.schemas import Node, NodeType, WorkflowSpec


@dataclass
class CompiledGraph:
    spec: WorkflowSpec
    dag: nx.DiGraph
    nodes: dict[str, Node]
    # node_id -> {"true": [...], "false": [...]} for conditionals
    branches: dict[str, dict[str, list[str]]] = field(default_factory=dict)
    # for_each node_id -> body node ids
    loops: dict[str, list[str]] = field(default_factory=dict)

    def execution_order(self) -> list[str]:
        return list(nx.topological_sort(self.dag))

    def roots(self) -> list[str]:
        return [n for n in self.dag.nodes if self.dag.in_degree(n) == 0]


def compile_spec(spec: WorkflowSpec) -> CompiledGraph:
    nodes = {n.id: n for n in spec.nodes}
    dag = nx.DiGraph()
    dag.add_nodes_from(nodes)

    branches: dict[str, dict[str, list[str]]] = {}
    loops: dict[str, list[str]] = {}

    for node in spec.nodes:
        for dep in node.depends_on:
            # loop-body back-references are control edges, not DAG edges
            if node.type == NodeType.for_each and dep in node.loop_body:
                continue
            dag.add_edge(dep, node.id)
        if node.type == NodeType.conditional:
            branches[node.id] = {"true": node.true_branch, "false": node.false_branch}
        if node.type == NodeType.for_each:
            loops[node.id] = node.loop_body

    return CompiledGraph(spec=spec, dag=dag, nodes=nodes, branches=branches, loops=loops)
