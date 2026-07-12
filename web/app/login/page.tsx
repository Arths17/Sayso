import { getNavbarHtml } from "@/lib/server/navbar";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: getNavbarHtml() }} />
      <LoginClient />
    </>
  );
}
