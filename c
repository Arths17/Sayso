import pytest
import asyncio
from pydantic import BaseModel

from app.schemas import Node, NodeType, WorkflowSpec, RetryPolicy, Execution, ExecutionState, NodeStatus, HealPatch
from app.engine.context import resolve, eval_condition
from app.engine.executor import run_execution, _log, _completed_ids, _is_control_backedge
from app.connectors import registry
from app.connectors.base import Connector, ConnectorResult, MockConnector
from app.storage import repository, versions
from app.storage.firestore_client import InMemoryStore, get_store
from app.utils import now_iso, new_id
from app.compiler.graph_builder import compile_spec, CompiledGraph
from app.agents import healer, explainer, critic, validator, planner
from app.llm import stub, client


class TestSchemas:
    def test_node_creation(self):
        node = Node(id="test", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test"})
        assert node.id == "test"
        assert node.type == NodeType.connector
        assert node.connector == "SlackNotify"

    def test_node_defaults(self):
        node = Node(id="test")
        assert node.type == NodeType.connector
        assert node.connector is None
        assert node.config == {}
        assert node.depends_on == []
        assert node.retry_policy.max_attempts == 1

    def test_workflow_spec_node_ids(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="b", type=NodeType.conditional, condition="true"),
            ]
        )
        assert spec.node_ids() == ["a", "b"]

    def test_workflow_spec_get_node(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="b", type=NodeType.conditional, condition="true"),
            ]
        )
        assert spec.get_node("a").connector == "SlackNotify"
        assert spec.get_node("c") is None


class TestContext:
    def test_resolve_simple_template(self):
        context = {"value": "hello"}
        result = resolve("{{ value }}", context)
        assert result == "hello"

    def test_resolve_nested_template(self):
        context = {"user": {"name": "Alice"}}
        result = resolve("{{ user.name }}", context)
        assert result == "Alice"

    def test_resolve_dict(self):
        context = {"name": "Alice", "age": 30}
        result = resolve({"user": "{{ name }}", "years": "{{ age }}"}, context)
        assert result == {"user": "Alice", "years": 30}

    def test_resolve_list(self):
        context = {"item": "test"}
        result = resolve(["{{ item }}", "static"], context)
        assert result == ["test", "static"]

    def test_eval_condition_true(self):
        context = {"value": 10}
        assert eval_condition("{{ value }} > 5", context) is True

    def test_eval_condition_false(self):
        context = {"value": 10}
        assert eval_condition("{{ value }} > 20", context) is False

    def test_eval_condition_and(self):
        context = {"a": 10, "b": 20}
        assert eval_condition("{{ a }} > 5 and {{ b }} < 30", context) is True

    def test_eval_condition_or(self):
        context = {"a": 10}
        assert eval_condition("{{ a }} > 20 or {{ a }} == 10", context) is True


class TestGraphBuilder:
    def test_compile_spec_basic(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="b", type=NodeType.connector, connector="SlackNotify", depends_on=["a"]),
            ]
        )
        graph = compile_spec(spec)
        assert isinstance(graph, CompiledGraph)
        assert graph.spec == spec
        assert "a" in graph.nodes
        assert "b" in graph.nodes

    def test_compile_spec_execution_order(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="b", type=NodeType.connector, connector="SlackNotify", depends_on=["a"]),
                Node(id="c", type=NodeType.connector, connector="SlackNotify", depends_on=["b"]),
            ]
        )
        graph = compile_spec(spec)
        order = graph.execution_order()
        assert order.index("a") < order.index("b")
        assert order.index("b") < order.index("c")

    def test_compile_spec_roots(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="b", type=NodeType.connector, connector="SlackNotify", depends_on=["a"]),
                Node(id="c", type=NodeType.connector, connector="SlackNotify"),
            ]
        )
        graph = compile_spec(spec)
        roots = graph.roots()
        assert "a" in roots
        assert "c" in roots
        assert "b" not in roots

    def test_compile_spec_branches(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="cond", type=NodeType.conditional, condition="true", true_branch=["a"], false_branch=["b"]),
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="b", type=NodeType.connector, connector="SlackNotify"),
            ]
        )
        graph = compile_spec(spec)
        assert "cond" in graph.branches
        assert graph.branches["cond"]["true"] == ["a"]
        assert graph.branches["cond"]["false"] == ["b"]

    def test_compile_spec_loops(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="loop", type=NodeType.for_each, iterate_over="{{ items }}", loop_body=["item_node"]),
                Node(id="item_node", type=NodeType.connector, connector="SlackNotify"),
            ]
        )
        graph = compile_spec(spec)
        assert "loop" in graph.loops
        assert graph.loops["loop"] == ["item_node"]


