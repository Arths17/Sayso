const MAIN_PATH = "M200,24 L200,92 L200,160";
const LEFT_PATH = "M200,160 L108,230";
const RIGHT_PATH = "M200,160 L292,230";

export function DagHero() {
  return (
    <svg
      viewBox="0 0 400 260"
      className="h-auto w-full max-w-md text-ink"
      role="img"
      aria-label="Diagram of a trigger flowing into an extraction step, a conditional check, and two branching outcomes"
    >
      <path d={MAIN_PATH} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d={LEFT_PATH} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d={RIGHT_PATH} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />

      <circle
        className="dag-pulse dag-pulse-1"
        r="5"
        fill="var(--accent)"
        style={{ offsetPath: `path("${MAIN_PATH}")` }}
      />
      <circle
        className="dag-pulse dag-pulse-2"
        r="4"
        fill="var(--accent)"
        style={{ offsetPath: `path("${LEFT_PATH}")` }}
      />
      <circle
        className="dag-pulse dag-pulse-3"
        r="4"
        fill="var(--accent)"
        style={{ offsetPath: `path("${RIGHT_PATH}")` }}
      />

      <rect x="150" y="6" width="100" height="36" rx="18" fill="currentColor" />
      <text x="200" y="29" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--bg)">
        trigger
      </text>

      <rect x="150" y="74" width="100" height="36" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="200" y="97" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        extract
      </text>

      <rect
        x="150"
        y="142"
        width="100"
        height="36"
        rx="6"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
      />
      <text x="200" y="165" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        amount &gt; 5k?
      </text>

      <rect x="58" y="212" width="100" height="36" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="108" y="235" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        approve
      </text>

      <rect x="242" y="212" width="100" height="36" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="292" y="235" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        notify
      </text>
    </svg>
  );
}
