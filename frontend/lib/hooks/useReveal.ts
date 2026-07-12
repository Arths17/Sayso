"use client";

import { useEffect, useRef } from "react";

/**
 * IntersectionObserver-based scroll reveal — a small hand-built replacement
 * for what GSAP ScrollTrigger did on the reference site. Toggles
 * data-visible, actual motion lives in CSS (see .reveal in globals.css).
 */
export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-visible", "true");
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
