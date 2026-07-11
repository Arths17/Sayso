export type RunStatus = "success" | "error" | "retry";

export type Run = {
  id: string;
  workflow: string;
  trigger: string;
  status: RunStatus;
  statusLabel: string;
  duration: string;
  started: string;
};

export const RUNS: Run[] = [
  {
    id: "48",
    workflow: "Invoice intake → Drive, Sheets, Slack",
    trigger: "gmail.new_attachment",
    status: "retry",
    statusLabel: "retried once",
    duration: "6.2s",
    started: "run #48 · 2m ago",
  },
  {
    id: "47",
    workflow: "Invoice intake → Drive, Sheets, Slack",
    trigger: "gmail.new_attachment",
    status: "success",
    statusLabel: "success",
    duration: "4.1s",
    started: "run #47 · 1h ago",
  },
  {
    id: "46",
    workflow: "Customer reply drafts",
    trigger: "gmail.new_message",
    status: "success",
    statusLabel: "success",
    duration: "3.4s",
    started: "run #46 · 3h ago",
  },
  {
    id: "45",
    workflow: "Row-to-email blast",
    trigger: "manual",
    status: "error",
    statusLabel: "failed",
    duration: "1.8s",
    started: "run #45 · yesterday",
  },
  {
    id: "44",
    workflow: "Invoice intake → Drive, Sheets, Slack",
    trigger: "gmail.new_attachment",
    status: "success",
    statusLabel: "success",
    duration: "3.9s",
    started: "run #44 · yesterday",
  },
];

export const BADGE_CLASS: Record<RunStatus, string> = {
  success: "badge-success",
  error: "badge-error",
  retry: "badge-retry",
};

export const RUN_48_LOG: Array<{ ts: string; tag: "tag-ok" | "tag-err" | "tag-warn"; text: string }> = [
  { ts: "00:00", tag: "tag-ok", text: "triggered by new gmail attachment" },
  { ts: "00:01", tag: "tag-ok", text: "downloading attachment…" },
  { ts: "00:02", tag: "tag-ok", text: "extracting pdf text" },
  { ts: "00:03", tag: "tag-ok", text: "ai extraction: invoice_no=INV-2291, amount=$6,420.00, due=2026-08-01" },
  { ts: "00:03", tag: "tag-ok", text: "condition true (amount > 5000) — notifying manager" },
  { ts: "00:04", tag: "tag-ok", text: "uploading pdf to drive" },
  { ts: "00:04", tag: "tag-err", text: "sheets api: rate limit exceeded" },
  { ts: "00:04", tag: "tag-warn", text: "retrying in 2s…" },
  { ts: "00:06", tag: "tag-ok", text: "retry succeeded — row appended" },
  { ts: "00:06", tag: "tag-ok", text: "sending slack notification" },
  { ts: "00:06", tag: "tag-ok", text: "workflow complete — 8 of 8 steps succeeded" },
];
