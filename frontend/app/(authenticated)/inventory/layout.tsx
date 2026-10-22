import { type ReactNode } from "react";
import { RequireModule } from "@/components/auth/require-module";
import { InventoryOutboxProvider } from "@/lib/offline/outbox-provider";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/inventory");
  return (
    <RequireModule module="inventory">
      <InventoryOutboxProvider>{children}</InventoryOutboxProvider>
    </RequireModule>
  );
}
