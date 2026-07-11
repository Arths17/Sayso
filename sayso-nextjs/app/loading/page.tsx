"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const STATUS_LINES = [
  "connecting accounts",
  "loading connector library",
  "restoring workflows",
  "ready",
];

function formatClock(totalSeconds: number) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function LoadingPage() {
  const router = useRouter();
  const [statusIndex, setStatusIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Cycle through status lines, then hand off to /builder once we reach "ready".
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((i) => {
        const next = i + 1;
        if (next >= STATUS_LINES.length) {
          clearInterval(interval);
          const timeout = setTimeout(() => router.push("/builder"), 500);
          return i; // hold on the last line while the redirect timeout runs
        }
        return next;
      });
    }, 550);
    return () => clearInterval(interval);
  }, [router]);

  // Progress bar, independent of the status line cadence.
  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 5;
      });
    }, 110);
    return () => clearInterval(interval);
  }, []);

  // Elapsed-time clock in the corner.
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="frame dark">
      <div className={styles.loadWrap}>
        <span className={`${styles.corner} ${styles.tl}`}>SAYSO</span>
        <span className={`${styles.corner} ${styles.tr}`}>loading workspace</span>

        <svg className={styles.markLg} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" stroke="var(--buckthorn)" strokeWidth="1.4" />
          <path
            className={styles.chev}
            d="M8 8L12 12L8 16"
            stroke="var(--moonlight)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className={styles.status}>{STATUS_LINES[statusIndex]}</div>

        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${percent}%` }} />
        </div>

        <div className={styles.pct}>{String(percent).padStart(2, "0")}%</div>

        <span className={`${styles.corner} ${styles.bl}`}>workspace / init</span>
        <span className={`${styles.corner} ${styles.br}`}>{formatClock(seconds)}</span>
      </div>
    </main>
  );
}
