export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
      <rect x="2" y="2" width="20" height="20" rx="3" stroke="var(--buckthorn)" strokeWidth="1.6" />
      <path
        d="M8 8L12 12L8 16"
        stroke="var(--moonlight)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
