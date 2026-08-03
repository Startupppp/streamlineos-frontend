import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";

const ACCOUNTING_ROLES: ReadonlyArray<string> = ["OWNER", "FINAL", "HR"];

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuth();
  const role = session?.user?.role;
  const isOrgOwner = session?.user?.isOrgOwner ?? false;

  if (!session?.user) 
    redirect(signInPathForMissingSession());
  

  if (isOrgOwner) 
    return <>{children}</>;
  

  if (!role || !ACCOUNTING_ROLES.includes(role)) 
    redirect("/dashboard");
  

  return <>{children}</>;
}
