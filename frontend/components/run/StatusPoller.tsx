import type { Execution } from "@/lib/types";
import { statusDotClass } from "@/lib/graph/statusColor";

export function StatusPoller({ execution }: { execution: Execution | null }) {
  if (!execution) return null;

  return (
    <div className="rounded-md border-2 border-ink p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono-ui text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Execution {execution.id}
        </span>
        <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
          {execution.state}
        </span>
      </div>
      <ul className="space-y-1.5">
        {execution.logs.map((log, i) => (
          <li key={`${log.node_id}-${i}`} className="font-mono-ui flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(log.status)}`} />
            <span className="font-semibold text-ink">{log.node_id}</span>
            <span className="text-ink-muted">{log.status}</span>
            {log.error && <span className="truncate text-red-600">{log.error}</span>}
          </li>
        ))}
        {execution.logs.length === 0 && (
          <li className="text-xs text-ink-muted">Waiting for the first node to start…</li>
        )}
      </ul>
    </div>
  );
}
