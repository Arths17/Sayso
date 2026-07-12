"use client";

import { useEffect, useRef } from "react";

const NS = "http://www.w3.org/2000/svg";
const DOT = 2;
const TARGET = 12;

function dotPositions(length: number) {
  const span = Math.max(0, length - DOT);
  const n = Math.max(1, Math.round(span / TARGET));
  const step = span / n;
  const arr: number[] = [];
  for (let i = 0; i <= n; i++) arr.push(Math.round(i * step));
  return arr;
}

export default function DottedFrame({ color = "var(--color--grey-700)" }: { color?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const draw = () => {
      const w = Math.round(wrap.offsetWidth);
      const h = Math.round(wrap.offsetHeight);
      if (!w || !h) return;

      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const addDot = (x: number, y: number) => {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("x", String(x));
        r.setAttribute("y", String(y));
        r.setAttribute("width", String(DOT));
        r.setAttribute("height", String(DOT));
        r.setAttribute("fill", color);
        r.setAttribute("shape-rendering", "crispEdges");
        svg.appendChild(r);
      };

      const xs = dotPositions(w);
      const ys = dotPositions(h);
      const lastY = ys[ys.length - 1];

      xs.forEach((x) => {
        addDot(x, 0);
        addDot(x, h - DOT);
      });

      ys.forEach((y) => {
        if (y === 0 || y === lastY) return;
        addDot(0, y);
        addDot(w - DOT, y);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [color]);

  return (
    <div ref={wrapRef} className="dotted-frame">
      <svg ref={svgRef} className="dotted-frame-svg" />
      <style>{`
        .dotted-frame {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .dotted-frame-svg {
          position: absolute;
          inset: 0;
          display: block;
        }
      `}</style>
    </div>
  );
}
