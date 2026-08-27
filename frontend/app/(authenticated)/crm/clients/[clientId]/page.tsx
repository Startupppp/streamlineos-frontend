"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { useReducedMotion, motion } from "framer-motion";
import {
  ExternalLink,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useClientAccount } from "@/hooks/api/crm/clients";
import { useClient360 } from "@/hooks/api/crm";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { ClientOverviewTab } from "@/features/crm/clients/client-overview-tab";
import { ClientTimelineTab } from "@/features/crm/clients/client-timeline-tab";
import { ClientOpportunitiesTab } from "@/features/crm/clients/client-opportunities-tab";
import { ClientOnboardingTab } from "@/features/crm/clients/client-onboarding-tab";
import { Customer360Section } from "@/features/crm/shared/customer-360-section";
import { AccountInlineAiMenu } from "@/features/crm/shared/crm-inline-ai-menu";
import type { ClientAccountStatus } from "@/types/crm";

const STATUS_LABELS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "Account Opening",
  QUERIES: "Queries",
  PLAN_SELECTED: "Plan Selected",
  INVESTED: "Invested",
};

const STATUS_BADGE_CLASSES: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  QUERIES: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  PLAN_SELECTED: "bg-muted text-muted-foreground border-border",
  INVESTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
};

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: clientIdStr } = use(params);
  const clientId = Number(clientIdStr);

  const {
    data: client,
    isLoading,
    isError,
    refetch,
    access,
  } = useClientAccount(clientId);

  const { data: client360, isLoading: client360Loading } = useClient360(clientId);

  const shouldReduceMotion = useReducedMotion();
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Client" backHref="/crm/clients">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Skeleton className="h-52 rounded-lg" />
              <Skeleton className="h-44 rounded-lg" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-52 rounded-lg" />
              <Skeleton className="h-44 rounded-lg" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Client" backHref="/crm/clients">
        <ErrorState
          title="Failed to load client"
          description="There was an error loading this client account. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (access.denied) {
    return (
      <PageWrapper title="Client" backHref="/crm/clients">
        <NoPermissionState permission={access.permission} />
      </PageWrapper>
    );
  }

  if (!client) {
    return (
      <PageWrapper title="Client" backHref="/crm/clients">
        <ErrorState
          title="Client not found"
          description="This client account may have been removed or you may not have access."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={client.clientName}
      backHref="/crm/clients"
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("h-5 px-2 py-0.5 text-micro", STATUS_BADGE_CLASSES[client.status])}
          >
            {STATUS_LABELS[client.status]}
          </Badge>
          {client.planName && (
            <span className="text-label text-muted-foreground">{client.planName}</span>
          )}
        </div>
      }
      actions={
        <>
          <AccountInlineAiMenu clientId={clientId} clientName={client.clientName} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/crm/leads/${client.leadId}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Lead
            </Link>
          </Button>
        </>
      }
    >
      <motion.div
        className="space-y-4"
        variants={shouldReduceMotion ? { hidden: {}, visible: {} } : staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : fadeUp}
        >
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="customer360">Customer 360</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ClientOverviewTab client={client} />
            </TabsContent>

            <TabsContent value="timeline">
              <Card className="shadow-sm">
                <CardHeader className="px-4 py-3 border-b">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <ClientTimelineTab clientId={clientId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities">
              <ClientOpportunitiesTab clientId={clientId} />
            </TabsContent>

            <TabsContent value="onboarding">
              <Card className="shadow-sm">
                <CardHeader className="px-4 py-3 border-b">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    Onboarding Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <ClientOnboardingTab clientId={clientId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customer360">
              <Customer360Section data={client360} isLoading={client360Loading} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
