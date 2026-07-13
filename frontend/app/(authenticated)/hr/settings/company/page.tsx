"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";

const LINKS = [
  {
    title: "Organization Profile",
    description: "Configure company name, logo, and address",
    href: "/settings",
  },
  {
    title: "Fiscal & Work Year",
    description: "Define financial year boundaries and public holidays via HR policies",
    href: "/hr/settings/policies",
  },
  {
    title: "Work Week & Shifts",
    description: "Define working days and hours via shift roster policies",
    href: "/hr/settings/policies",
  },
] as const;

export default function CompanyHrProfilePage() {
  return (
    <PageWrapper
      title="Company HR Profile"
      subtitle="Organization-level HR configuration"
    >
      <div className="py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LINKS.map((item) => (
            <Link key={item.title} href={item.href}>
              <div className="bg-card border border-border rounded-xl shadow-sm p-4 hover:border-primary/50 hover:shadow-md transition-all group flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
