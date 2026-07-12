import { getNavbarHtml } from "@/lib/server/navbar";
import DashboardClient from "./DashboardClient";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.glow} aria-hidden="true" />
      <div dangerouslySetInnerHTML={{ __html: getNavbarHtml() }} />
      <DashboardClient />
    </div>
  );
}
