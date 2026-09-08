import CRM from "./crm-simple";
import AuthGuard from "./auth-guard";
import RoleVisibility from "./role-visibility";

export default function Page() {
  return <AuthGuard><RoleVisibility><CRM /></RoleVisibility></AuthGuard>;
}
