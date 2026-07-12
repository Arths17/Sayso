"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ClarifyModal({
  questions,
  onSubmit,
  onCancel,
}: {
  questions: string[];
  onSubmit: (answers: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(answers);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-md border-2 border-ink bg-bg p-6 shadow-xl">
        <h2 className="font-display text-base font-bold text-ink">A few things to clarify</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {questions.map((q) => (
            <label key={q} className="block">
              <span className="text-sm text-ink">{q}</span>
              <input
                type="text"
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                className="mt-1 w-full rounded-md border-2 border-border p-2 text-sm outline-none focus:border-accent"
              />
            </label>
          ))}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
