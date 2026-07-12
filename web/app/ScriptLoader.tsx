"use client";

import { useEffect } from "react";

type Item = { src: string | null; inline: string | null };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load ${src}`));
    document.body.appendChild(el);
  });
}

function runInline(code: string): void {
  const el = document.createElement("script");
  el.text = code;
  document.body.appendChild(el);
}

let started = false;

export default function ScriptLoader({ items }: { items: Item[] }) {
  useEffect(() => {
    if (started) return;
    started = true;

    async function run() {
      for (const item of items) {
        try {
          if (item.src) {
            await loadScript(item.src);
          } else if (item.inline) {
            runInline(item.inline);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }

    run();
  }, [items]);

  return null;
}
