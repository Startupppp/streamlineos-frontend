"use client";

import Link from "next/link";
import { CalendarCheck2, ChevronRight, GitBranch, Linkedin } from "lucide-react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { isModuleEnabled } from "@/components/layout/sidebar/sidebar-nav-items";
import type { ComponentType } from "react";

interface IntegrationCard {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const HR_INTEGRATIONS: IntegrationCard[] = [
  {
    label: "Recruitment",
    description: "Connect job boards to automatically ingest applications into the ATS.",
    href: "/settings/integrations/recruitment",
    icon: Linkedin,
  },
  {
    label: "Calendar",
    description: "Connect Google or Microsoft Outlook for interview scheduling and availability.",
    href: "/settings/integrations/calendar",
    icon: CalendarCheck2,
  },
];

const PROJECTS_INTEGRATIONS: IntegrationCard[] = [
  {
    label: "Git",
    description: "Connect GitHub, GitLab, or Bitbucket to link commits and PRs to tickets.",
    href: "/settings/integrations/git",
    icon: GitBranch,
  },
];

function IntegrationLink({ card }: { card: IntegrationCard }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 hover:bg-muted/40 transition-colors"
    >
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{card.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function SectionGroup({ label, cards }: { label: string; cards: IntegrationCard[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
        {label}
      </p>
      {cards.map((card) => (
        <IntegrationLink key={card.href} card={card} />
      ))}
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const enabledModules = session?.enabledModules ?? [];
  const hrEnabled = isModuleEnabled("hrms", enabledModules);
  const projectsEnabled = isModuleEnabled("projects", enabledModules);
  const noneEnabled = !hrEnabled && !projectsEnabled;

  return (
    <PageWrapper
      title="Integrations"
      subtitle="Connect third-party services to extend StreamlineOS"
    >
      <div className="max-w-2xl space-y-6">
        {hrEnabled && (
          <SectionGroup label="HR & Recruitment" cards={HR_INTEGRATIONS} />
        )}
        {projectsEnabled && (
          <SectionGroup label="Projects" cards={PROJECTS_INTEGRATIONS} />
        )}
        {noneEnabled && (
          <p className="text-sm text-muted-foreground">
            No integration modules are enabled.{" "}
            <Link href="/settings/modules" className="underline underline-offset-4">
              Manage modules
            </Link>{" "}
            to enable HR or Projects.
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
