"use client";

import { motion } from "framer-motion";
import { Plane, MapPin, Calendar, Wallet, Building } from "lucide-react";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney } from "@/lib/format-utils";
import { Card, CardContent } from "@/components/ui/card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getStatusConfig } from "./travel-status-helpers";
import type { TravelRequest } from "@/hooks/api/hr";

export function TravelCard({ request }: { request: TravelRequest }) {
  const { fadeUp } = useMotionVariants();
  const cfg = getStatusConfig(request.status);
  const money = useOrgDisplay();
  return (
    <motion.div variants={fadeUp}>
      <Card className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Plane className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <TruncatedText
                  text={request.purpose}
                  className="text-sm font-semibold text-foreground"
                />
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <TruncatedText
                    text={request.destination}
                    className="text-xs text-muted-foreground"
                  />
                </div>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border shrink-0",
                cfg.className,
              )}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(request.departureDate), "MMM d")} –{" "}
                {format(new Date(request.returnDate), "MMM d, yyyy")}
              </span>
            </div>
            {request.estimatedCost && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" />
                <span className="tabular-nums">{formatMoney(request.estimatedCost, money)}</span>
              </div>
            )}
            {request.advanceRequired && (
              <span className="inline-flex items-center gap-1 text-micro font-medium px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                <Building className="h-2.5 w-2.5" />
                Advance
              </span>
            )}
          </div>
          {request.status === "REJECTED" && request.rejectionReason && (
            <p className="mt-2 text-xs text-status-danger-ink bg-status-danger-surface rounded-lg px-2 py-1 border border-status-danger-rule">
              {request.rejectionReason}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
