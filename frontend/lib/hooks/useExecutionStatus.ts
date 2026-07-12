"use client";

import { useEffect, useRef, useState } from "react";
import { getExecutionStatus } from "@/lib/api/workflows";
import type { Execution } from "@/lib/types";

const POLL_MS = 1500;
const TERMINAL_STATES = new Set(["completed", "failed"]);

export function useExecutionStatus(
  workflowId: string,
  executionId: string | null,
  refreshKey = 0,
) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!executionId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await getExecutionStatus(workflowId, executionId ?? undefined);
        if (cancelled) return;
        setExecution(res);
        setError(null);
        if (!TERMINAL_STATES.has(res.state) && res.state !== "awaiting_heal_approval" && res.state !== "awaiting_approval") {
          timerRef.current = setTimeout(poll, POLL_MS);
        }
      } catch {
        if (!cancelled) setError("Could not fetch execution status.");
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [workflowId, executionId, refreshKey]);

  return { execution: executionId ? execution : null, error };
}
