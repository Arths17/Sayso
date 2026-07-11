"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/builder", label: "Builder" },
  { href: "/connectors", label: "Connectors" },
  { href: "/runs", label: "Runs" },
];

export default function NavBar({ accountLabel = "Account" }: { accountLabel?: string }) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <div className="mark">
        <Logo />
        SAYSO
      </div>
      <div className="navlinks">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={active ? { opacity: 1, borderBottom: "1px solid var(--buckthorn)", paddingBottom: 4 } : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <Link href="/auth" className="btn btn-ghost-dark" style={{ borderColor: "var(--line-dark)", padding: "10px 18px" }}>
        {accountLabel}
      </Link>
    </nav>
  );
}
