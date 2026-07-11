import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import HeroGlow from "@/components/HeroGlow";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthPage() {
  return (
    <main className="frame light">
      <div className={styles.authwrap}>
        <div className={styles.authbrand}>
          <HeroGlow blobs={["b2", "b3"]} blur="70px" opacity={0.4} />

          <div className="mark" style={{ color: "var(--moonlight)" }}>
            <Logo />
            SAYSO
          </div>
          <div>
            <div className="mono" style={{ color: "var(--buckthorn)", marginBottom: 16 }}>
              access
            </div>
            <div className={styles.demoLine}>
              &quot;For every row in this sheet, draft an email and send it.&quot;
            </div>
          </div>
          <div className="mono" style={{ color: "var(--moonlight)", opacity: 0.55 }}>
            sayso.xyz
          </div>
        </div>

        <div className={styles.authform}>
          <div className={styles.top}>
            <div className={styles.toggleRow}>
              <a href="#" className={styles.active}>
                Sign in
              </a>
              <a href="#">Create account</a>
            </div>
            <h2>Welcome back.</h2>
            <p
              className="mono"
              style={{ textTransform: "none", opacity: 0.55, fontSize: "0.85rem", marginTop: 10 }}
            >
              Sign in to pick up your workflows.
            </p>
          </div>

          <form>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="name@company.com" />
            </div>
            <div className="field">
              <label htmlFor="pw">Password</label>
              <input id="pw" type="password" placeholder="••••••••••" />
            </div>
            <Link
              href="/loading"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Sign in &rarr;
            </Link>
          </form>

          <div className={styles.rule}>or continue with</div>
          <div className={styles.oauth}>
            <button className="btn btn-ghost-light" style={{ borderColor: "var(--line)" }}>
              Google
            </button>
            <button className="btn btn-ghost-light" style={{ borderColor: "var(--line)" }}>
              Github
            </button>
          </div>

          <p
            className="mono"
            style={{ textTransform: "none", fontSize: "0.78rem", opacity: 0.55, marginTop: 32 }}
          >
            No account?{" "}
            <a href="#" style={{ color: "var(--buckthorn)", fontWeight: 700 }}>
              Create one
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
