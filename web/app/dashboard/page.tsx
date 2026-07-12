"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import PageShell from "@/app/components/PageShell";
import RowDivider from "@/app/components/RowDivider";

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
    if (!auth) {
      router.push("/login");
      return;
    }
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
    <PageShell
      eyebrow="Dashboard"
      title="Just say so"
      dek={
        user?.email
          ? `Signed in as ${user.email}. Describe an automation in plain English and Sayso plans, validates, and runs it.`
          : "Describe an automation in plain English and Sayso plans, validates, and runs it."
      }
      loading={!ready}
    >
      <div className="app-rows tabs_layout_wrapper">
        <div className="tabs_layout_cover">
          {cards.map((card, i) => (
            <Link key={card.href} href={card.href} className="app-row-link">
              <div className="f_grid_2">
                <div className="tabs_num ts-13px mono">{card.index}</div>
                <div className="tabs_wrapper">
                  {i > 0 && <RowDivider />}
                  <div className="tabs_content">
                    <div className="content_devider">
                      <h2 className="h3-60px">{card.label}</h2>
                      <span className="ts-24px mono app-row-stat">{card.stat}</span>
                    </div>
                    <p className="ts-16px app-ink">{card.desc}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
