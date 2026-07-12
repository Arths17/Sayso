import { getNavbarHtml } from "@/lib/server/navbar";
import ForgotPasswordClient from "./ForgotPasswordClient";

export default function ForgotPasswordPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: getNavbarHtml() }} />
      <ForgotPasswordClient />
    </>
  );
}
