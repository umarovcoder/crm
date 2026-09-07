import CRM from "./crm-simple";
import AuthGuard from "./auth-guard";

export default function Page() {
  return <AuthGuard><CRM /></AuthGuard>;
}
