"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import PageShell from "@/app/components/PageShell";

const CONNECTOR_LABELS: Record<string, string> = {
  gmail_trigger: "Gmail Trigger",
  gmail_send: "Gmail Send",
  drive_upload: "Google Drive Upload",
  sheets_append: "Google Sheets Append",
  sheets_read_rows: "Google Sheets Read Rows",
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
  const [error, setError] = useState<string | null>(searchParams.get("google_error"));
  const [justConnected] = useState(searchParams.get("google_connected") === "1");

  useEffect(() => {
    if (!auth) {
      router.push("/login");
      return;
    }
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
    <PageShell
      eyebrow="Integrations"
      title="Connect the accounts"
      dek="Sayso only reaches the services you let it reach. Connect Google to unlock the Gmail, Drive, and Sheets connectors."
      loading={!ready}
    >
      {justConnected && <p className="ts-14px mono app-note">Google account connected successfully.</p>}

      <div className="app-panel">
        <div className="app-panel-row">
          <div>
            <p className="ts-16px color-white" style={{ margin: "0 0 0.25em" }}>
              Google
            </p>
            <p className="ts-14px app-dek">
              Gmail, Drive, and Sheets connectors need this connected.
            </p>
          </div>
          {googleConnected ? (
            <span className="ts-12px mono all-caps app-badge">Connected</span>
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
      </div>

      {error && <p className="ts-14px mono app-note is--error">{error}</p>}

      <div className="app-section">
        <h2 className="ts-11px mono all-caps app-section-title">Available connectors</h2>
        <div className="int_grid">
          {connectors.map((c) => (
            <div key={c} className="int_card">
              <span className="ts-16px color-white">{CONNECTOR_LABELS[c] || c}</span>
              <span className="ts-11px mono color-white-50">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .int_grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15em, 1fr));
          gap: 1px;
          background-color: var(--color--grey-800);
          border: 1px solid var(--color--grey-800);
        }
        .int_card {
          background-color: var(--color--black);
          padding: var(--gaps--gap-24);
          display: flex;
          flex-direction: column;
          gap: var(--gaps--gap-6);
        }
      `}</style>
    </PageShell>
  );
}
