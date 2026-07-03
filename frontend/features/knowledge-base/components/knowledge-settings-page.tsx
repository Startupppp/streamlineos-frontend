"use client";

import Link from "next/link";
import { Lock, CheckCircle, ShieldCheck, Users, ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";

type ReviewIntervalRow = {
  contentType: string;
  intervalDays: number;
  label: string;
};

const REVIEW_INTERVALS: ReviewIntervalRow[] = [
  { contentType: "Policy", intervalDays: 180, label: "Every 6 months" },
  { contentType: "SOP", intervalDays: 90, label: "Every 3 months" },
  { contentType: "Support article", intervalDays: 120, label: "Every 4 months" },
  { contentType: "Other", intervalDays: 365, label: "Yearly" },
];

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {children}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-4 py-3 border-b border-border bg-muted/20">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

function ModuleStatusSection() {
  return (
    <SectionCard>
      <SectionHeader
        title="Module status"
        description="The Knowledge module is always active and cannot be disabled."
      />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 shrink-0">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Knowledge (KB)</p>
          <p className="text-xs text-muted-foreground">Core module · Always on</p>
        </div>
        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
          Active
        </span>
      </div>
    </SectionCard>
  );
}

function ReviewIntervalsSection() {
  return (
    <SectionCard>
      <SectionHeader
        title="Default review intervals"
        description="System defaults for content freshness review cycles. Configure per-space overrides within each space's settings."
      />
      <div className="divide-y divide-border/60">
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground w-40 shrink-0">Content type</span>
          <span className="text-xs font-medium text-muted-foreground flex-1">Default interval</span>
          <span className="text-xs font-medium text-muted-foreground w-24 text-right">Days</span>
        </div>
        {REVIEW_INTERVALS.map((row) => (
          <div key={row.contentType} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-sm text-foreground w-40 shrink-0">{row.contentType}</span>
            <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
            <span className="text-sm tabular-nums text-muted-foreground w-24 text-right">
              {row.intervalDays}d
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function QuickLinksSection() {
  return (
    <SectionCard>
      <SectionHeader
        title="Related settings"
        description="Manage access and module configuration from the platform settings."
      />
      <div className="divide-y divide-border/60">
        <Link
          href="/settings/roles"
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Roles &amp; permissions</p>
            <p className="text-xs text-muted-foreground">
              Configure who can view, create, manage, and review knowledge pages.
            </p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
        </Link>
        <Link
          href="/settings/modules"
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Modules</p>
            <p className="text-xs text-muted-foreground">
              Manage which product modules are enabled for your organization.
            </p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
        </Link>
      </div>
    </SectionCard>
  );
}

export default function KnowledgeSettingsPage() {
  const canManage = useCan("kb:settings:manage");

  if (!canManage) {
    return (
      <PageWrapper title="Settings">
        <EmptyState
          illustration={<Lock className="h-8 w-8 text-muted-foreground/40" />}
          title="Access restricted"
          description="You don't have permission to view knowledge base settings."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Settings"
      subtitle="Knowledge module configuration and defaults"
    >
      <div className="space-y-4 max-w-2xl">
        <ModuleStatusSection />
        <ReviewIntervalsSection />
        <QuickLinksSection />
      </div>
    </PageWrapper>
  );
}
