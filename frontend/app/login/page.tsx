"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, isAuthDisabled } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-md border-2 border-ink p-8 text-center">
        <h1 className="font-display text-lg font-bold text-ink">Sign in to Sayso</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {isAuthDisabled()
            ? "Auth is disabled in this environment — you're already signed in as a dev user."
            : "Use your Google account to build and run workflows."}
        </p>
        {!isAuthDisabled() && (
          <Button onClick={handleSignIn} disabled={loading} className="mt-6 w-full">
            {loading ? "Signing in…" : "Continue with Google"}
          </Button>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </div>
    </main>
  );
}
