from __future__ import annotations

import re

import networkx as nx

from app.connectors import registry
from app.schemas import NodeType, ValidationError, ValidationResult, WorkflowSpec

_REF = re.compile(r"\{\{\s*([a-zA-Z_][\w]*)\.")


def _refs_in(obj) -> set[str]:
    found: set[str] = set()
    if isinstance(obj, str):
        found.update(_REF.findall(obj))
    elif isinstance(obj, dict):
        for v in obj.values():
            found |= _refs_in(v)
    elif isinstance(obj, list):
        for v in obj:
            found |= _refs_in(v)
    return found


_BUILTIN = {"trigger", "item", "approval_threshold"}


def validate(spec: WorkflowSpec) -> ValidationResult:
    errors: list[ValidationError] = []
    ids = set(spec.node_ids())
    if len(ids) != len(spec.nodes):
        errors.append(ValidationError(node_id=None, reason="duplicate node ids"))

    known_roots = ids | _BUILTIN | set(spec.variables.keys())

    for node in spec.nodes:
        if node.type == NodeType.connector:
            if not node.connector:
                errors.append(ValidationError(node_id=node.id, reason="connector node missing connector name"))
            elif not registry.has_connector(node.connector):
                errors.append(
                    ValidationError(node_id=node.id, reason=f"unknown connector '{node.connector}'")
                )

        for dep in node.depends_on:
            if dep not in ids:
                errors.append(ValidationError(node_id=node.id, reason=f"depends_on unknown node '{dep}'"))

        for tgt in [*node.true_branch, *node.false_branch, *node.loop_body]:
            if tgt not in ids:
                errors.append(ValidationError(node_id=node.id, reason=f"branch/loop target '{tgt}' does not exist"))

        if node.type == NodeType.conditional and not node.condition:
            errors.append(ValidationError(node_id=node.id, reason="conditional node missing condition"))
        if node.type == NodeType.for_each and not node.iterate_over:
            errors.append(ValidationError(node_id=node.id, reason="for_each node missing iterate_over"))

        for ref in _refs_in(node.config) | _refs_in(node.condition or "") | _refs_in(node.iterate_over or ""):
            if ref not in known_roots:
                errors.append(
                    ValidationError(node_id=node.id, reason=f"reference to unknown source '{ref}'")
                )

    loop_edges = set()
    for node in spec.nodes:
        if node.type == NodeType.for_each:
            for body in node.loop_body:
                loop_edges.add((node.id, body))
                loop_edges.add((body, node.id))

    g = nx.DiGraph()
    g.add_nodes_from(ids)
    for node in spec.nodes:
        for dep in node.depends_on:
            if (dep, node.id) not in loop_edges:
                g.add_edge(dep, node.id)
    try:
        cycle = nx.find_cycle(g)
        errors.append(
            ValidationError(node_id=None, reason=f"illegal cycle: {[e[0] for e in cycle]}")
        )
    except nx.NetworkXNoCycle:
        pass

    return ValidationResult(passed=not errors, errors=errors)