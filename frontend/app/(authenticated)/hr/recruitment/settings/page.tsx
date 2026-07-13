"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import {
  Workflow, ClipboardList, BookOpen, Zap, Clock, Mail, FileSignature,
  BarChart3, Users, PieChart, FileBarChart, type LucideIcon,
} from "lucide-react";

interface SettingsLink {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

interface SettingsSection {
  title: string;
  links: SettingsLink[];
}

const SECTIONS: SettingsSection[] = [
  {
    title: "Hiring Process",
    links: [
      { label: "Hiring Flows", description: "Define reusable multi-round interview workflows per role.", href: "/hr/recruitment/hiring-flows", icon: Workflow },
      { label: "Scorecard Templates", description: "Evaluation criteria used by interviewers per round.", href: "/hr/recruitment/scorecard-templates", icon: ClipboardList },
      { label: "Question Bank", description: "Curated interview questions by role and difficulty.", href: "/hr/recruitment/question-bank", icon: BookOpen },
      { label: "Pipeline Automations", description: "Trigger actions automatically on pipeline events.", href: "/hr/recruitment/automations", icon: Zap },
      { label: "Interview SLAs", description: "Max hours allowed per stage before an SLA breach.", href: "/hr/recruitment/sla", icon: Clock },
    ],
  },
  {
    title: "Candidate Communication",
    links: [
      { label: "Email Sequences", description: "Automated drip campaigns to nurture candidates.", href: "/hr/recruitment/email-sequences", icon: Mail },
      { label: "Offer Letter Templates", description: "Reusable offer templates with merge placeholders.", href: "/hr/recruitment/offer-templates", icon: FileSignature },
    ],
  },
  {
    title: "Reports & Performance",
    links: [
      { label: "SLA Breach Report", description: "Monthly SLA breach rate by pipeline stage.", href: "/hr/recruitment/sla-report", icon: BarChart3 },
      { label: "Interviewer Performance", description: "Scorecard turnaround and submission rates by interviewer.", href: "/hr/recruitment/interviewer-performance", icon: Users },
      { label: "Scorecard Analytics", description: "Aggregated scorecard ratings and recommendation splits.", href: "/hr/recruitment/scorecard-analytics", icon: PieChart },
      { label: "Diversity Report", description: "Pipeline diversity breakdown across stages.", href: "/hr/recruitment/diversity-report", icon: PieChart },
      { label: "Custom Reports & Exports", description: "Build ad-hoc exports of candidates, jobs, and offers.", href: "/hr/recruitment/reports", icon: FileBarChart },
      { label: "Headcount Requests", description: "Review and approve open headcount requests.", href: "/hr/recruitment/headcount", icon: Users },
    ],
  },
];

function SettingsCard({ link }: { link: SettingsLink }) {
  const Icon = link.icon;
  return (
    <Link href={link.href}>
      <Card className="shadow-sm hover:bg-muted/40 transition-colors h-full">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-core/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{link.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function RecruitmentSettingsPage() {
  return (
    <PageWrapper
      title="Settings"
      subtitle="Configure hiring flows, scorecards, communication templates, and reports for TalentOS."
    >
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {section.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.links.map((link) => <SettingsCard key={link.href} link={link} />)}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
