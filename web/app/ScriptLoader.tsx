"use client";

import { useEffect } from "react";

type Item = { src: string | null; inline: string | null };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => {
      console.error(`failed to load ${src}`);
      resolve();
    };
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
      let pending: Promise<void>[] = [];
      for (const item of items) {
        if (item.src) {
          pending.push(loadScript(item.src));
        } else if (item.inline) {
          await Promise.all(pending);
          pending = [];
          runInline(item.inline);
        }
      }
      await Promise.all(pending);
    }

    run();
  }, [items]);

  return null;
}
