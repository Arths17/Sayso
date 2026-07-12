"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { isAuthDisabled, signOut } from "@/lib/firebase";

export function NavBar() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between border-b-2 border-ink px-6 py-4">
      <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
        Sayso
      </Link>
      <nav className="flex items-center gap-6 text-sm font-medium text-ink-muted">
        <Link href="/dashboard" className="transition-colors hover:text-accent">
          Dashboard
        </Link>
        {user || isAuthDisabled() ? (
          !isAuthDisabled() && (
            <button onClick={() => signOut()} className="transition-colors hover:text-accent">
              Sign out
            </button>
          )
        ) : (
          <Link href="/login" className="transition-colors hover:text-accent">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
