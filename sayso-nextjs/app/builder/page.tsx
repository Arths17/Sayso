"use client";

import { useCallback, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import WNode, { NodeStatus } from "@/components/WNode";
import {
  EXTRACTED_VARS,
  NODE_INFO,
  NodeId,
  RUN_SEQUENCE,
  formatElapsed,
  wait,
} from "./run-sequence";
import styles from "./page.module.css";

type LogTag = "tag-ok" | "tag-err" | "tag-warn";
type LogEntry = { ts: string; tag: LogTag; text: string };

const EMPTY_STATUSES: Record<NodeId, NodeStatus> = {
  "0": "idle",
  "1": "idle",
  "2": "idle",
  "3": "idle",
  "4a": "idle",
  "4b": "idle",
  "5": "idle",
  "6": "idle",
  "7": "idle",
};

const EMPTY_VARS = { invoice_no: "—", amount: "—", due_date: "—" };

export default function BuilderPage() {
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState<Record<NodeId, NodeStatus>>(EMPTY_STATUSES);
  const [variables, setVariables] = useState(EMPTY_VARS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const runToken = useRef(0);

  const setNode = useCallback((id: NodeId, status: NodeStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }, []);

  const addLog = useCallback((ts: number, tag: LogTag, text: string) => {
    setLog((prev) => [...prev, { ts: formatElapsed(ts), tag, text }]);
  }, []);

  const startRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStatuses(EMPTY_STATUSES);
    setVariables(EMPTY_VARS);
    setLog([]);

    const token = ++runToken.current;
    let t = 0;

    for (const step of RUN_SEQUENCE) {
      if (runToken.current !== token) return; // a newer run superseded this one
      setNode(step.id, "run");
      addLog(t, "tag-ok", step.label);

      if (step.retry) {
        await wait(500);
        t += 1;
        addLog(t, "tag-err", "sheets api: rate limit exceeded");
        addLog(t, "tag-warn", "retrying in 2s…");
        await wait(500);
        t += 2;
        addLog(t, "tag-ok", "retry succeeded, continuing");
        setNode(step.id, "ok");
        t += 1;
      } else {
        await wait(550);
        setNode(step.id, "ok");
        if (step.vars) setVariables(EXTRACTED_VARS);
        t += 1;
      }
    }

    addLog(t, "tag-ok", "workflow complete — 8 of 8 steps succeeded");
    setRunning(false);
  }, [running, setNode, addLog]);

  return (
    <div className="frame dark">
      <header>
        <NavBar />

        <div className="appbar">
          <input className="titlefield" defaultValue="Invoice intake → Drive, Sheets, Slack" size={34} />
          <span className="status-pill status-success">
            <span className="d" />
            saved
          </span>
          <div className="spacer" />
          <span className="mono" style={{ opacity: 0.5 }}>
            run #48
          </span>
          <button className="btn btn-ghost-dark" style={{ borderColor: "var(--line-dark)", padding: "9px 16px" }}>
            Save
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: "9px 18px" }}
            onClick={startRun}
            disabled={running}
          >
            {running ? "Running…" : <>Run &rarr;</>}
          </button>
        </div>

        <div className="promptbar">
          <span className="dot" style={{ width: 7, height: 7, background: "var(--buckthorn)", flexShrink: 0 }} />
          <input
            defaultValue="Whenever I receive an invoice PDF in Gmail, extract the invoice number, total amount, and due date, save the PDF to Google Drive, append the data to Google Sheets, and send me a Slack message. If the amount is over $5,000, notify my manager instead of archiving."
          />
          <button
            className="btn btn-ghost-dark"
            style={{ borderColor: "var(--line-dark)", padding: "9px 16px", flexShrink: 0 }}
          >
            Regenerate
          </button>
        </div>
      </header>

      <main>
        <div className="workspace">
          <div className="canvas">
            <div className="panel-block" style={{ marginBottom: 18 }}>
              <div className="h">generated plan (json)</div>
              <div
                className="mono"
                style={{
                  fontSize: "0.68rem",
                  opacity: 0.55,
                  lineHeight: 1.7,
                  border: "1px solid var(--line-dark)",
                  padding: "12px 14px",
                }}
              >
                {'{ "trigger": "gmail.new_attachment",'}
                <br />
                &nbsp;&nbsp;{'"steps": ["download_attachment","extract_pdf",'}
                <br />
                &nbsp;&nbsp;{'"extract_invoice_fields","condition:amount>5000",'}
                <br />
                &nbsp;&nbsp;{'"upload_drive","append_sheet","notify_slack"] }'}
              </div>
            </div>

            <div className="chain">
              <WNode status={statuses["0"]} {...NODE_INFO["0"]} />
              <div className="wconn" />
              <WNode status={statuses["1"]} {...NODE_INFO["1"]} />
              <div className="wconn" />
              <WNode status={statuses["2"]} {...NODE_INFO["2"]} />
              <div className="wconn" />
              <WNode status={statuses["3"]} {...NODE_INFO["3"]} />
              <div className="wconn" />
            </div>

            <div className="branch-wrap" style={{ margin: "4px 0" }}>
              <div className="ifblock">
                <span className="kw">if</span> amount &gt; 5000:
              </div>
              <div className="branch-legs">
                <div className="leg">
                  <div className="lbl">&#8618; true</div>
                  <WNode status={statuses["4a"]} {...NODE_INFO["4a"]} />
                </div>
                <div className="leg">
                  <div className="lbl">&#8618; else</div>
                  <WNode status={statuses["4b"]} {...NODE_INFO["4b"]} />
                </div>
              </div>
            </div>

            <div className="chain" style={{ marginTop: 4 }}>
              <div className="wconn" />
              <WNode status={statuses["5"]} {...NODE_INFO["5"]} />
              <div className="wconn" />
              <WNode status={statuses["6"]} {...NODE_INFO["6"]} />
              <div className="wconn" />
              <WNode status={statuses["7"]} {...NODE_INFO["7"]} />
            </div>
          </div>

          <div className="sidepanel">
            <div className="panel-block">
              <div className="h">live variables</div>
              <div className="varlist">
                {Object.entries(variables).map(([k, v]) => (
                  <div className="var-item" key={k}>
                    <span className="k">{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-block">
              <div className="h">connectors used</div>
              <div className="chiprow">
                {["Gmail", "Google Drive", "Google Sheets", "Slack"].map((name) => (
                  <span className="chip-sm" key={name}>
                    <span className="d" />
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="panel-block">
              <div className="h">node inspector</div>
              <div
                className="mono"
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.55,
                  border: "1px solid var(--line-dark)",
                  padding: "12px 14px",
                  lineHeight: 1.7,
                }}
              >
                select a node to view its
                <br />
                input, output, and retry policy.
              </div>
            </div>

            <div className="panel-block">
              <div className="h">human approval</div>
              <div
                className="mono"
                style={{
                  fontSize: "0.7rem",
                  border: "1px solid var(--line-dark)",
                  padding: "12px 14px",
                  lineHeight: 1.7,
                  opacity: 0.7,
                }}
              >
                &quot;Generate a reply to customer emails but let me approve before sending&quot;
                pauses here until you click approve.
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line-dark)", padding: "26px var(--gutter) 34px" }}>
          <div className="mono" style={{ opacity: 0.5, marginBottom: 18 }}>
            this same prompt shape also handles:
          </div>

          <div className={styles.patternRow} style={{ marginBottom: 10 }}>
            <span className={styles.patternLabel}>Loops</span>
            <span className={`mono ${styles.patternExample}`}>
              &quot;for every row in this sheet, generate an email and send it&quot;
            </span>
            <span className={`mono ${styles.patternCode}`}>
              sheets &rarr; for_each_row &rarr; generate_email &rarr; send_gmail
            </span>
          </div>

          <div className={styles.patternRow}>
            <span className={styles.patternLabel}>Approval gates</span>
            <span className={`mono ${styles.patternExample}`}>
              &quot;draft a reply, but let me approve it before it sends&quot;
            </span>
            <span className={`mono ${styles.patternCode}`}>
              generate_reply &rarr; await_approval &rarr; send_email
            </span>
          </div>
        </div>

        <div className="console">
          <div
            className="h"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.66rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: 10,
            }}
          >
            execution log
          </div>
          <div>
            {log.map((entry, i) => (
              <div className="line" key={i}>
                <span className="ts">{entry.ts}</span>
                <span className={entry.tag}>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
