"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Phone,
  MessageSquare,
  User,
  DollarSign,
  CalendarDays,
  FileText,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckSquare,
  Square,
  AlertCircle,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import {
  useClientAccount,
  useClientTimeline,
  useClientOpportunities,
  useClientOnboardingItems,
  useToggleOnboardingItem,
} from "@/hooks/api/crm/clients";
import type { ClientAccountStatus, ClientActivity } from "@/types/crm";
import type {
  ClientTimelineEvent,
  ClientOpportunity,
  OnboardingItem,
} from "@/types/crm/clients";

const STATUS_LABELS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "Account Opening",
  QUERIES: "Queries",
  PLAN_SELECTED: "Plan Selected",
  INVESTED: "Invested",
};

const STATUS_COLORS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "bg-blue-500/10 text-blue-600 border-0",
  QUERIES: "bg-amber-500/10 text-amber-600 border-0",
  PLAN_SELECTED: "bg-violet-500/10 text-violet-600 border-0",
  INVESTED: "bg-emerald-500/10 text-emerald-600 border-0",
};

const RENEWAL_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  in_discussion: "In Discussion",
  renewed: "Renewed",
  churned: "Churned",
};

const OPP_STAGE_LABELS: Record<ClientOpportunity["stage"], string> = {
  identified: "Identified",
  proposed: "Proposed",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

const OPP_STAGE_COLORS: Record<ClientOpportunity["stage"], string> = {
  identified: "bg-blue-500/10 text-blue-600 border-0",
  proposed: "bg-amber-500/10 text-amber-600 border-0",
  negotiating: "bg-violet-500/10 text-violet-600 border-0",
  won: "bg-emerald-500/10 text-emerald-600 border-0",
  lost: "bg-red-500/10 text-red-600 border-0",
};

function formatAmount(amount: string | null) {
  if (!amount) return "—";
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs text-foreground text-right min-w-0 truncate">
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ClientActivity }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Clock className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground">{activity.title}</p>
        {activity.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {activity.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDateTime(activity.createdAt)}
          {activity.user?.name && ` · ${activity.user.name}`}
        </p>
      </div>
    </div>
  );
}

function TimelineTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientTimeline(clientId);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.events.length) {
    return (
      <EmptyState
        title="No timeline events"
        description="Activity for this client will appear here."
        compact
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-0">
      {data.events.map((event: ClientTimelineEvent) => (
        <div
          key={event.id}
          className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
        >
          <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="h-3 w-3 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground">{event.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {event.description}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDateTime(event.date)}
              {event.user && ` · ${event.user}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunitiesTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientOpportunities(clientId);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No opportunities"
        description="Upsell and cross-sell opportunities will appear here."
        compact
        className="py-10"
      />
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/80">
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Title
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Type
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Stage
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Value
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Expected Close
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((opp: ClientOpportunity) => (
            <tr
              key={opp.id}
              className="border-b border-border/50 last:border-0 h-8 hover:bg-muted/30"
            >
              <td className="px-3 py-1.5 text-[11px] font-medium">{opp.title}</td>
              <td className="px-3 py-1.5">
                <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600 capitalize">
                  {opp.type === "cross_sell" ? "Cross-sell" : "Upsell"}
                </Badge>
              </td>
              <td className="px-3 py-1.5">
                <Badge className={cn("text-[10px]", OPP_STAGE_COLORS[opp.stage])}>
                  {OPP_STAGE_LABELS[opp.stage]}
                </Badge>
              </td>
              <td className="px-3 py-1.5 text-[11px] tabular-nums">
                {formatAmount(opp.value)}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
                {formatDate(opp.expectedCloseDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OnboardingTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientOnboardingItems(clientId);
  const toggleMutation = useToggleOnboardingItem();

  const handleToggle = useCallback(
    (item: OnboardingItem) => {
      const completed = !item.completedAt;
      toggleMutation.mutate(
        { id: item.id, completed, clientId },
        {
          onError: () => toast.error("Failed to update item"),
        },
      );
    },
    [toggleMutation, clientId],
  );

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No onboarding items"
        description="Onboarding checklist items will appear here once added."
        compact
        className="py-10"
      />
    );
  }

  const completedCount = data.filter((i) => i.completedAt).length;
  const percentage =
    data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {completedCount} of {data.length} completed
        </span>
        <span className="text-xs font-medium text-foreground">
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="space-y-1 mt-2">
        {data.map((item: OnboardingItem) => {
          const isCompleted = Boolean(item.completedAt);

          const handleItemToggle = () => handleToggle(item);

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                id={`onboarding-${item.id}`}
                checked={isCompleted}
                onCheckedChange={handleItemToggle}
                disabled={toggleMutation.isPending}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`onboarding-${item.id}`}
                  className={cn(
                    "text-[11px] font-medium cursor-pointer",
                    isCompleted && "line-through text-muted-foreground",
                  )}
                >
                  {item.title}
                </label>
                {item.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  {item.assignee?.name && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.assignee.name}
                    </span>
                  )}
                  {item.dueDate && (
                    <span className="text-[10px] text-muted-foreground">
                      Due {formatDate(item.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              {isCompleted ? (
                <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: clientIdStr } = use(params);
  const clientId = Number(clientIdStr);
  const router = useRouter();

  const {
    data: client,
    isLoading,
    isError,
    refetch,
  } = useClientAccount(clientId);

  const handleBack = useCallback(() => router.push("/crm/clients"), [router]);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Client" subtitle="Loading...">
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">Failed to load client</p>
          <p className="text-sm text-muted-foreground mt-1">
            There was an error loading this client account. Please try again.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
          <SearchX className="h-7 w-7 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">Client not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This client account may have been removed or you may not have access.
          </p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const recentActivities = client.activities.slice(0, 5);

  return (
    <PageWrapper
      variant="display"
      title={client.clientName}
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-[10px]", STATUS_COLORS[client.status])}>
            {STATUS_LABELS[client.status]}
          </Badge>
          {client.planName && (
            <span className="text-[13px] text-muted-foreground">
              {client.planName}
            </span>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/crm/leads/${client.leadId}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Lead
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card className="shadow-sm">
                    <CardHeader className="px-4 py-3 border-b">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Contact Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 py-3">
                      <InfoRow icon={Mail} label="Email" value={client.clientEmail} />
                      <InfoRow icon={Phone} label="Phone" value={client.clientPhone} />
                      <InfoRow
                        icon={MessageSquare}
                        label="WhatsApp"
                        value={client.clientWhatsapp}
                      />
                      <InfoRow
                        icon={User}
                        label="Sales Rep"
                        value={client.salesRep?.name ?? "—"}
                      />
                      <InfoRow
                        icon={User}
                        label="CRM Rep"
                        value={client.assignedCrm?.name ?? "Unassigned"}
                      />
                    </CardContent>
                  </Card>

                  {recentActivities.length > 0 && (
                    <Card className="shadow-sm">
                      <CardHeader className="px-4 py-3 border-b">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 py-3">
                        {recentActivities.map((activity) => (
                          <ActivityItem key={activity.id} activity={activity} />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card className="shadow-sm self-start">
                  <CardHeader className="px-4 py-3 border-b">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Investment Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <InfoRow
                      icon={DollarSign}
                      label="Investment Amount"
                      value={formatAmount(client.investmentAmount)}
                    />
                    <InfoRow
                      icon={DollarSign}
                      label="Estimated Investment"
                      value={formatAmount(client.estimatedInvestment)}
                    />
                    <InfoRow
                      icon={FileText}
                      label="Plan"
                      value={client.planName}
                    />
                    <InfoRow
                      icon={CalendarDays}
                      label="Investment Date"
                      value={formatDate(client.investmentDate)}
                    />
                    <InfoRow
                      icon={CalendarDays}
                      label="Converted At"
                      value={formatDate(client.convertedAt)}
                    />
                    <InfoRow
                      icon={FileText}
                      label="Transaction Ref"
                      value={client.transactionRef}
                    />
                    <InfoRow
                      icon={RefreshCw}
                      label="Renewal Stage"
                      value={RENEWAL_LABELS[client.renewalStage] ?? client.renewalStage}
                    />
                    <InfoRow
                      icon={CalendarDays}
                      label="Renewal Date"
                      value={formatDate(client.renewalDate)}
                    />
                    {client.conversionNotes && (
                      <div className="pt-2 mt-1 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Conversion Notes
                        </p>
                        <p className="text-[11px] text-foreground">
                          {client.conversionNotes}
                        </p>
                      </div>
                    )}
                    {client.renewalNotes && (
                      <div className="pt-2 mt-1 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Renewal Notes
                        </p>
                        <p className="text-[11px] text-foreground">
                          {client.renewalNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
                  <TimelineTab clientId={clientId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities">
              <OpportunitiesTab clientId={clientId} />
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
                  <OnboardingTab clientId={clientId} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}

