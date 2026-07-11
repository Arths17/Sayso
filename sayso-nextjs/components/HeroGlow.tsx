import type { CSSProperties } from "react";

type HeroGlowProps = {
  /** Which of the four blobs to render. Defaults to all four (full hero treatment). */
  blobs?: Array<"b1" | "b2" | "b3" | "b4">;
  /** Blur radius on each blob. */
  blur?: string;
  /** Base opacity of the glow layer. */
  opacity?: number;
  /** One full drift cycle, in seconds (each blob offsets from this). */
  speed?: string;
  /** Strength of the noise overlay. */
  grainOpacity?: number;
};

/**
 * Reusable animated background for an opening/hero section.
 * Drop this as the FIRST child inside any position:relative container
 * (the shared .frame class already sets position:relative). Everything
 * placed after it in the same container automatically layers on top,
 * via the ".hero-glow ~ *" sibling rule in globals.css — no need to
 * hand-tag every child with z-index.
 *
 * Purely decorative: aria-hidden, pointer-events:none, and every
 * animation is skipped under prefers-reduced-motion (see globals.css).
 */
export default function HeroGlow({
  blobs = ["b1", "b2", "b3", "b4"],
  blur,
  opacity,
  speed,
  grainOpacity,
}: HeroGlowProps) {
  const style: CSSProperties & Record<string, string> = {};
  if (blur) style["--glow-blur"] = blur;
  if (opacity !== undefined) style["--glow-opacity"] = String(opacity);
  if (speed) style["--glow-speed"] = speed;
  if (grainOpacity !== undefined) style["--grain-opacity"] = String(grainOpacity);

  return (
    <div className="hero-glow" aria-hidden="true" style={style}>
      {blobs.map((b) => (
        <span key={b} className={`blob ${b}`} />
      ))}
      <span className="grain" />
    </div>
  );
}
