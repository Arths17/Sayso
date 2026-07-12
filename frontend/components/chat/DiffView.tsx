import type { WorkflowVersion } from "@/lib/types";

export function DiffView({ diff }: { diff: WorkflowVersion["diff"] }) {
  const changed = Object.entries(diff.changed ?? {});
  const added = Object.entries(diff.added ?? {});
  const removed = Object.entries(diff.removed ?? {});

  if (!changed.length && !added.length && !removed.length) {
    return <p className="text-xs text-ink-muted">No changes recorded.</p>;
  }

  return (
    <div className="font-mono-ui space-y-2 rounded-md bg-ink/[0.035] p-3 text-xs dark:bg-white/[0.04]">
      {changed.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <span className="font-semibold text-ink">{key}</span>
          <span className="text-red-600 line-through">{JSON.stringify(value.from)}</span>
          <span className="text-emerald-600">{JSON.stringify(value.to)}</span>
        </div>
      ))}
      {added.map(([key, value]) => (
        <div key={key} className="text-emerald-600">
          + {key}: {JSON.stringify(value)}
        </div>
      ))}
      {removed.map(([key, value]) => (
        <div key={key} className="text-red-600">
          − {key}: {JSON.stringify(value)}
        </div>
      ))}
    </div>
  );
}
