"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Warehouse, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fadeUp } from "@/lib/motion-variants";
import { useSetDefaultWarehouse } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import Link from "next/link";

export interface WarehouseCardData {
  id: number;
  name: string;
  code: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isDefault: boolean;
  isActive: boolean;
  locations?: unknown[];
  _count?: { locations: number };
}

export const WarehouseCard = memo(function WarehouseCard({ warehouse }: { warehouse: WarehouseCardData }) {
  const shouldReduceMotion = useReducedMotion();
  const setDefault = useSetDefaultWarehouse();
  const locationCount =
    warehouse._count?.locations ??
    (Array.isArray(warehouse.locations) ? warehouse.locations.length : 0);
  const cityLine = [warehouse.city, warehouse.state, warehouse.country]
    .filter(Boolean)
    .join(", ");

  const handleSetDefault = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDefault.mutate(
        { warehouseId: warehouse.id },
        {
          onSuccess: () => toast.success("Default warehouse updated"),
          onError: (err: unknown) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [setDefault, warehouse.id],
  );

  return (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
      <Link href={`/inventory/warehouses/${warehouse.id}`} className="block group">
        <Card className="cursor-pointer transition-shadow duration-200 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <Warehouse className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {warehouse.name}
                    </span>
                    {warehouse.isDefault && (
                      <Badge
                        variant="outline"
                        className="h-4 text-[9px] px-1.5 py-0 bg-primary/10 text-foreground border-primary/20"
                      >
                        Default
                      </Badge>
                    )}
                    {!warehouse.isActive && (
                      <Badge
                        variant="outline"
                        className="h-4 text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border"
                      >
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                    {warehouse.code}
                  </p>
                  {cityLine && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{cityLine}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {locationCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {locationCount === 1 ? "location" : "locations"}
                </p>
              </div>
            </div>
            {!warehouse.isDefault && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleSetDefault}
                  disabled={setDefault.isPending}
                  aria-label={`Set ${warehouse.name} as default warehouse`}
                >
                  <Star className="h-3 w-3" aria-hidden="true" />
                  {setDefault.isPending ? "Updating…" : "Set as Default"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
});
