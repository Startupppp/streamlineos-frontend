"use client";

import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  ReceiptText,
  Headphones,
  ClipboardList,
  FolderOpen,
  FileBadge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import type { Customer360Response, Customer360SectionItem } from "@/types/crm";
import type { StatTone } from "@/components/ui/stat-card";

interface SectionConfig {
  key: keyof Customer360Response;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: (item: Customer360SectionItem) => string;
  getLabel: (item: Customer360SectionItem) => string;
  statTone?: StatTone;
}

const SECTION_CONFIG: SectionConfig[] = [
  {
    key: "contacts",
    title: "Contacts",
    icon: Users,
    href: (item) => `/crm/contacts/${item.id}`,
    getLabel: (item) => String(item["name"] ?? item.id),
    statTone: "blue",
  },
  {
    key: "leads",
    title: "Leads",
    icon: TrendingUp,
    href: (item) => `/crm/leads/${item.id}`,
    getLabel: (item) => String(item["name"] ?? item.id),
    statTone: "amber",
  },
  {
    key: "deals",
    title: "Deals",
    icon: DollarSign,
    href: (item) => `/crm/deals/${item.id}`,
    getLabel: (item) => String(item["name"] ?? item.id),
    statTone: "emerald",
  },
  {
    key: "quotes",
    title: "Quotes",
    icon: FileText,
    href: (item) => `/crm/quotes/${item.id}`,
    getLabel: (item) => String(item["subject"] ?? item["quoteNumber"] ?? item.id),
  },
  {
    key: "invoices",
    title: "Invoices",
    icon: ReceiptText,
    href: (item) => `/crm/invoices/${item.id}`,
    getLabel: (item) => String(item["invoiceNumber"] ?? item.id),
  },
  {
    key: "payments",
    title: "Payments",
    icon: DollarSign,
    href: (item) => `/crm/payments/${item.id}`,
    getLabel: (item) => `Payment #${item.id}`,
  },
  {
    key: "supportTickets",
    title: "Support Tickets",
    icon: Headphones,
    href: (item) => `/support/tickets/${item.id}`,
    getLabel: (item) => String(item["title"] ?? item.id),
    statTone: "red",
  },
  {
    key: "surveys",
    title: "Surveys",
    icon: ClipboardList,
    href: (item) => `/crm/surveys/${item.id}`,
    getLabel: (item) => String(item["title"] ?? item.id),
  },
  {
    key: "projects",
    title: "Projects",
    icon: FolderOpen,
    href: (item) => `/build/${item.id}`,
    getLabel: (item) => String(item["name"] ?? item.id),
    statTone: "blue",
  },
  {
    key: "signedDocuments",
    title: "Signed Documents",
    icon: FileBadge,
    href: (item) => `/crm/quotes/${item.id}`,
    getLabel: (item) => String(item["subject"] ?? item["quoteNumber"] ?? item.id),
  },
];

interface Customer360SectionProps {
  data: Customer360Response | undefined;
  isLoading: boolean;
}

export function Customer360Section({ data, isLoading }: Customer360SectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const visibleSections = SECTION_CONFIG.filter((cfg) => data[cfg.key] !== undefined);

  if (visibleSections.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No data available. You may not have permission to view all sections.
      </p>
    );
  }

  const statSections = visibleSections.filter((s) => s.statTone !== undefined);

  return (
    <div className="space-y-4">
      {statSections.length > 0 && (
        <StatCardGrid cols={Math.min(statSections.length, 4) as 2 | 3 | 4}>
          {statSections.map((cfg) => {
            const section = data[cfg.key];
            return (
              <StatCard
                key={cfg.key}
                label={cfg.title}
                value={section?.total ?? 0}
                icon={cfg.icon}
                tone={cfg.statTone}
              />
            );
          })}
        </StatCardGrid>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleSections.map((cfg) => {
          const section = data[cfg.key];
          if (!section) return null;
          const Icon = cfg.icon;
          const previewItems = section.items.slice(0, 3);

          return (
            <Card key={cfg.key} className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {cfg.title}
                </CardTitle>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                  {section.total}
                </Badge>
              </CardHeader>
              <CardContent className="px-4 py-3">
                {previewItems.length === 0 ? (
                  <p className="text-micro text-muted-foreground">None recorded.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {previewItems.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={cfg.href(item)}
                          className="text-dense text-primary hover:underline block"
                        >
                          <TruncatedText text={cfg.getLabel(item)} />
                        </Link>
                      </li>
                    ))}
                    {section.total > 3 && (
                      <li>
                        <span className="text-micro text-muted-foreground">
                          +{section.total - 3} more
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