class TestConnectors:
    def test_registry_has_connector(self):
        assert registry.has_connector("SlackNotify") is True
        assert registry.has_connector("NonExistent") is False

    def test_registry_available(self):
        available = registry.available()
        assert "SlackNotify" in available
        assert "GmailTrigger" in available
        assert len(available) > 0

    def test_registry_resolve(self):
        connector = registry.resolve("SlackNotify")
        assert connector.name == "SlackNotify"

    def test_registry_resolve_unknown_raises(self):
        with pytest.raises(KeyError):
            registry.resolve("NonExistent")

    def test_mock_connector(self):
        real = registry.resolve("SlackNotify")
        mock = MockConnector(real)
        result = mock.execute({"channel": "#test"}, {})
        assert result.status == "succeeded"


class TestConnectorsLibrary:
    def test_slack_notify_mock(self):
        from app.connectors.library import SlackNotify
        conn = SlackNotify()
        result = conn.mock({"channel": "#test", "text": "hello"}, {})
        assert result.status == "succeeded"
        assert result.output["ok"] is True

    def test_slack_notify_run_missing_channel(self):
        from app.connectors.library import SlackNotify
        conn = SlackNotify()
        with pytest.raises(Exception):
            conn.run({"channel": "", "text": "hello"}, {})

    def test_sheets_append_mock(self):
        from app.connectors.library import SheetsAppend
        conn = SheetsAppend()
        result = conn.mock({"spreadsheet_id": "test", "row": {"a": 1}}, {})
        assert result.status == "succeeded"
        assert result.output["appended"] is True

    def test_sheets_read_rows_mock(self):
        from app.connectors.library import SheetsReadRows
        conn = SheetsReadRows()
        result = conn.mock({"spreadsheet_id": "test"}, {})
        assert result.status == "succeeded"
        assert "rows" in result.output

    def test_pdf_extract_text_mock(self):
        from app.connectors.library import PDFExtractText
        conn = PDFExtractText()
        result = conn.mock({"source": "test.pdf"}, {})
        assert result.status == "succeeded"
        assert "text" in result.output

    def test_http_request_mock(self):
        from app.connectors.library import HTTPRequest
        conn = HTTPRequest()
        result = conn.mock({"url": "https://example.com"}, {})
        assert result.status == "succeeded"
        assert result.output["status_code"] == 200


class TestValidator:
    def test_validate_valid_spec(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test"}),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is True
        assert len(result.errors) == 0

    def test_validate_unknown_connector(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="bad", type=NodeType.connector, connector="NonExistent"),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("unknown connector" in e.reason for e in result.errors)

    def test_validate_missing_connector_name(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="bad", type=NodeType.connector, connector=None),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("missing connector name" in e.reason for e in result.errors)

    def test_validate_duplicate_node_ids(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
                Node(id="a", type=NodeType.connector, connector="SlackNotify"),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("duplicate node ids" in e.reason for e in result.errors)

    def test_validate_unknown_depends_on(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify", depends_on=["nonexistent"]),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("unknown node" in e.reason for e in result.errors)

    def test_validate_conditional_missing_condition(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="cond", type=NodeType.conditional),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("missing condition" in e.reason for e in result.errors)

    def test_validate_for_each_missing_iterate(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="loop", type=NodeType.for_each),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("missing iterate_over" in e.reason for e in result.errors)

    def test_validate_cycle_detection(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="a", type=NodeType.connector, connector="SlackNotify", depends_on=["b"]),
                Node(id="b", type=NodeType.connector, connector="SlackNotify", depends_on=["a"]),
            ]
        )
        result = validator.validate(spec)
        assert result.passed is False
        assert any("cycle" in e.reason for e in result.errors)


class TestHealer:
    def test_heal_returns_patch(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={}),
            ]
        )
        node = spec.nodes[0]
        patch = healer.heal(spec, node, "no channel specified")
        assert isinstance(patch, HealPatch)
        assert patch.node_id == "notify"
        assert "config" in patch.patch

    def test_apply_patch(self):
        node = Node(id="test", type=NodeType.connector, connector="SlackNotify", config={"text": "hello"})
        patch = HealPatch(
            node_id="test",
            error="test error",
            patch={"config": {"channel": "#general"}},
            diff_explanation="added channel",
        )
        healed = healer.apply_patch(node, patch)
        assert healed.config["channel"] == "#general"
        assert healed.config["text"] == "hello"


