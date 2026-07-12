"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { isAuthDisabled } from "@/lib/firebase";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !isAuthDisabled()) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-16 text-sm text-ink-muted">Loading…</div>;
  }
  if (!user && !isAuthDisabled()) {
    return null;
  }
  return <>{children}</>;
}
