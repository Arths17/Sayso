"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import TopNav from "@/app/components/TopNav";
import DashedDivider from "@/app/components/DashedDivider";
import DottedFrame from "@/app/components/DottedFrame";

interface HubCard {
  index: string;
  label: string;
  href: string;
  desc: string;
  stat: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [connectorCount, setConnectorCount] = useState(0);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const token = await u.getIdToken();
      apiClient.setToken(token);
      setUser(u);

      const [workflows, health, googleStatus] = await Promise.allSettled([
        apiClient.listWorkflows(),
        apiClient.health(),
        apiClient.googleOAuthStatus(),
      ]);

      if (workflows.status === "fulfilled") setWorkflowCount(workflows.value.length);
      if (health.status === "fulfilled") setConnectorCount(health.value.connectors.length);
      if (googleStatus.status === "fulfilled") setGoogleConnected(googleStatus.value.connected);

      setReady(true);
    });
    return () => unsub();
  }, [router]);

  const cards: HubCard[] = [
    {
      index: "01",
      label: "Workflows",
      href: "/workflows",
      desc: "Build a new automation from a plain-English prompt, or run one you already have.",
      stat: String(workflowCount).padStart(2, "0"),
    },
    {
      index: "02",
      label: "Executions",
      href: "/executions",
      desc: "Every run across all your workflows — state, mode, and when it happened.",
      stat: "LOG",
    },
    {
      index: "03",
      label: "Integrations",
      href: "/integrations",
      desc: "Connect Google and see which connectors are available to your workflows.",
      stat: googleConnected ? "ON" : String(connectorCount).padStart(2, "0"),
    },
    {
      index: "04",
      label: "Settings",
      href: "/settings",
      desc: "Account details and session controls.",
      stat: "ACC",
    },
  ];

  return (
    <main className="hub_wrap">
      <TopNav />

      <section className="hub_main">
        {!ready ? (
          <p className="ts-13px color-white-50 mono">Loading...</p>
        ) : (
          <>
            <header className="hub_header">
              <DottedFrame />
              <h1 className="ts-30px color-white mono all-caps hub_title">Dashboard</h1>
              <p className="ts-13px color-white-50 mono hub_sub">
                {user?.email ? `// signed in as ${user.email}` : "// welcome back"}
              </p>
            </header>

            <DashedDivider />

            <div className="hub_grid">
              {cards.map((card) => (
                <a key={card.href} href={card.href} className="hub_card">
                  <div className="hub_card-index ts-11px mono all-caps">{card.index}</div>
                  <div className="hub_card-body">
                    <div className="hub_card-top">
                      <h2 className="ts-18px color-white mono all-caps hub_card-title">
                        {card.label}
                      </h2>
                      <span className="ts-24px mono hub_card-stat">{card.stat}</span>
                    </div>
                    <p className="ts-13px color-white-50 hub_card-desc">{card.desc}</p>
                  </div>
                  <div className="hub_card-arrow ts-13px mono">→</div>
                </a>
              ))}
            </div>
          </>
        )}
      </section>

      <style>{`
        .hub_wrap {
          min-height: 100dvh;
          background-color: var(--color--black);
        }

        .hub_main {
          max-width: 72em;
          margin: 0 auto;
          padding: 7.5em 3em 4em;
        }

        .hub_header {
          position: relative;
          padding: 1.5em 1.75em;
          margin-bottom: 0.5em;
        }

        .hub_title {
          margin: 0 0 0.5em;
          letter-spacing: -0.02em;
        }

        .hub_sub {
          margin: 0;
        }

        .hub_grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
          gap: 1px;
          background-color: var(--color--grey-800);
          border: 1px solid var(--color--grey-800);
          margin-top: 2em;
        }

        .hub_card {
          position: relative;
          background-color: var(--color--black);
          padding: 1.75em;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 1.5em;
          min-height: 12em;
          transition: background-color 0.15s;
        }

        .hub_card:hover {
          background-color: var(--color--grey-900);
        }

        .hub_card:hover .hub_card-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .hub_card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background-color: var(--color--primary-blue);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.15s;
        }

        .hub_card:hover::before {
          transform: scaleX(1);
        }

        .hub_card-index {
          color: var(--color--grey-600);
        }

        .hub_card-body {
          flex: 1;
        }

        .hub_card-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1em;
          margin-bottom: 0.75em;
        }

        .hub_card-title {
          margin: 0;
        }

        .hub_card-stat {
          color: var(--color--primary-blue);
          white-space: nowrap;
        }

        .hub_card-desc {
          margin: 0;
        }

        .hub_card-arrow {
          color: var(--color--white);
          opacity: 0;
          transform: translateX(-6px);
          transition: opacity 0.15s, transform 0.15s;
        }
      `}</style>
    </main>
  );
}
