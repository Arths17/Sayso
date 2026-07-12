"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";
import TopNav from "@/app/components/TopNav";
import DashedDivider from "@/app/components/DashedDivider";

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
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
    <main className="set_wrap">
      <TopNav />

      <section className="set_main">
        {!ready ? (
          <p className="ts-13px color-white-50 mono">Loading...</p>
        ) : (
          <>
            <header className="set_header">
              <h1 className="ts-16px color-white mono all-caps set_title">Settings</h1>
            </header>

            <DashedDivider />

            <div className="set_section">
              <h2 className="ts-13px color-white-50 mono all-caps set_section-title">Account</h2>
              <div className="set_row">
                <span className="ts-13px color-white-50">Email</span>
                <span className="ts-13px color-white">{user?.email}</span>
              </div>
              <div className="set_row">
                <span className="ts-13px color-white-50">User ID</span>
                <span className="ts-12px color-white-50 mono">{user?.uid}</span>
              </div>
            </div>

            <div className="set_section">
              <h2 className="ts-13px color-white-50 mono all-caps set_section-title">Session</h2>
              <button
                type="button"
                className="cta-button"
                onClick={async () => {
                  await signOut(auth);
                  router.push("/login");
                }}
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </section>

      <style>{`
        .set_wrap {
          min-height: 100dvh;
          background-color: var(--color--black);
        }

        .set_main {
          max-width: 42em;
          margin: 0 auto;
          padding: 7.5em 3em 4em;
        }

        .set_title {
          margin: 0;
        }

        .set_section {
          border: 1px solid var(--color--grey-800);
          background-color: var(--color--grey-900);
          padding: 1.5em 1.75em;
          margin-top: 2em;
        }

        .set_section-title {
          margin: 0 0 1.25em;
        }

        .set_row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75em 0;
          border-bottom: 1px solid var(--color--grey-800);
        }

        .set_row:last-child {
          border-bottom: none;
        }
      `}</style>
    </main>
  );
}
