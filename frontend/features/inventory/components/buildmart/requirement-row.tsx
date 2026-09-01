"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Lock, Package, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useReleaseRequirement, useReserveRequirement } from "@/hooks/api/inventory/projects";
import type { ProjectRequirement } from "@/hooks/api/inventory/projects";
import { AtRiskBadge, RequirementStatusBadge } from "./requirement-status";

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

/**
 * B1 — one material line, and the two things anybody does to it.
 *
 * "Reserve Stock" holds material out of the dark store that will serve the site;
 * "Release Reservation" gives it back. Both are confirmed rather than fired on a
 * single click, because both change what every other order can be promised — and
 * both show the four quantities beside the button so the operator is not
 * subtracting in their head.
 */
export function RequirementRow({
  requirement,
  projectId,
}: {
  requirement: ProjectRequirement;
  projectId: number;
}) {
  const canReserve = useCan("inventory:stock:reserve");
  const reserve = useReserveRequirement();
  const release = useReleaseRequirement();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const c = requirement.coverage;
  const shortfall = c?.shortfallQty ?? 0;
  const available = c?.availableQty ?? 0;
  const reserved = c?.reservedQty ?? 0;
  const [qty, setQty] = useState(String(shortfall));

  const canCover = available >= shortfall && shortfall > 0;
  const reserveBlockedReason =
    shortfall <= 0
      ? "This line is already fully reserved or delivered."
      : !canCover
        ? `Only ${nf.format(available)} is available${requirement.warehouseName ? ` at ${requirement.warehouseName}` : ""}, and ${nf.format(shortfall)} is still needed. Transfer stock in first.`
        : null;

  return (
    <li className="list-none rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {requirement.imageUrl ? (
            <Image
              src={requirement.imageUrl}
              alt={`${requirement.productName}, ${requirement.variantSku}`}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              loading="lazy"
              unoptimized
            />
          ) : (
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{requirement.productName}</span>
            <RequirementStatusBadge status={requirement.status} />
            <AtRiskBadge reason={c?.atRisk ? c.riskReason : null} />
          </div>
          <p className="mt-0.5 text-dense text-muted-foreground">
            <span className="font-mono">{requirement.variantSku}</span>
            {requirement.brand ? ` · ${requirement.brand}` : ""}
            {requirement.materialGrade ? ` · ${requirement.materialGrade}` : ""}
            {requirement.dimensionLabel ? ` · ${requirement.dimensionLabel}` : ""}
          </p>
          <p className="mt-0.5 text-dense text-muted-foreground">
            {requirement.warehouseName ? `From ${requirement.warehouseName}` : "Store not yet chosen"}
            {requirement.requiredBy ? ` · needed ${requirement.requiredBy}` : ""}
            {requirement.leadTimeDays != null ? ` · ${requirement.leadTimeDays}-day lead time` : ""}
          </p>
        </div>

        <dl className="grid shrink-0 grid-cols-4 gap-x-4 text-right">
          {[
            ["Required", requirement.requiredQty],
            ["Reserved", reserved],
            ["Delivered", requirement.fulfilledQty],
            ["Short", shortfall],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-micro text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">{nf.format(Number(value))}</dd>
            </div>
          ))}
        </dl>
      </div>

      {canReserve ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={reserveBlockedReason !== null || reserve.isPending}
            title={reserveBlockedReason ?? undefined}
            onClick={() => {
              setQty(String(shortfall));
              setReserveOpen(true);
            }}
          >
            <Lock className="h-3 w-3" aria-hidden="true" />
            {reserve.isPending ? "Reserving…" : "Reserve Stock"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={reserved <= 0 || release.isPending}
            title={reserved <= 0 ? "Nothing is held for this line." : undefined}
            onClick={() => setReleaseOpen(true)}
          >
            <Unlock className="h-3 w-3" aria-hidden="true" />
            {release.isPending ? "Releasing…" : "Release Reservation"}
          </Button>
          {reserveBlockedReason ? (
            <p className="text-dense text-muted-foreground">{reserveBlockedReason}</p>
          ) : null}
        </div>
      ) : null}

      <AppDialog
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        title="Reserve stock for this site"
        description={`Holding material takes it out of what anybody else can be promised. ${nf.format(available)} is available${requirement.warehouseName ? ` at ${requirement.warehouseName}` : ""}.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReserveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={reserve.isPending || Number(qty) <= 0 || Number(qty) > shortfall}
              onClick={() =>
                reserve.mutate(
                  { projectId, requirementId: requirement.id, qty },
                  {
                    onSuccess: () => {
                      toast.success(`Reserved ${nf.format(Number(qty))} for ${requirement.productName}`);
                      setReserveOpen(false);
                    },
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                )
              }
            >
              {reserve.isPending ? "Reserving…" : "Confirm Reservation"}
            </Button>
          </div>
        }
      >
        <label className="block text-sm font-medium text-foreground" htmlFor={`qty-${requirement.id}`}>
          Quantity to hold
        </label>
        <Input
          id={`qty-${requirement.id}`}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="decimal"
          className="mt-1.5"
          aria-describedby={`qty-help-${requirement.id}`}
        />
        <p id={`qty-help-${requirement.id}`} className="mt-1.5 text-dense text-muted-foreground">
          Up to {nf.format(shortfall)} — the amount still outstanding on this line.
        </p>
      </AppDialog>

      <AppDialog
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        title="Release this reservation"
        description={`${nf.format(reserved)} will go back into available stock and can be promised to anybody else.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReleaseOpen(false)}>
              Keep the hold
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={release.isPending}
              onClick={() =>
                release.mutate(
                  { projectId, requirementId: requirement.id },
                  {
                    onSuccess: (r) => {
                      toast.success(`Released ${r.released} reservation${r.released === 1 ? "" : "s"}`);
                      setReleaseOpen(false);
                    },
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                )
              }
            >
              {release.isPending ? "Releasing…" : "Release Reservation"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          The site will show as short again until the material is held or delivered.
        </p>
      </AppDialog>
    </li>
  );
}
