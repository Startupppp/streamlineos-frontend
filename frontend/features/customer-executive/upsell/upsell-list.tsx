"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Trash2,
  IndianRupee,
  CalendarDays,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import type { ClientOpportunity } from "@/hooks/api/crm";

type OppStage = "identified" | "proposed" | "negotiating" | "won" | "lost";

const STAGES: {
  id: OppStage;
  label: string;
  headerBg: string;
  badgeClass: string;
  dot: string;
}[] = [
  {
    id: "identified",
    label: "Identified",
    headerBg: "bg-blue-500",
    badgeClass: "text-blue-700 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "proposed",
    label: "Proposed",
    headerBg: "bg-amber-500",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  {
    id: "negotiating",
    label: "Negotiating",
    headerBg: "bg-violet-500",
    badgeClass: "text-violet-700 bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
  {
    id: "won",
    label: "Won",
    headerBg: "bg-emerald-500",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "lost",
    label: "Lost",
    headerBg: "bg-red-500",
    badgeClass: "text-red-700 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
];

export { STAGES };
export type { OppStage };

export function formatInrShort(value: string | null | undefined): string {
  if (!value) return "—";
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "—";
  if (num >= 1_00_00_000) return `₹${(num / 1_00_00_000).toFixed(2)}Cr`;
  if (num >= 1_00_000) return `₹${(num / 1_00_000).toFixed(2)}L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

interface OppCardProps {
  opp: ClientOpportunity;
  onStageChange: (id: number, stage: OppStage) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}

function OppCard({ opp, onStageChange, onDelete, isPending }: OppCardProps) {
  const stageCfg = STAGES.find((s) => s.id === opp.stage) ?? STAGES[0];

  const handleStageChange = (v: string) => onStageChange(opp.id, v as OppStage);
  const handleDelete = () => onDelete(opp.id);

  return (
    <motion.div variants={fadeUp}>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">
                {opp.title}
              </p>
              {opp.client?.name && (
                <p className="text-xs text-muted-foreground truncate">
                  {opp.client.name}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] shrink-0 capitalize whitespace-nowrap",
                stageCfg.badgeClass,
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full mr-1 inline-block",
                  stageCfg.dot,
                )}
              />
              {stageCfg.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px]",
                opp.type === "upsell"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700",
              )}
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {opp.type === "upsell" ? "Upsell" : "Cross-sell"}
            </Badge>
          </div>

          {opp.value && (
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              {formatInrShort(opp.value)}
            </div>
          )}

          {opp.expectedCloseDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {new Date(opp.expectedCloseDate).toLocaleDateString("en-IN")}
            </div>
          )}

          <Select
            value={opp.stage}
            onValueChange={handleStageChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Move to stage…" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface KanbanColumnProps {
  stage: (typeof STAGES)[number];
  opps: ClientOpportunity[];
  onStageChange: (id: number, stage: OppStage) => void;
  onDelete: (id: number) => void;
  mutatingId: number | null;
}

function KanbanColumn({
  stage,
  opps,
  onStageChange,
  onDelete,
  mutatingId,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[260px] flex-1">
      <div className="rounded-t-lg overflow-hidden">
        <div
          className={cn(
            "px-3 py-2 flex items-center justify-between",
            stage.headerBg,
          )}
        >
          <span className="text-white font-semibold text-sm">
            {stage.label}
          </span>
          <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {opps.length}
          </span>
        </div>
      </div>

      <motion.div
        className="flex flex-col gap-2 min-h-[120px]"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {opps.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No opportunities
          </div>
        )}
        {opps.map((opp) => (
          <OppCard
            key={opp.id}
            opp={opp}
            onStageChange={onStageChange}
            onDelete={onDelete}
            isPending={mutatingId === opp.id}
          />
        ))}
      </motion.div>
    </div>
  );
}

interface UpsellListProps {
  opps: ClientOpportunity[];
  isLoading: boolean;
  mutatingId: number | null;
  onStageChange: (id: number, stage: OppStage) => void;
  onDelete: (id: number) => void;
}

export function UpsellList({
  opps,
  isLoading,
  mutatingId,
  onStageChange,
  onDelete,
}: UpsellListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pb-4">
        {STAGES.map((s) => (
          <div key={s.id} className="min-w-[260px] flex-1 space-y-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pb-4">
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          opps={opps.filter((o) => o.stage === stage.id)}
          onStageChange={onStageChange}
          onDelete={onDelete}
          mutatingId={mutatingId}
        />
      ))}
    </div>
  );
}

export function sumValues(opps: ClientOpportunity[]): number {
  return opps.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
}

export { TrendingUp, IndianRupee };
