"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import type { WorkflowRecord } from "@/app/api/index";
import WorkflowCard from "@/app/components/WorkflowCard";
import NewWorkflowCard from "@/app/components/NewWorkflowCard";
import TopNav from "@/app/components/TopNav";
import DashedDivider from "@/app/components/DashedDivider";

export default function WorkflowsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);

  const refreshWorkflows = useCallback(async () => {
    try {
      const list = await apiClient.listWorkflows();
      setWorkflows(list);
    } catch {
      setWorkflows([]);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();
      apiClient.setToken(token);
      await refreshWorkflows();
      setReady(true);
    });
    return () => unsub();
  }, [router, refreshWorkflows]);

  return (
    <main className="wf_wrap">
      <TopNav />

      <section className="wf_main">
        {!ready ? (
          <p className="ts-13px color-white-50 mono">Loading...</p>
        ) : (
          <>
            <header className="wf_main-header">
              <h1 className="ts-16px color-white mono all-caps wf_title">Workflows</h1>
            </header>

            <DashedDivider />

            <div className="wf_grid">
              <NewWorkflowCard showExamples={workflows.length === 0} onCreated={refreshWorkflows} />
              {workflows.map((wf) => (
                <WorkflowCard key={wf.id} record={wf} />
              ))}
            </div>
          </>
        )}
      </section>

      <style>{`
        .wf_wrap {
          min-height: 100dvh;
          background-color: var(--color--black);
        }

        .wf_main {
          max-width: 72em;
          margin: 0 auto;
          padding: 7.5em 3em 4em;
        }

        .wf_main-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .wf_title {
          margin: 0;
        }

        .wf_grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16em, 1fr));
          gap: 1.25em;
          margin-top: 2em;
        }
      `}</style>
    </main>
  );
}
