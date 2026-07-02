"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ExternalLink,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useClientAccount } from "@/hooks/api/crm/clients";
import { ErrorState } from "@/components/shared";
import { ClientOverviewTab } from "@/features/crm/clients/client-overview-tab";
import { ClientTimelineTab } from "@/features/crm/clients/client-timeline-tab";
import { ClientOpportunitiesTab } from "@/features/crm/clients/client-opportunities-tab";
import { ClientOnboardingTab } from "@/features/crm/clients/client-onboarding-tab";
import type { ClientAccountStatus } from "@/types/crm";

const STATUS_LABELS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "Account Opening",
  QUERIES: "Queries",
  PLAN_SELECTED: "Plan Selected",
  INVESTED: "Invested",
};

const STATUS_COLORS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "bg-blue-500/10 text-blue-600 border-0",
  QUERIES: "bg-amber-500/10 text-amber-600 border-0",
  PLAN_SELECTED: "bg-muted text-foreground border-0",
  INVESTED: "bg-emerald-500/10 text-emerald-600 border-0",
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
  } = useClientAccount(clientId);

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Client" subtitle="Loading..." backHref="/crm/clients">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="h-52 rounded-lg bg-muted animate-pulse" />
              <div className="h-44 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-52 rounded-lg bg-muted animate-pulse" />
              <div className="h-44 rounded-lg bg-muted animate-pulse" />
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
      variant="display"
      title={client.clientName}
      backHref="/crm/clients"
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-[10px]", STATUS_COLORS[client.status])}>
            {STATUS_LABELS[client.status]}
          </Badge>
          {client.planName && (
            <span className="text-[13px] text-muted-foreground">{client.planName}</span>
          )}
        </div>
      }
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href={`/crm/leads/${client.leadId}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View Lead
          </Link>
        </Button>
      }
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
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
          </Tabs>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
