"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import TopNav from "@/app/components/TopNav";
import DashedDivider from "@/app/components/DashedDivider";

const CONNECTOR_LABELS: Record<string, string> = {
  gmail_trigger: "Gmail Trigger",
  gmail_send: "Gmail Send",
  drive_upload: "Google Drive Upload",
  sheets_append: "Google Sheets Append",
  sheets_read_rows: "Google Sheets Read Rows",
  slack_notify: "Slack Notify",
  http_request: "HTTP Request",
  pdf_extract_text: "PDF Extract Text",
  llm_extract_fields: "LLM Extract Fields",
};

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [connectors, setConnectors] = useState<string[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("google_error")
  );
  const [justConnected, setJustConnected] = useState(searchParams.get("google_connected") === "1");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();
      apiClient.setToken(token);
      try {
        const health = await apiClient.health();
        setConnectors(health.connectors);
      } catch {
        setConnectors([]);
      }
      try {
        const status = await apiClient.googleOAuthStatus();
        setGoogleConnected(status.connected);
      } catch {
        setGoogleConnected(false);
      }
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (searchParams.get("google_connected") || searchParams.get("google_error")) {
      router.replace("/integrations");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectGoogle = async () => {
    setError(null);
    setConnecting(true);
    try {
      const { auth_url } = await apiClient.googleOAuthStart();
      window.location.href = auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google connection.");
      setConnecting(false);
    }
  };

  return (
    <main className="int_wrap">
      <TopNav />

      <section className="int_main">
        {!ready ? (
          <p className="ts-13px color-white-50 mono">Loading...</p>
        ) : (
          <>
            <header className="int_header">
              <h1 className="ts-16px color-white mono all-caps int_title">Integrations</h1>
            </header>

            <DashedDivider />

            {justConnected && (
              <p className="ts-12px int_success">Google account connected successfully.</p>
            )}

            <div className="int_section">
              <h2 className="ts-13px color-white-50 mono all-caps int_section-title">Accounts</h2>
              <div className="int_account-row">
                <div>
                  <p className="ts-14px color-white int_account-name">Google</p>
                  <p className="ts-12px color-white-50 int_account-desc">
                    Gmail, Drive, and Sheets connectors need this connected.
                  </p>
                </div>
                {googleConnected ? (
                  <span className="ts-12px mono all-caps int_connected">Connected</span>
                ) : (
                  <button
                    type="button"
                    className="cta-button is--blue"
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                  >
                    {connecting ? "Redirecting..." : "Connect"}
                  </button>
                )}
              </div>
              {error && <p className="ts-12px int_error">{error}</p>}
            </div>

            <div className="int_section">
              <h2 className="ts-13px color-white-50 mono all-caps int_section-title">
                Available connectors
              </h2>
              <div className="int_grid">
                {connectors.map((c) => (
                  <div key={c} className="int_card">
                    <span className="ts-13px color-white">{CONNECTOR_LABELS[c] || c}</span>
                    <span className="ts-11px color-white-50 mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <style>{`
        .int_wrap {
          min-height: 100dvh;
          background-color: var(--color--black);
        }

        .int_main {
          max-width: 72em;
          margin: 0 auto;
          padding: 7.5em 3em 4em;
        }

        .int_title {
          margin: 0;
        }

        .int_section {
          margin-top: 2em;
        }

        .int_section-title {
          margin: 0 0 1em;
        }

        .int_account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.25em 1.5em;
        }

        .int_account-name {
          margin: 0 0 0.25em;
        }

        .int_account-desc {
          margin: 0;
        }

        .int_connected {
          color: var(--color--white);
          border: 1px solid var(--color--white);
          padding: 0.375em 0.75em;
        }

        .int_error {
          margin: 0.875em 0 0;
          color: var(--orange);
        }

        .int_success {
          margin: 0 0 2em;
          color: var(--color--white);
        }

        .int_grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(14em, 1fr));
          gap: 1em;
        }

        .int_card {
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.25em;
          display: flex;
          flex-direction: column;
          gap: 0.375em;
        }
      `}</style>
    </main>
  );
}
