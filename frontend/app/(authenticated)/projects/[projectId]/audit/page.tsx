"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Ticket,
  Users,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: number | string;
  action: string;
  entityType: string;
  entityId: number | string;
  entityName?: string;
  actorName?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const ACTION_ICON: Record<string, React.ElementType> = {
  "ticket.created": Ticket,
  "ticket.updated": Ticket,
  "ticket.deleted": Ticket,
  "ticket.assigned": Users,
  "sprint.started": GitBranch,
  "sprint.completed": GitBranch,
  "comment.created": MessageSquare,
  "member.added": Users,
  "member.removed": Users,
};

const ACTION_COLOR: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-700 border-emerald-200",
  updated: "bg-blue-100 text-blue-700 border-blue-200",
  deleted: "bg-red-100 text-red-700 border-red-200",
  assigned: "bg-violet-100 text-violet-700 border-violet-200",
  started: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function getActionColor(action: string) {
  const verb = action.split(".")[1] ?? "updated";
  return ACTION_COLOR[verb] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

function getIcon(action: string) {
  return ACTION_ICON[action] ?? Activity;
}

function AuditEntryRow({ entry, idx }: { entry: AuditEntry; idx: number }) {
  const Icon = getIcon(entry.action);
  const verb = entry.action.split(".")[1] ?? entry.action;
  const entity = entry.action.split(".")[0] ?? "item";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.02, duration: 0.18 }}
      className="flex items-start gap-3 py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group"
    >
      <div className="h-7 w-7 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800 truncate">
            {entry.actorName ?? "System"}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 border shrink-0",
              getActionColor(entry.action),
            )}
          >
            {verb}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize shrink-0">
            {entity}
          </span>
          {entry.entityName && (
            <span className="text-xs font-medium text-slate-600 truncate">
              &ldquo;{entry.entityName}&rdquo;
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {new Date(entry.createdAt).toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function AuditLogPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<AuditEntry[]>({
    queryKey: ["projects", projectId, "audit-log"],
    queryFn: () => apiClient.get<AuditEntry[]>(`/projects/${projectId}/audit-log`),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  return (
    <PageWrapper title="Audit Log" subtitle="All project activity and changes">
      <div className="max-w-3xl mx-auto pb-8">
        {isLoading ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3 px-4 border-b border-slate-100"
              >
                <Skeleton className="h-7 w-7 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Could not load audit log.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs text-violet-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-violet-50 border border-slate-200/80 flex items-center justify-center">
              <Activity className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No activity yet</p>
            <p className="text-xs text-muted-foreground">
              Project events will appear here as they happen.
            </p>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {entries.map((entry, idx) => (
              <AuditEntryRow key={entry.id} entry={entry} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