class TestExplainer:
    def test_explain_returns_string(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test"}, reasoning="Notify the team"),
            ]
        )
        node = spec.nodes[0]
        result = explainer.explain(spec, node)
        assert isinstance(result, str)
        assert len(result) > 0


class TestStub:
    def test_plan_invoice(self):
        result = stub.respond("planner", {"prompt": "process invoice emails"})
        assert "name" in result
        assert "nodes" in result

    def test_plan_generic(self):
        result = stub.respond("planner", {"prompt": "send slack message"})
        assert "name" in result
        assert "nodes" in result

    def test_critique_ok(self):
        result = stub.respond("critic", {"spec": {"nodes": [{"id": "a", "connector": "SlackNotify", "config": {"channel": "#test"}}]}})
        assert result["status"] == "ok"

    def test_critique_needs_clarification(self):
        result = stub.respond("critic", {"spec": {"nodes": [{"id": "a", "connector": "SlackNotify", "config": {"channel": ""}}]}})
        assert result["status"] == "needs_clarification"

    def test_heal(self):
        result = stub.respond("healer", {"node": {"id": "a", "connector": "SlackNotify", "config": {}}, "error": "no channel"})
        assert "node_id" in result
        assert "patch" in result

    def test_explain(self):
        result = stub.respond("explainer", {"node": {"id": "a", "reasoning": "test reason"}})
        assert "explanation" in result

    def test_extract_fields(self):
        result = stub.respond("llm_extract", {"schema": {"amount": "number", "vendor": "string"}})
        assert "fields" in result


class TestUtils:
    def test_now_iso(self):
        result = now_iso()
        assert isinstance(result, str)
        assert "T" in result

    def test_new_id(self):
        result = new_id("test_")
        assert result.startswith("test_")
        assert len(result) > 5

    def test_new_id_no_prefix(self):
        result = new_id()
        assert len(result) > 0


class TestStorageVersions:
    def test_compute_diff_added(self):
        old = {"a": 1}
        new = {"a": 1, "b": 2}
        diff = versions.compute_diff(old, new)
        assert "b" in diff["added"]

    def test_compute_diff_removed(self):
        old = {"a": 1, "b": 2}
        new = {"a": 1}
        diff = versions.compute_diff(old, new)
        assert "b" in diff["removed"]

    def test_compute_diff_changed(self):
        old = {"a": 1}
        new = {"a": 2}
        diff = versions.compute_diff(old, new)
        assert "a" in diff["changed"]

    def test_compute_diff_none_old(self):
        new = {"a": 1}
        diff = versions.compute_diff(None, new)
        assert "a" in diff["added"]
        assert diff["removed"] == {}


class TestInMemoryStore:
    def test_set_and_get_workflow(self):
        store = InMemoryStore()
        store.set_workflow("wf_1", {"id": "wf_1", "name": "test"})
        result = store.get_workflow("wf_1")
        assert result["name"] == "test"

    def test_list_workflows(self):
        store = InMemoryStore()
        store.set_workflow("wf_1", {"id": "wf_1", "name": "test1"})
        store.set_workflow("wf_2", {"id": "wf_2", "name": "test2"})
        result = store.list_workflows()
        assert len(result) == 2

    def test_set_and_get_execution(self):
        store = InMemoryStore()
        store.set_execution("wf_1", "ex_1", {"id": "ex_1", "state": "running"})
        result = store.get_execution("wf_1", "ex_1")
        assert result["state"] == "running"

    def test_list_executions(self):
        store = InMemoryStore()
        store.set_execution("wf_1", "ex_1", {"id": "ex_1", "state": "running"})
        store.set_execution("wf_1", "ex_2", {"id": "ex_2", "state": "completed"})
        result = store.list_executions("wf_1")
        assert len(result) == 2

    def test_add_and_get_version(self):
        store = InMemoryStore()
        store.add_version("wf_1", "ver_1", {"id": "ver_1", "spec": {}})
        result = store.get_version("wf_1", "ver_1")
        assert result["id"] == "ver_1"

    def test_list_versions(self):
        store = InMemoryStore()
        store.add_version("wf_1", "ver_1", {"id": "ver_1", "spec": {}, "created_at": "2024-01-01"})
        store.add_version("wf_1", "ver_2", {"id": "ver_2", "spec": {}, "created_at": "2024-01-02"})
        result = store.list_versions("wf_1")
        assert len(result) == 2

    def test_log_and_list_decisions(self):
        store = InMemoryStore()
        store.log_decision("wf_1", {"agent": "planner", "at": "now"})
        result = store.list_decisions("wf_1")
        assert len(result) == 1
        assert result[0]["agent"] == "planner"


