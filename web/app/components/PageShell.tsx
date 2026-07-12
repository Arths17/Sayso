"use client";

import type { ReactNode } from "react";
import TopNav from "@/app/components/TopNav";
import DashedDivider from "@/app/components/DashedDivider";

interface PageShellProps {
  eyebrow: string;
  title: string;
  dek?: string;
  action?: ReactNode;
  narrow?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export default function PageShell({
  eyebrow,
  title,
  dek,
  action,
  narrow = false,
  loading = false,
  children,
}: PageShellProps) {
  return (
    <main className="app-shell">
      <div className="app-wash" />
      <TopNav />

      <div className={`app-body${narrow ? " is--narrow" : ""}`}>
        <div className="padding-global">
          <div className="container-1400">
            {loading ? (
              <p className="ts-13px mono app-loading">Loading...</p>
            ) : (
              <>
                <header className="app-head">
                  <span className="gray_span app-eyebrow">{eyebrow}</span>
                  <div className="app-headline">
                    <h1 className="h3-60px">{title}</h1>
                    {action}
                  </div>
                  {dek && <p className="ts-16px app-dek">{dek}</p>}
                </header>

                <DashedDivider />

                {children}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
