"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const FADE_MS = 450;

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [covering, setCovering] = useState(false);
  const pendingHref = useRef<string | null>(null);

  useEffect(() => {
    if (pendingHref.current && pathname === pendingHref.current) {
      pendingHref.current = null;
      requestAnimationFrame(() => setCovering(false));
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (href !== "/login") return;

      e.preventDefault();
      pendingHref.current = href;
      setCovering(true);
      setTimeout(() => router.push(href), FADE_MS);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "#000",
        opacity: covering ? 1 : 0,
        pointerEvents: "none",
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    />
  );
}
