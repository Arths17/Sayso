"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient, ExecutionState, ExecutionLog } from "./app/api/index";

export default function WorkflowPage() {
  const [prompt, setPrompt] = useState("");
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [response, setResponse] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execution, setExecution] = useState<any | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.generate({ prompt });
      setResponse(result);
      setWorkflowId(result.workflow_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.run(workflowId);
      connectToStream(workflowId, result.execution_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = async () => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.dryRun(workflowId);
      connectToStream(workflowId, result.execution_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dry run workflow");
    } finally {
      setLoading(false);
    }
  };

  const connectToStream = (wfId: string, execId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    wsRef.current = apiClient.connectStream(
      wfId,
      execId,
      (data: { state: ExecutionState; logs: ExecutionLog[] }) => {
        setExecution((prev: any) => ({
          ...prev,
          ...data,
          logs: data.logs || prev?.logs || [],
        }));
      },
      (err: Error) => {
        console.error("WebSocket error:", err);
        setWsConnected(false);
      }
    );
    setWsConnected(true);
  };

  const handleClarify = async (answers: Record<string, string>) => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.clarify(workflowId, { answers });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clarify");
    } finally {
      setLoading(false);
    }
  };

  const handleHealApproval = async (approve: boolean) => {
    if (!workflowId || !execution?.id) return;
    setLoading(true);
    try {
      const result = await apiClient.healApproval(workflowId, execution.id, { approve });
      setExecution((prev: any) => ({
        ...prev,
        state: result.state,
        pending_heal: null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process heal approval");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approve: boolean) => {
    if (!workflowId || !execution?.id) return;
    setLoading(true);
    try {
      const result = await apiClient.approve(workflowId, execution.id, { approve });
      setExecution((prev: any) => ({
        ...prev,
        state: result.state,
        pending_approval_node_id: null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process approval");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Sayso Workflow Builder</h1>
      
      <section style={{ marginBottom: "2rem" }}>
        <h2>Generate Workflow</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your workflow"
          style={{ width: "100%", minHeight: "100px", padding: "0.5rem" }}
        />
        <button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
          {loading ? "Generating..." : "Generate Workflow"}
        </button>
      </section>

      {error && (
        <div style={{ color: "red", padding: "1rem", backgroundColor: "#fee", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {response?.status === "needs_clarification" && response.clarification && (
        <section style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "4px" }}>
          <h3>Clarification Needed</h3>
          {response.clarification.questions.map((q: string, i: number) => (
            <div key={i} style={{ marginBottom: "0.5rem" }}>
              <label>{q}</label>
              <input type="text" placeholder="Your answer" style={{ width: "100%", marginTop: "0.25rem" }} />
            </div>
          ))}
          <button onClick={() => {
            const inputs = document.querySelectorAll('input[placeholder="Your answer"]');
            const answers: Record<string, string> = {};
            inputs.forEach((input, i) => {
              if (response.clarification?.questions[i]) {
                answers[response.clarification.questions[i]] = (input as HTMLInputElement).value;
              }
            });
            handleClarify(answers);
          }}>Submit Answers</button>
        </section>
      )}

      {response?.spec && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>Workflow: {response.spec.name}</h2>
          <p>{response.spec.description}</p>
          <h3>Nodes</h3>
          <ul>
            {response.spec.nodes.map((node: any) => (
              <li key={node.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{node.id}</strong> - {node.type}
                {node.connector && ` (${node.connector})`}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleDryRun} disabled={loading}>Dry Run</button>
            <button onClick={handleRun} disabled={loading} style={{ marginLeft: "1rem" }}>Run</button>
          </div>
        </section>
      )}

      {execution && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>Execution Status: {execution.state}</h2>
          {wsConnected && <span style={{ color: "green" }}>Connected (live updates)</span>}
          {execution.logs && execution.logs.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Execution Logs</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Node</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Status</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Output</th>
                  </tr>
                </thead>
                <tbody>
                  {execution.logs.map((log: any, i: number) => (
                    <tr key={i}>
                      <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>{log.node_id}</td>
                      <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>{log.status}</td>
                      <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                        {log.output ? JSON.stringify(log.output) : log.error || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {execution.pending_heal && (
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "4px" }}>
              <h4>Heal Patch Available</h4>
              <p>Node: {execution.pending_heal.node_id}</p>
              <p>Error: {execution.pending_heal.error}</p>
              <p>{execution.pending_heal.diff_explanation}</p>
              <button onClick={() => handleHealApproval(true)} disabled={loading}>Apply Heal</button>
              <button onClick={() => handleHealApproval(false)} disabled={loading} style={{ marginLeft: "0.5rem" }}>Reject</button>
            </div>
          )}
          {execution.pending_approval_node_id && (
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#d1ecf1", borderRadius: "4px" }}>
              <h4>Approval Required</h4>
              <p>Node: {execution.pending_approval_node_id}</p>
              <button onClick={() => handleApproval(true)} disabled={loading}>Approve</button>
              <button onClick={() => handleApproval(false)} disabled={loading} style={{ marginLeft: "0.5rem" }}>Reject</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}