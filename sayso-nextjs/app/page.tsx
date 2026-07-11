import Link from "next/link";
import NavBar from "@/components/NavBar";
import HeroGlow from "@/components/HeroGlow";
import styles from "./page.module.css";

const NODE_CHAIN = [
  "gmail.trigger",
  "download attachment",
  "extract pdf text",
  "ai field extraction",
  "upload to drive",
  "append to sheets",
  "notify slack",
];

export default function HomePage() {
  return (
    <>
      <header className="frame dark frame-hero">
        <HeroGlow />

        <NavBar accountLabel="Sign in" />

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className="mono" style={{ color: "var(--buckthorn)", textTransform: "none", opacity: 1 }}>
              built at vsHacks 2026, 24hr build
            </span>
            <h1 style={{ color: "var(--moonlight)", marginTop: 16 }}>
              Type the automation.
              <br />
              Watch it run.
            </h1>
            <p
              className="mono"
              style={{
                textTransform: "none",
                letterSpacing: "0.01em",
                fontSize: "0.9rem",
                opacity: 0.62,
                maxWidth: 460,
                marginTop: 22,
                lineHeight: 1.65,
              }}
            >
              Most automation tools make you drag blocks around like n8n or Zapier. SaySo skips
              that — you write one sentence, an LLM turns it into a real workflow graph, and you
              click run to watch each step execute live.
            </p>
            <div className={styles.cmdbar}>
              <span className="dot" />
              <span>
                &quot;When I get an invoice PDF in Gmail, pull the number, total, and due date,
                save it to Drive, log it to Sheets, and Slack me.&quot;
              </span>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
              <Link href="/builder" className="btn btn-primary">
                Open the builder &rarr;
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost-dark"
                style={{ borderColor: "var(--line-dark)" }}
              >
                Source on GitHub
              </a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className="mono" style={{ color: "var(--moonlight)", opacity: 0.6, marginBottom: 4 }}>
              run #48 — complete
            </div>
            {NODE_CHAIN.map((label, i) => (
              <div key={label}>
                <div className={styles.nodeChip}>
                  {label} <span className="ok">&#10003;</span>
                </div>
                {i < NODE_CHAIN.length - 1 && <div className={styles.nodeLine} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="frame light" style={{ marginTop: 0 }}>
        <div className="feature-lead">
          <div>
            <h3>Before anything runs, you get a plan you can actually read.</h3>
            <p>
              Type a sentence and the planner turns it into a trigger plus an ordered list of
              steps. We could&apos;ve hidden that behind a spinner. We didn&apos;t — mostly
              because debugging a black box at 3am during the hackathon sounded miserable.
            </p>
          </div>
          <div className="feature-example">
            {'{ "trigger": "gmail.new_attachment",'}
            <br />
            &nbsp;&nbsp;{'"steps": ["download_attachment", "extract_pdf",'}
            <br />
            &nbsp;&nbsp;{'"extract_invoice_fields", "upload_drive",'}
            <br />
            &nbsp;&nbsp;{'"append_sheet", "notify_slack"] }'}
          </div>
        </div>

        <div className="feature-list">
          <div className="feature-row">
            <h4>The graph is real</h4>
            <p>
              Every plan renders as a node chain you can click through, trigger down to the last
              step, before you hit run. It&apos;s the actual execution order, not a diagram drawn
              to look impressive.
            </p>
          </div>
          <div className="feature-row">
            <h4>Retries happen on their own</h4>
            <p>
              Hit a Sheets rate limit and SaySo waits a couple seconds and tries again. An
              expired login pauses the run and asks you to reconnect instead of failing quietly
              somewhere you&apos;d never notice. This ate more of our 24 hours than we budgeted
              for, honestly.
            </p>
          </div>
          <div className="feature-row">
            <h4>Conditions, loops, and approvals</h4>
            <p>
              &quot;If the invoice is over $5,000, tell my manager instead&quot; becomes a branch.
              &quot;For every row in this sheet&quot; becomes a loop. &quot;Let me approve it
              first&quot; adds a pause the run waits on until you click through.
            </p>
          </div>
        </div>

        <div className="flow-line container">
          frontend (react) &rarr; fastapi backend &rarr; llm planner &rarr; workflow generator
          &rarr; execution engine &rarr; connector classes
        </div>

        <div className={styles.integrations}>
          {["Gmail", "Google Sheets", "Google Drive", "Slack", "Discord", "HTTP / webhook"].map(
            (name) => (
              <span key={name} className={styles.chip}>
                {name}
              </span>
            )
          )}
        </div>

        <div className={styles.ctaBand}>
          <h2 style={{ maxWidth: 520 }}>
            Six connectors was enough
            <br />
            for every demo we tried.
          </h2>
          <Link href="/builder" className="btn btn-primary">
            Try it
          </Link>
        </div>

        <footer className={styles.foot}>
          <span>SaySo — vsHacks 2026</span>
          <span>open source, MIT licensed</span>
        </footer>
      </main>
    </>
  );
}
