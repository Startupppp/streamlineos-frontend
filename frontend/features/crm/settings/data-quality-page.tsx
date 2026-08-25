"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Building2, Clock, AlertCircle, ClipboardList } from "lucide-react";
import { MailIcon, PhoneIcon, UsersIcon, UserXIcon } from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyChartIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import {
  useCrmDataQuality,
  type DataQualityAggregate,
  type DataQualityOffender,
  type DataQualityReport,
} from "@/hooks/api/crm/data-quality";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

function severityClass(n: number): string {
  if (n === 0) return "bg-status-success-surface border-status-success-rule text-status-success-ink";
  if (n < 10) return "bg-status-warning-surface border-status-warning-rule text-status-warning-ink";
  return "bg-status-danger-surface border-status-danger-rule text-status-danger-ink";
}

function badgeVariant(n: number): "default" | "secondary" | "destructive" {
  if (n === 0) return "secondary";
  if (n < 10) return "default";
  return "destructive";
}

type CardIconDef =
  | { kind: "animated"; renderIcon: (ref: React.RefObject<IconHandle | null>) => React.ReactNode }
  | { kind: "static"; renderIcon: () => React.ReactNode };

interface AggregateCardProps {
  label: string;
  aggregate: DataQualityAggregate;
  iconDef: CardIconDef;
  entityType: "lead" | "deal" | "company" | "multi";
}

function offenderHref(
  entityType: AggregateCardProps["entityType"],
  id: DataQualityOffender["id"],
  name: string,
): string {
  if (entityType === "lead") return `/crm/leads/${id}`;
  if (entityType === "deal") return `/crm/deals/${id}`;
  if (entityType === "company") return `/crm/companies/${id}`;
  return `/crm/leads?search=${encodeURIComponent(name)}`;
}

function AggregateCard({ label, aggregate, iconDef, entityType }: AggregateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleToggle() {
    if (aggregate.count > 0) setExpanded((v) => !v);
  }

  function handleLinkClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const icon =
    iconDef.kind === "animated" ? iconDef.renderIcon(iconRef) : iconDef.renderIcon();

  return (
    <Card
      className={cn(
        "p-4 border rounded-xl cursor-pointer transition-shadow hover:shadow-md select-none",
        severityClass(aggregate.count),
      )}
      onClick={handleToggle}
      {...hoverHandlers}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Badge variant={badgeVariant(aggregate.count)} className="text-xs">
          {aggregate.count}
        </Badge>
      </div>
      <AnimatePresence>
        {expanded && aggregate.offenders.length > 0 && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-2 space-y-1 overflow-hidden"
          >
            {aggregate.offenders.map((o) => (
              <li key={String(o.id)} className="text-xs truncate">
                <Link
                  href={offenderHref(entityType, o.id, o.name)}
                  className="underline underline-offset-2 hover:opacity-75"
                  onClick={handleLinkClick}
                >
                  {o.name}
                </Link>
                {o.detail && <span className="ml-1 opacity-60">— {o.detail}</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </Card>
  );
}

type CardConfig = Omit<AggregateCardProps, "aggregate"> & { key: keyof DataQualityReport };

const CARD_CONFIGS: CardConfig[] = [
  {
    key: "leadsWithoutEmail",
    label: "Leads without email",
    iconDef: { kind: "animated", renderIcon: (ref) => <MailIcon ref={ref} size={18} /> },
    entityType: "lead",
  },
  {
    key: "leadsWithInvalidPhone",
    label: "Invalid phone numbers",
    iconDef: { kind: "animated", renderIcon: (ref) => <PhoneIcon ref={ref} size={18} /> },
    entityType: "lead",
  },
  {
    key: "duplicateLeads",
    label: "Duplicate leads",
    iconDef: { kind: "animated", renderIcon: (ref) => <UsersIcon ref={ref} size={18} /> },
    entityType: "multi",
  },
  {
    key: "duplicateCompanies",
    label: "Duplicate companies",
    iconDef: { kind: "static", renderIcon: () => <Building2 size={18} /> },
    entityType: "company",
  },
  {
    key: "staleDeals",
    label: "Stale deals (30d)",
    iconDef: { kind: "static", renderIcon: () => <Clock size={18} /> },
    entityType: "deal",
  },
  {
    key: "dealsWithNoNextActivity",
    label: "Deals with no recent activity",
    iconDef: { kind: "static", renderIcon: () => <AlertCircle size={18} /> },
    entityType: "deal",
  },
  {
    key: "leadsWithNoOwner",
    label: "Leads without owner",
    iconDef: { kind: "animated", renderIcon: (ref) => <UserXIcon ref={ref} size={18} /> },
    entityType: "lead",
  },
  {
    key: "dealsMissingStageFields",
    label: "Deals missing stage fields",
    iconDef: { kind: "static", renderIcon: () => <ClipboardList size={18} /> },
    entityType: "deal",
  },
];

export function DataQualityPage() {
  const { data, isLoading, error, refetch } = useCrmDataQuality();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Data Quality" subtitle="CRM data health overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper title="Data Quality" subtitle="CRM data health overview">
        <ErrorState
          title="Couldn't load the data quality report"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const allClean = CARD_CONFIGS.every((cfg) => data[cfg.key].count === 0);

  if (allClean) {
    return (
      <PageWrapper title="Data Quality" subtitle="CRM data health overview">
        <EmptyState
          illustration={<EmptyChartIllustration />}
          title="Your CRM data is clean"
          description="Every check passed — no missing emails or phone numbers, no duplicates, no stale or unassigned records."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Data Quality" subtitle="Review and fix data health issues in your CRM">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CARD_CONFIGS.map((cfg) => (
          <AggregateCard
            key={cfg.key}
            label={cfg.label}
            iconDef={cfg.iconDef}
            entityType={cfg.entityType}
            aggregate={data[cfg.key]}
          />
        ))}
      </div>
    </PageWrapper>
  );
}
