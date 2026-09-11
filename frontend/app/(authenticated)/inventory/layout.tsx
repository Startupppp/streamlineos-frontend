import { type ReactNode } from "react";
import { RequireModule } from "@/components/auth/require-module";
import { InventoryOutboxProvider } from "@/lib/offline/outbox-provider";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

/**
 * The outbox provider is mounted here, around every inventory route.
 *
 * It was written and never rendered: `useInventoryOutbox` returns
 * `isAvailable: false` outside a provider, so the RF shell's badge, the scan
 * field's offline hint and the barcode tool's online check all read "no queue"
 * for good. A scanner that loses the LAN mid-pick captured nothing.
 *
 * At the layout, not at the RF routes: the bench screens that enqueue -- scan,
 * receive, putaway -- are not under `/inventory/rf`, and a queue that only
 * exists on some of the screens that write to it is worse than none.
 */
export default async function InventoryLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/inventory");
  return (
    <RequireModule module="inventory">
      <InventoryOutboxProvider>{children}</InventoryOutboxProvider>
    </RequireModule>
  );
}
