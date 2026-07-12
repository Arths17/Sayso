"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function PromptBar({
  onSubmit,
  placeholder = "Describe the automation you want to build…",
  submitLabel = "Generate",
}: {
  onSubmit: (prompt: string) => Promise<void> | void;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      await onSubmit(prompt.trim());
      setPrompt("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="flex-1 resize-none rounded-md border-2 border-border bg-bg p-3 text-sm text-ink outline-none focus:border-accent"
      />
      <Button type="submit" disabled={loading || !prompt.trim()} className="shrink-0 self-end">
        {loading ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}
