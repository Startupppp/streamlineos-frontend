"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { stripPmWorkspacePrefix } from "@/lib/build/pm-workspace-path";
import type { ProjectNavPermissions } from "./project-nav-config";

const ROOT_BOARD_VIEWS = new Set([
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
]);

export function useProjectNavPermissions(): ProjectNavPermissions {
  const canProjects = useCan("build:view");
  const canTickets = useCan("build:tickets:view");
  const canViewFeedback = useCan("feedbucket:submissions:view");
  const feedbucketEnabled = useModuleEnabled("feedbucket");

  return {
    canProjectData: canProjects || canTickets,
    canTickets,
    canSprints: useCan("build:sprints:view"),
    canSettings: useCan("settings:manage"),
    canQA: useCan("build:qa:view"),
    canBugs: useCan("build:bugs:view"),
    canIncidents: useCan("build:incidents:view"),
    canChangerequests: useCan("build:changerequests:view"),
    canClientVisibility: useCan("build:clientvisibility:manage"),
    canApprovals: useCan("build:approvals:view"),
    canAI: useCan("build:ai:use"),
    canForms: useCan("build:forms:view"),
    canRisks: useCan("build:risks:view"),
    canDecisions: useCan("build:decisions:view"),
    canMeetings: useCan("build:meetings:view"),
    canWorkflow: useCan("build:workflow:view"),
    canChat: useCan("build:tickets:view"),
    canFeedback: canViewFeedback && feedbucketEnabled,
  };
}

export function useProjectNavIsActive(baseUrl: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (href: string) => {
      if (!pathname) return false;
      const effectivePathname = stripPmWorkspacePrefix(pathname);
      if (href.includes("view=workload")) {
        return effectivePathname === baseUrl && searchParams.get("view") === "workload";
      }
      if (href === baseUrl) {
        if (effectivePathname !== baseUrl) return false;
        const view = searchParams.get("view");
        return !view || ROOT_BOARD_VIEWS.has(view);
      }
      return effectivePathname === href || effectivePathname.startsWith(`${href}/`);
    },
    [pathname, searchParams, baseUrl],
  );
}
