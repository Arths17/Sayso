"use client";

import { useReveal } from "@/lib/hooks/useReveal";

/**
 * Splits text into per-word spans that stagger in on scroll — a hand-built
 * replacement for GSAP's SplitText, scoped to exactly what the landing page
 * needs (no plugin, no vendored code).
 */
export function SplitLines({ text, className = "" }: { text: string; className?: string }) {
  const ref = useReveal<HTMLSpanElement>();
  const words = text.split(" ");

  return (
    <span ref={ref} className={`split-lines ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="split-word" style={{ transitionDelay: `${i * 35}ms` }}>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
