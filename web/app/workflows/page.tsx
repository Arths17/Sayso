"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import type { WorkflowRecord } from "@/app/api/index";
import WorkflowCard from "@/app/components/WorkflowCard";
import NewWorkflowCard from "@/app/components/NewWorkflowCard";
import PageShell from "@/app/components/PageShell";

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
      await refreshWorkflows();
      setReady(true);
    });
    return () => unsub();
  }, [router, refreshWorkflows]);

  return (
    <PageShell
      eyebrow="Workflows"
      title="Describe it, run it"
      dek="Every workflow starts as a sentence. Sayso plans the steps, checks them, and compiles them into something you can run."
      loading={!ready}
    >
      <div className="wf_grid">
        <NewWorkflowCard showExamples={workflows.length === 0} onCreated={refreshWorkflows} />
        {workflows.map((wf) => (
          <WorkflowCard key={wf.id} record={wf} />
        ))}
      </div>

      <style>{`
        .wf_grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(17em, 1fr));
          gap: var(--gaps--gap-20);
        }
      `}</style>
    </PageShell>
  );
}
