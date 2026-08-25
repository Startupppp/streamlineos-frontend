import Link from "next/link";
import { ArrowRight, CheckSquare, Milestone, Paperclip, MessageSquare, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalProject } from "@/features/portal/lib/portal-types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-status-info-surface text-status-info-ink",
  completed: "bg-status-success-surface text-status-success-ink",
  on_hold: "bg-status-warning-surface text-status-warning-ink",
  cancelled: "bg-status-danger-surface text-status-danger-ink",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusStyle(status: string): string {
  return STATUS_STYLES[status.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

interface CapabilityChipProps {
  icon: React.ReactNode;
  label: string;
}

function CapabilityChip({ icon, label }: CapabilityChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium bg-primary/5 text-foreground/70">
      {icon}
      {label}
    </span>
  );
}

interface PortalProjectCardProps {
  project: PortalProject;
}

export function PortalProjectCard({ project }: PortalProjectCardProps) {
  const { capabilities } = project;

  return (
    <Link
      href={`/portal/projects/${project.id}`}
      className={cn(
        "group block rounded-xl border border-border bg-card p-5",
        "hover:border-primary/30 hover:shadow-md transition-all duration-200",
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold uppercase tracking-wide",
                statusStyle(project.status),
              )}
            >
              {formatStatus(project.status)}
            </span>
            <span className="text-micro font-mono text-muted-foreground">
              {project.key}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
      </div>

      {(capabilities.canViewMilestones ||
        capabilities.canViewTasks ||
        capabilities.canViewAttachments ||
        capabilities.canViewComments ||
        capabilities.canSubmitChangeRequests) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {capabilities.canViewMilestones && (
            <CapabilityChip icon={<Milestone className="h-2.5 w-2.5" />} label="Milestones" />
          )}
          {capabilities.canViewTasks && (
            <CapabilityChip icon={<CheckSquare className="h-2.5 w-2.5" />} label="Tasks" />
          )}
          {capabilities.canViewAttachments && (
            <CapabilityChip icon={<Paperclip className="h-2.5 w-2.5" />} label="Files" />
          )}
          {capabilities.canViewComments && (
            <CapabilityChip icon={<MessageSquare className="h-2.5 w-2.5" />} label="Updates" />
          )}
          {capabilities.canSubmitChangeRequests && (
            <CapabilityChip icon={<FileEdit className="h-2.5 w-2.5" />} label="Change requests" />
          )}
        </div>
      )}
    </Link>
  );
}
