import { getNavbarHtml } from "@/lib/server/navbar";
import AutomationClient from "./AutomationClient";
import styles from "./automation.module.css";

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className={styles.shell}>
      <div className={styles.glow} aria-hidden="true" />
      <div dangerouslySetInnerHTML={{ __html: getNavbarHtml() }} />
      <AutomationClient workflowId={id} />
    </div>
  );
}
