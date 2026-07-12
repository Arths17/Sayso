"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const TABS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Workflows", href: "/workflows" },
  { label: "Executions", href: "/executions" },
  { label: "Integrations", href: "/integrations" },
  { label: "Settings", href: "/settings" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="app-navbar" id="app-navigation" role="banner">
      <div className="padding-global mob_no-padd">
        <div className="container-1400 w-container">
          <div className="w-layout-hflex navbar_layout app-nav_layout">
            <a href="/dashboard" className="navbar-brand w-nav-brand app-nav_brand">
              <span className="ts-14px color-white mono all-caps">Sayso</span>
            </a>

            <nav className="app-nav_tabs" role="navigation">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <a
                    key={tab.href}
                    href={tab.href}
                    className={`app-nav_tab ${active ? "is-active" : ""}`}
                  >
                    <span className="ts-13px">{tab.label}</span>
                  </a>
                );
              })}
            </nav>

            <button
              type="button"
              className="cta-button app-nav_logout"
              onClick={async () => {
                await signOut(auth);
                router.push("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .app-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 500;
          background-color: var(--color--black);
          border-bottom: 1px solid var(--color--grey-800);
        }

        .app-nav_layout {
          align-items: center;
          justify-content: space-between;
          padding: 1.25em 0;
          background-color: transparent !important;
          backdrop-filter: none !important;
        }

        .app-nav_brand {
          text-decoration: none;
        }

        .app-nav_tabs {
          display: flex;
          align-items: center;
          gap: 0.5em;
        }

        .app-nav_tab {
          padding: 0.5em 0.875em;
          color: var(--color--grey-300);
          text-decoration: none;
          border: 1px solid transparent;
          transition: color 0.15s, border-color 0.15s;
        }

        .app-nav_tab:hover {
          color: var(--color--white);
          border-color: var(--color--grey-800);
        }

        .app-nav_tab.is-active {
          color: var(--color--white);
          border-color: var(--color--primary-blue);
        }

        .app-nav_logout {
          border: 1px solid var(--color--grey-700);
          background-color: transparent;
          cursor: pointer;
        }

        .app-nav_logout:hover {
          background-color: var(--color--grey-800);
        }

        @media (max-width: 768px) {
          .app-nav_layout {
            flex-wrap: wrap;
            gap: 1em;
          }

          .app-nav_tabs {
            order: 3;
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