class TestExecutorHelpers:
    def test_log_creates_entry(self):
        execution = Execution(id="ex_1", workflow_id="wf_1")
        log = _log(execution, "node_1", status=NodeStatus.succeeded, output={"ok": True})
        assert log.node_id == "node_1"
        assert log.status == NodeStatus.succeeded
        assert len(execution.logs) == 1

    def test_completed_ids(self):
        execution = Execution(
            id="ex_1",
            workflow_id="wf_1",
            logs=[
                ExecutionLog(node_id="a", status=NodeStatus.succeeded),
                ExecutionLog(node_id="b", status=NodeStatus.failed),
            ]
        )
        completed = _completed_ids(execution)
        assert "a" in completed
        assert "b" not in completed

    def test_is_control_backedge(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="loop", type=NodeType.for_each, iterate_over="{{ items }}", loop_body=["item_node"]),
                Node(id="item_node", type=NodeType.connector, connector="SlackNotify", depends_on=["loop"]),
            ]
        )
        graph = compile_spec(spec)
        node = spec.nodes[1]
        assert _is_control_backedge(graph, node, "loop") is True

        node2 = spec.nodes[0]
        assert _is_control_backedge(graph, node2, "item_node") is False


class TestExecution:
    def test_simple_execution(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test", "text": "hello"}),
            ]
        )
        execution = Execution(id="ex_1", workflow_id="wf_1", dry_run=True)
        result = asyncio.run(run_execution(spec, execution))
        assert result.state == ExecutionState.completed

    def test_conditional_execution(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="cond", type=NodeType.conditional, condition="true", true_branch=["a"], false_branch=["b"]),
                Node(id="a", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test"}),
                Node(id="b", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test"}),
            ]
        )
        execution = Execution(id="ex_1", workflow_id="wf_1", dry_run=True)
        result = asyncio.run(run_execution(spec, execution))
        assert result.state == ExecutionState.completed
        cond_log = next(l for l in result.logs if l.node_id == "cond")
        assert cond_log.output["taken"] == "true"

    def test_for_each_execution(self):
        spec = WorkflowSpec(
            name="test",
            variables={"items": [{"a": 1}, {"a": 2}]},
            nodes=[
                Node(id="loop", type=NodeType.for_each, iterate_over="{{ items }}", loop_body=["item_node"]),
                Node(id="item_node", type=NodeType.connector, connector="SlackNotify", config={"channel": "#test"}),
            ]
        )
        execution = Execution(id="ex_1", workflow_id="wf_1", dry_run=True)
        result = asyncio.run(run_execution(spec, execution))
        assert result.state == ExecutionState.completed
        loop_log = next(l for l in result.logs if l.node_id == "loop")
        assert len(loop_log.output["iterations"]) == 2

    def test_human_approval_dry_run(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="gate", type=NodeType.human_approval, config={"auto_approve": True}),
            ]
        )
        execution = Execution(id="ex_1", workflow_id="wf_1", dry_run=True)
        result = asyncio.run(run_execution(spec, execution))
        assert result.state == ExecutionState.completed

    def test_human_approval_real(self):
        spec = WorkflowSpec(
            name="test",
            nodes=[
                Node(id="gate", type=NodeType.human_approval, config={"auto_approve": False}),
            ]
        )
        execution = Execution(id="ex_1", workflow_id="wf_1", dry_run=False)
        result = asyncio.run(run_execution(spec, execution))
        assert result.state == ExecutionState.awaiting_approval
        assert result.pending_approval_node_id == "gate"


class TestLLMClient:
    def test_complete_json_uses_stub(self):
        class Dummy(BaseModel):
            ok: bool

        result = client.complete_json(task="t", system="s", user="u", schema=Dummy)
        assert result.ok is True

    def test_llm_error_exists(self):
        assert hasattr(client, "LLMError")


class TestConfig:
    def test_settings_defaults(self):
        from app.config import Settings
        s = Settings()
        assert s.llm_max_retries >= 0
        assert s.openrouter_base_url is not None

    def test_use_real_llm_false_without_key(self):
        from app.config import Settings
        s = Settings()
        s.openrouter_api_key = None
        assert s.use_real_llm is False

    def test_use_real_llm_true_with_key(self):
        from app.config import Settings
        s = Settings()
        s.openrouter_api_key = "test-key"
        assert s.use_real_llm is True