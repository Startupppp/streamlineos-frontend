"use client";

import * as React from "react";
import { useInventoryPacks, type InventoryPacks } from "@/hooks/api/inventory/admin";

export type InventoryPackName = keyof InventoryPacks;

/**
 * E1 — the one place a pack decides whether a surface exists.
 *
 * A pack is off until an organisation turns it on, so anything a pack owns —
 * a nav entry, a form field, a validation rule, a whole route — has to ask.
 * Doing that with an inline `settings?.packPharmacy` in every component means
 * two things go wrong: the check reads the administration endpoint, which most
 * inventory users cannot call, and a component that forgets the check renders a
 * field that means nothing to the operator in front of it.
 *
 * The default while loading is **off**. A pack-owned field that flashes into
 * existence and then disappears is worse than one that arrives a moment late,
 * and `packs.warehouse` — the only one that is on by default — is not a field
 * gate but a product one.
 */
export function useInventoryPack(pack: InventoryPackName): boolean {
  const { data } = useInventoryPacks();
  return data?.[pack] ?? false;
}

export function usePackFlags(): InventoryPacks {
  const { data } = useInventoryPacks();
  return (
    data ?? { warehouse: true, kirana: false, pharmacy: false, gst: false }
  );
}

interface PackGateProps {
  pack: InventoryPackName;
  children: React.ReactNode;
  /** Rendered when the pack is off. Almost always nothing — the field does not exist. */
  fallback?: React.ReactNode;
}

/**
 * Renders `children` only when `pack` is enabled for this organisation.
 *
 * Deliberately renders `null` rather than an explanation when the pack is off:
 * a pharmacy field is not "unavailable" to a distributor, it is irrelevant, and
 * telling them about a pack they do not run is noise. This is not a permission
 * gate — denied still means `NoPermissionState`, and the two are different
 * answers.
 */
export function PackGate({ pack, children, fallback = null }: PackGateProps) {
  const enabled = useInventoryPack(pack);
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}
