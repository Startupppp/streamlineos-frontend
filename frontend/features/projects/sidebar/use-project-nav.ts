"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import type { ProjectNavPermissions } from "./project-nav-config";

const ROOT_BOARD_VIEWS = new Set([
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
]);

export function useProjectNavPermissions(): ProjectNavPermissions {
  const canProjects = useCan("projects:view");
  const canTickets = useCan("projects:tickets:view");

  return {
    canProjectData: canProjects || canTickets,
    canTickets,
    canSprints: useCan("projects:sprints:view"),
    canSettings: useCan("settings:manage"),
    canQA: useCan("projects:qa:view"),
    canBugs: useCan("projects:bugs:view"),
    canIncidents: useCan("projects:incidents:view"),
    canChangerequests: useCan("projects:changerequests:view"),
    canClientVisibility: useCan("projects:clientvisibility:manage"),
    canApprovals: useCan("projects:approvals:view"),
    canAI: useCan("projects:ai:use"),
    canForms: useCan("projects:forms:view"),
    canRisks: useCan("projects:risks:view"),
    canDecisions: useCan("projects:decisions:view"),
    canMeetings: useCan("projects:meetings:view"),
    canWorkflow: useCan("projects:workflow:view"),
    canChat: useCan("projects:tickets:view"),
    canFeedback: useCan("feedbucket:submissions:view"),
  };
}

export function useProjectNavIsActive(baseUrl: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (href: string) => {
      if (!pathname) return false;
      if (href.includes("view=workload")) {
        return pathname === baseUrl && searchParams.get("view") === "workload";
      }
      if (href === baseUrl) {
        if (pathname !== baseUrl) return false;
        const view = searchParams.get("view");
        return !view || ROOT_BOARD_VIEWS.has(view);
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname, searchParams, baseUrl],
  );
}
