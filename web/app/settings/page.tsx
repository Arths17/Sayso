"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import PageShell from "@/app/components/PageShell";

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) {
      router.push("/login");
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const token = await u.getIdToken();
      apiClient.setToken(token);
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  return (
    <PageShell
      eyebrow="Settings"
      title="Your account"
      dek="Account details and session controls."
      narrow
      loading={!ready}
    >
      <div className="app-section" style={{ paddingTop: 0 }}>
        <h2 className="ts-11px mono all-caps app-section-title">Account</h2>
        <div className="app-panel">
          <div className="app-panel-row">
            <span className="ts-14px color-white-50">Email</span>
            <span className="ts-14px color-white">{user?.email}</span>
          </div>
          <div className="app-panel-row">
            <span className="ts-14px color-white-50">User ID</span>
            <span className="ts-12px mono color-white-50">{user?.uid}</span>
          </div>
        </div>
      </div>

      <div className="app-section">
        <h2 className="ts-11px mono all-caps app-section-title">Session</h2>
        <button
          type="button"
          className="cta-button is--alternative"
          onClick={async () => {
            if (auth) await signOut(auth);
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </PageShell>
  );
}
