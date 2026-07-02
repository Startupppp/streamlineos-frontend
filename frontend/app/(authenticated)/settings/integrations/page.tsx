import Link from "next/link";
import { CalendarCheck2, ChevronRight, GitBranch, Linkedin } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";

const INTEGRATION_GROUPS = [
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
  {
    label: "Git",
    description: "Connect GitHub, GitLab, or Bitbucket to link commits and PRs to tickets.",
    href: "/settings/integrations/git",
    icon: GitBranch,
  },
] as const;

export default function IntegrationsPage() {
  return (
    <PageWrapper
      title="Integrations"
      subtitle="Connect third-party services to extend StreamlineOS"
    >
      <div className="max-w-2xl space-y-2">
        {INTEGRATION_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Link
              key={group.href}
              href={group.href}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{group.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{group.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
