import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const INVENTORY_ROLES: ReadonlyArray<string> = [
  "OWNER",
  "CEO",
  "INVENTORY_MANAGER",
  "WAREHOUSE_STAFF",
];

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const isPlatformAdmin = session.user.isPlatformAdmin ?? false;
  const isOrgOwner = session.user.isOrgOwner ?? false;

  if (isPlatformAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  const role = session.user.role;
  if (!role || !INVENTORY_ROLES.includes(role)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
