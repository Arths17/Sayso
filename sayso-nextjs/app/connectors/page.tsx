import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { CONNECTORS } from "./data";

export const metadata: Metadata = {
  title: "Connectors",
};

export default function ConnectorsPage() {
  return (
    <>
      <header className="frame dark">
        <NavBar />
        <div className="container" style={{ paddingTop: 28, paddingBottom: 26 }}>
          <h2 style={{ color: "var(--moonlight)", fontSize: "1.6rem" }}>Connectors</h2>
          <p
            className="mono"
            style={{
              opacity: 0.5,
              maxWidth: 520,
              marginTop: 10,
              textTransform: "none",
              letterSpacing: "0.01em",
              fontSize: "0.82rem",
            }}
          >
            Each card below is a class the planner can pick from —{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>GmailTrigger</code>,{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>SlackAction</code>, and so on.
            Connect an account once; it&apos;s available to every prompt after that.
          </p>
        </div>
      </header>

      <main className="frame light" style={{ marginTop: 0 }}>
        <div className="connector-grid">
          {CONNECTORS.map((c) => (
            <div className="connector-card" key={c.name}>
              <div className="top">
                <div className="ic">
                  <i className={`ti ti-${c.icon}`} aria-hidden="true" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem" }}>{c.name}</h3>
                  <span className="mono" style={{ opacity: 0.5 }}>
                    {c.kind}
                  </span>
                </div>
              </div>
              <p>{c.description}</p>
              <div className="foot">
                <span className={`badge ${c.status === "connected" ? "badge-success" : "badge-retry"}`}>
                  <span className="d" />
                  {c.status === "connected" ? "connected" : "not connected"}
                </span>
                <span className="mono" style={{ opacity: 0.5 }}>
                  {c.className}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px var(--gutter) 30px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <p className="mono" style={{ opacity: 0.5, textTransform: "none", fontSize: "0.82rem" }}>
            Need something that isn&apos;t here yet? The HTTP connector covers most gaps until we
            add it.
          </p>
          <Link href="/builder" className="btn btn-ghost-light" style={{ borderColor: "var(--line)" }}>
            Open the builder
          </Link>
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
