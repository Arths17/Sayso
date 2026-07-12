import fs from "fs";
import path from "path";
import DashboardClient from "./DashboardClient";
import styles from "./dashboard.module.css";

const navbarHtml = fs.readFileSync(
  path.join(process.cwd(), "app", "dashboard", "navbar.html"),
  "utf8",
);

export default function DashboardPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.glow} aria-hidden="true" />
      <div dangerouslySetInnerHTML={{ __html: navbarHtml }} />
      <DashboardClient />
    </div>
  );
}
