"use client";

import { useState } from "react";
import { Info, CheckCircle, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCountryPacks,
  usePayrollEntities,
  useEntityContext,
} from "@/hooks/api/payroll/entities";
import { cn } from "@/lib/utils";

const MATURITY_STYLE: Record<string, string> = {
  production_baseline:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  pilot:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  template:
    "bg-muted text-muted-foreground border-border",
};

export function EntitiesSection() {
  const { data: entities, isLoading: entitiesLoading } = usePayrollEntities();
  const { data: packs, isLoading: packsLoading } = useCountryPacks();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const entityId = selectedId ?? entities?.[0]?.id ?? null;
  const { data: context, isLoading: ctxLoading } = useEntityContext(entityId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Legal entities & country packs</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Multi-entity payroll is scoped by entity country. Statutory calc is India-first.
        </p>
      </div>

      {packsLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : packs ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground leading-snug">{packs.honestyNote}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {packs.packs.map((p) => (
              <div
                key={p.countryCode}
                className="rounded-lg border border-border bg-card p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium">
                    {p.countryName}{" "}
                    <span className="text-muted-foreground font-normal">({p.countryCode})</span>
                  </p>
                  <span
                    className={cn(
                      "text-[10px] font-medium rounded border px-1.5 py-0.5",
                      MATURITY_STYLE[p.maturity] ?? MATURITY_STYLE.template,
                    )}
                  >
                    {p.maturity.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{p.honestyLabel}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {p.currency} · {p.holidayCount} holidays · {p.complianceRequirementCount}{" "}
                  compliance seeds
                  {p.payrollStatutoryBundle
                    ? ` · statutory ${p.payrollStatutoryBundle}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {entitiesLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (entities?.length ?? 0) === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          No legal entities yet. Create one via API{" "}
          <code className="text-[11px]">POST /payroll/entities</code> (policies manage).
        </p>
      ) : (
        <div className="space-y-3">
          <div className="max-w-sm">
            <label className="text-[11px] font-medium text-muted-foreground">Entity</label>
            <Select
              value={entityId != null ? String(entityId) : undefined}
              onValueChange={(v) => setSelectedId(Number(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities!.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.legalName} ({e.countryCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ctxLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : context ? (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-semibold">{context.entity.legalName}</p>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  Readiness {context.readinessScore.percent}% (
                  {context.readinessScore.done}/{context.readinessScore.total})
                </span>
              </div>
              <div className="flex gap-2 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="leading-snug">{context.honestyNote}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">{context.isolation.note}</p>
              <ul className="divide-y divide-border border border-border rounded-md overflow-hidden">
                {context.readiness.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-start gap-2 px-2.5 py-1.5 text-[11px] bg-card"
                  >
                    {item.done ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={cn("font-medium", item.done && "text-muted-foreground")}>
                        {item.label}
                      </p>
                      <p className="text-muted-foreground">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
