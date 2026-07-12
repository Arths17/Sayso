"use client";

import Link from "next/link";
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
            <Link href="/dashboard" className="navbar-brand w-nav-brand app-nav_brand">
              <span className="ts-14px color-white mono all-caps">Sayso</span>
            </Link>

            <nav className="app-nav_tabs w-nav-menu" role="navigation">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`navbar_link app-nav_tab ${active ? "is-active" : ""}`}
                  >
                    <div className="navbar-dd_toggle app-nav_toggle">
                      <span className="navbar_link-text ts-13px">{tab.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              className="cta-button app-nav_logout"
              onClick={async () => {
                if (auth) await signOut(auth);
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
          align-items: stretch;
          gap: 0.25em;
        }

        .app-nav_tab {
          text-decoration: none;
          overflow: hidden;
          border-radius: 0.25em;
        }

        .app-nav_toggle {
          padding: 0.5em 1.125em;
          border: 1px solid transparent;
          border-radius: 0.25em;
          transition: background-color 0.25s cubic-bezier(0.645, 0.045, 0.355, 1),
            border-color 0.25s cubic-bezier(0.645, 0.045, 0.355, 1),
            transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);
        }

        .app-nav_tab .navbar_link-text {
          color: var(--color--grey-300);
          transition: color 0.2s ease;
        }

        .app-nav_tab:hover .app-nav_toggle {
          background-color: var(--color--grey-800);
          border-color: var(--color--grey-700);
          transform: translateY(-1px);
        }

        .app-nav_tab:hover .navbar_link-text {
          color: var(--color--white);
        }

        .app-nav_tab.is-active .app-nav_toggle {
          border-color: var(--color--primary-blue);
        }

        .app-nav_tab.is-active .navbar_link-text {
          color: var(--color--white);
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
