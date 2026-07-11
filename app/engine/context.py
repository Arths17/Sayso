"""Run-context resolution: {{ node.field }} templating + safe condition eval."""
from __future__ import annotations

import ast
import operator
import re
from typing import Any

_TEMPLATE = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


def _lookup(path: str, context: dict[str, Any]) -> Any:
    parts = path.strip().split(".")
    cur: Any = context
    for p in parts:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    return cur


def resolve(value: Any, context: dict[str, Any]) -> Any:
    """Recursively resolve {{...}} templates in strings/dicts/lists.
    A string that is exactly one template returns the raw referenced value
    (preserving numbers); otherwise references are stringified inline."""
    if isinstance(value, str):
        m = _TEMPLATE.fullmatch(value.strip())
        if m:
            return _lookup(m.group(1), context)
        return _TEMPLATE.sub(lambda mm: str(_lookup(mm.group(1), context)), value)
    if isinstance(value, dict):
        return {k: resolve(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve(v, context) for v in value]
    return value


_OPS = {
    ast.Gt: operator.gt,
    ast.Lt: operator.lt,
    ast.GtE: operator.ge,
    ast.LtE: operator.le,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.And: all,
    ast.Or: any,
}


def _eval_node(node: ast.AST) -> Any:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left)
        for op, comp in zip(node.ops, node.comparators):
            right = _eval_node(comp)
            if not _OPS[type(op)](left, right):
                return False
            left = right
        return True
    if isinstance(node, ast.BoolOp):
        vals = [_eval_node(v) for v in node.values]
        return _OPS[type(node.op)](vals)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
        return not _eval_node(node.operand)
    raise ValueError(f"unsupported expression element: {ast.dump(node)}")


def eval_condition(expr: str, context: dict[str, Any]) -> bool:
    """Resolve templates then safely evaluate a boolean comparison expression."""
    resolved = resolve(expr, context)
    if isinstance(resolved, bool):
        return resolved
    try:
        tree = ast.parse(str(resolved), mode="eval")
        return bool(_eval_node(tree))
    except Exception:
        # non-evaluable -> treat truthiness of the resolved value
        return bool(resolved) and str(resolved).lower() not in {"none", "false", "0", ""}
