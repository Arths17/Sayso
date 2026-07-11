import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { BADGE_CLASS, RUN_48_LOG, RUNS } from "./data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Runs",
};

export default function RunsPage() {
  return (
    <>
      <header className="frame dark">
        <NavBar />
        <div className="container" style={{ paddingTop: 28, paddingBottom: 26 }}>
          <h2 style={{ color: "var(--moonlight)", fontSize: "1.6rem" }}>Runs</h2>
          <p className="mono" style={{ opacity: 0.5, marginTop: 8, textTransform: "none", fontSize: "0.82rem" }}>
            Every execution, including the retries. Click a row to see its step-by-step log.
          </p>
        </div>
      </header>

      <main className="frame light" style={{ marginTop: 0 }}>
        <table className="runs-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {RUNS.map((run) => (
              <tr key={run.id} className={run.id === "48" ? "selected" : undefined}>
                <td>{run.workflow}</td>
                <td>{run.trigger}</td>
                <td>
                  <span className={`badge ${BADGE_CLASS[run.status]}`}>
                    <span className="d" />
                    {run.statusLabel}
                  </span>
                </td>
                <td>{run.duration}</td>
                <td>{run.started}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.detail}>
          <div
            className="mono"
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: 14,
            }}
          >
            run #48 — detail
          </div>
          <div
            className="console"
            style={{
              background: "var(--neverything)",
              color: "var(--moonlight)",
              padding: "18px 18px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {RUN_48_LOG.map((entry, i) => (
              <div className="line" key={i}>
                <span className="ts">{entry.ts}</span>
                <span className={entry.tag}>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>

        <footer
          className="foot"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "22px var(--gutter)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.66rem",
            letterSpacing: "0.06em",
            opacity: 0.55,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>SaySo — vsHacks 2026</span>
        </footer>
      </main>
    </>
  );
}
