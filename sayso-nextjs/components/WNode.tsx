export type NodeStatus = "idle" | "run" | "ok" | "error";

const STATE_GLYPH: Record<NodeStatus, string> = {
  idle: "—",
  run: "…",
  ok: "✓",
  error: "!",
};

export default function WNode({
  status,
  icon,
  title,
  subtitle,
  width,
}: {
  status: NodeStatus;
  icon: string;
  title: string;
  subtitle: string;
  width?: number;
}) {
  const statusClass = status === "idle" ? "" : ` ${status}`;
  return (
    <div className={`wnode${statusClass}`} style={width ? { width } : undefined}>
      <div className="ic">
        <i className={`ti ti-${icon}`} aria-hidden="true" />
      </div>
      <div className="body">
        <div className="t">{title}</div>
        <div className="s">{subtitle}</div>
      </div>
      <div className="state">{STATE_GLYPH[status]}</div>
    </div>
  );
}
