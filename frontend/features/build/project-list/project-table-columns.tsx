"use client";

import { useMemo } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { type DataTableColumn } from "@/components/ui/data-table";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ProjectListItem } from "@/types/projects/projects";
import type { DisplayPrefs } from "./use-display-prefs";
import {
  InlineProjectLead,
  InlineProjectMembers,
} from "./project-field-people";
import { InlineProjectPriority } from "./project-field-status-priority";
import { ActionsCell } from "./project-table-actions";
import {
  ProjectStatusCell,
  ProjectHealthCell,
  ProjectTargetDateCell,
  ProjectStartDateCell,
  ProjectIssueCountCell,
  ProjectProgressCell,
} from "./project-table-column-cells";

interface UseProjectTableColumnsParams {
  prefs: DisplayPrefs | undefined;
  canEdit: boolean;
  onEdit: (p: ProjectListItem) => void;
  onArchive: (p: ProjectListItem) => void;
  onDelete: (p: ProjectListItem) => void;
}

export function useProjectTableColumns({
  prefs,
  canEdit,
  onEdit,
  onArchive,
  onDelete,
}: UseProjectTableColumnsParams): DataTableColumn<ProjectListItem>[] {
  return useMemo<DataTableColumn<ProjectListItem>[]>(() => {
    const cols: DataTableColumn<ProjectListItem>[] = [
      {
        key: "name",
        header: "Name",
        className: "min-w-[200px] w-[260px] max-w-[360px]",
        cell: (p) => (
          <div
            className={cn(
              TEXT_FLEX_CHILD,
              "flex min-w-0 items-center gap-2 overflow-hidden",
            )}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-micro font-medium tracking-tight bg-primary/10 text-primary ring-1 ring-primary/10"
              aria-hidden="true"
            >
              {p.key.slice(0, 2).toUpperCase()}
            </span>
            <Link href={`/build/${p.id}`} className="min-w-0 flex-1">
              <TruncatedText
                text={p.name}
                className="text-label font-medium text-foreground transition-colors group-hover:text-primary"
              />
            </Link>
            <span className="hidden shrink-0 font-mono text-micro text-muted-foreground sm:inline-block">
              {p.key}
            </span>
          </div>
        ),
      },
    ];

    if (!prefs || prefs.showSummary) {
      cols.push({
        key: "summary",
        header: "Summary",
        className: "w-[180px]",
        cell: (p) =>
          p.description ? (
            <TruncatedText
              text={p.description}
              className="text-dense text-muted-foreground"
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      });
    }

    if (!prefs || prefs.showStatus) {
      cols.push({
        key: "status",
        header: "Status",
        className: "w-[120px]",
        cell: (p) => <ProjectStatusCell p={p} />,
      });
    }

    if (prefs?.showPriority) {
      cols.push({
        key: "priority",
        header: "Priority",
        className: "w-[96px]",
        cell: (p) => (
          <InlineProjectPriority
            projectId={p.id}
            currentPriority={p.priority}
          />
        ),
      });
    }

    if (prefs?.showHealth) {
      cols.push({
        key: "health",
        header: "Health",
        className: "w-[96px]",
        cell: (p) => <ProjectHealthCell p={p} />,
      });
    }

    if (!prefs || prefs.showLead) {
      cols.push({
        key: "lead",
        header: "Lead",
        className: "min-w-[148px] w-[160px]",
        cell: (p) =>
          canEdit ? (
            <InlineProjectLead projectId={p.id} manager={p.manager} />
          ) : p.manager ? (
            <div className={cn(TEXT_FLEX_CHILD, "flex items-center gap-1.5")}>
              <Avatar className="h-5 w-5 shrink-0">
                {p.manager.image ? (
                  <AvatarImage
                    src={resolveImageUrl(p.manager.image)}
                    alt={getUserDisplayName(p.manager)}
                  />
                ) : null}
                <AvatarFallback className="text-micro">
                  {getUserInitials(p.manager)}
                </AvatarFallback>
              </Avatar>
              <TruncatedText
                text={getUserDisplayName(p.manager)}
                className="min-w-0 text-xs text-muted-foreground"
              />
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              Unassigned
            </span>
          ),
      });
    }

    if (prefs?.showMembers) {
      cols.push({
        key: "members",
        header: "Members",
        className: "w-[90px]",
        cell: (p) =>
          canEdit ? (
            <InlineProjectMembers projectId={p.id} members={p.members} />
          ) : p.members.length > 0 ? (
            <AvatarStack
              users={p.members}
              limit={3}
              className="[&_[data-slot=avatar]]:size-5 [&_[data-slot=avatar]]:text-micro"
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      });
    }

    if (prefs?.showTeams) {
      cols.push({
        key: "teams",
        header: "Teams",
        className: "w-[140px]",
        cell: (p) => {
          if (!p.teams || p.teams.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {p.teams.slice(0, 3).map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="h-[18px] px-1.5 text-micro font-normal"
                >
                  {t}
                </Badge>
              ))}
              {p.teams.length > 3 ? (
                <Badge
                  variant="outline"
                  className="h-[18px] px-1.5 text-micro font-normal text-muted-foreground"
                >
                  +{p.teams.length - 3}
                </Badge>
              ) : null}
            </div>
          );
        },
      });
    }

    if (!prefs || prefs.showTargetDate) {
      cols.push({
        key: "endDate",
        header: "Target",
        className: "w-[84px]",
        cell: (p) => <ProjectTargetDateCell p={p} />,
      });
    }

    if (prefs?.showStartDate) {
      cols.push({
        key: "startDate",
        header: "Start",
        className: "w-[80px]",
        cell: (p) => <ProjectStartDateCell p={p} />,
      });
    }

    if (!prefs || prefs.showIssueCount) {
      cols.push({
        key: "issues",
        header: "Issues",
        className: "w-[72px]",
        cell: (p) => <ProjectIssueCountCell p={p} />,
      });
    }

    if (!prefs || prefs.showProgress) {
      cols.push({
        key: "progress",
        header: "Progress",
        className: "min-w-[120px] w-[132px]",
        cell: (p) => <ProjectProgressCell p={p} />,
      });
    }

    cols.push({
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10 pr-2",
      cell: (p) => (
        <ActionsCell
          project={p}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ),
    });

    return cols;
  }, [prefs, canEdit, onEdit, onArchive, onDelete]);
}
