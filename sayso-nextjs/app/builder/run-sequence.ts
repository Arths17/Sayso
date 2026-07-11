export type NodeId = "0" | "1" | "2" | "3" | "4a" | "4b" | "5" | "6" | "7";

export const NODE_INFO: Record<NodeId, { icon: string; title: string; subtitle: string; width?: number }> = {
  "0": { icon: "mail", title: "Gmail trigger", subtitle: "new attachment matches *.pdf" },
  "1": { icon: "download", title: "Download attachment", subtitle: "fetch pdf from message" },
  "2": { icon: "file-text", title: "Extract PDF text", subtitle: "OCR / text layer read" },
  "3": { icon: "sparkles", title: "AI field extraction", subtitle: "invoice no. / total / due date" },
  "4a": { icon: "brand-slack", title: "Notify manager", subtitle: "slack dm", width: 190 },
  "4b": { icon: "archive", title: "Archive", subtitle: "label + skip", width: 190 },
  "5": { icon: "brand-google-drive", title: "Upload to Drive", subtitle: "/invoices/2026" },
  "6": { icon: "table", title: "Append row to Sheets", subtitle: "invoice_log tab" },
  "7": { icon: "bell", title: "Send Slack notification", subtitle: "#finance channel" },
};

export type RunStep = {
  id: NodeId;
  label: string;
  vars?: boolean;
  retry?: boolean;
};

// The order nodes execute in. "4b" (Archive) is deliberately excluded — the
// condition evaluates true in this demo run, so only the "4a" branch fires.
export const RUN_SEQUENCE: RunStep[] = [
  { id: "0", label: "triggered by new gmail attachment" },
  { id: "1", label: "downloading attachment…" },
  { id: "2", label: "extracting pdf text" },
  { id: "3", label: "ai extraction: invoice_no, amount, due_date", vars: true },
  { id: "4a", label: "condition true — notifying manager" },
  { id: "5", label: "uploading pdf to drive" },
  { id: "6", label: "appending row to sheets", retry: true },
  { id: "7", label: "sending slack notification" },
];

export const EXTRACTED_VARS = {
  invoice_no: "INV-2291",
  amount: "$6,420.00",
  due_date: "2026-08-01",
};

export function formatElapsed(totalSeconds: number) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
