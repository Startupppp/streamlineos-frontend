"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { cn } from "@/lib/utils";
import { PmPanel, PmSection } from "@/components/pm-chrome";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import {
  ProjectInfoSection,
  formSchema,
} from "@/features/build/settings/project-info-section";
import { DangerZoneSection } from "@/features/build/settings/danger-zone-section";
import { ProjectMemberRolesSection } from "@/features/build/settings/project-member-roles-section";
import { CustomFieldsSettings } from "@/features/build/settings/custom-fields-settings";
import { LabelsSettings } from "@/features/build/settings/labels-settings";
import { StatusesSettings } from "@/features/build/settings/statuses-settings";
import { TeamRosterSection } from "@/features/build/settings/team-roster-section";
import { InvoiceLineDetailSection } from "@/features/build/settings/invoice-line-detail-section";
import type { SectionId } from "./project-settings-nav";

type FormValues = z.infer<typeof formSchema>;

interface MembersSelectorProps {
  memberIds: string[];
  onMemberIdsChange: (ids: string[]) => void;
  originalMemberIds: string[];
  onMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void,
  ) => void;
}

interface ProjectSettingsSectionPanelsProps {
  activeSection: SectionId;
  projectId: number;
  projectName: string;
  form: UseFormReturn<FormValues>;
  isPending: boolean;
  originalMemberIds: string[];
  onMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void,
  ) => void;
  onSubmit: (values: FormValues) => void;
  MembersSelector: (props: MembersSelectorProps) => ReactNode;
  isOwner: boolean;
  onDeleted: () => void;
}

export function ProjectSettingsSectionPanels({
  activeSection,
  projectId,
  projectName,
  form,
  isPending,
  originalMemberIds,
  onMemberRemoved,
  onSubmit,
  MembersSelector,
  isOwner,
  onDeleted,
}: ProjectSettingsSectionPanelsProps) {
  return (
    <PmSection
      index={1}
      className="min-w-0 flex-1 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
    >
      {activeSection === "general" ? (
        <div className="space-y-4">
          <PmPanel className="p-4" solid>
            <div className="mb-3 border-b border-border pb-3">
              <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
                General
              </h3>
              <p
                className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}
              >
                Project name, description, status, and members.
              </p>
            </div>
            <ProjectInfoSection
              form={form}
              isPending={isPending}
              originalMemberIds={originalMemberIds}
              onMemberRemoved={onMemberRemoved}
              onSubmit={onSubmit}
              MembersSelector={MembersSelector}
            />
          </PmPanel>
          <PmPanel className="p-4" solid>
            <div className="mb-3 border-b border-border pb-3">
              <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
                Member Roles
              </h3>
              <p
                className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}
              >
                Project-level roles are informational. Access is governed by
                org-level permissions.
              </p>
            </div>
            <ProjectMemberRolesSection projectId={projectId} />
          </PmPanel>
          <PmPanel className="p-4" solid>
            <div className="mb-3 border-b border-border pb-3">
              <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
                Billing
              </h3>
              <p
                className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}
              >
                What an invoice generated from this project&rsquo;s approved time
                says on each line.
              </p>
            </div>
            <InvoiceLineDetailSection projectId={projectId} />
          </PmPanel>
        </div>
      ) : null}

      {activeSection === "labels" ? (
        <PmPanel className="p-4" solid>
          <LabelsSettings />
        </PmPanel>
      ) : null}

      {activeSection === "statuses" ? (
        <PmPanel className="p-4" solid>
          <StatusesSettings projectId={projectId} />
        </PmPanel>
      ) : null}

      {activeSection === "custom-fields" ? (
        <PmPanel className="p-4" solid>
          <CustomFieldsSettings projectId={projectId} />
        </PmPanel>
      ) : null}

      {activeSection === "teams" ? (
        <PmPanel className="p-4" solid>
          <div className="mb-3 border-b border-border pb-3">
            <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
              Teams &amp; Roster
            </h3>
            <p
              className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}
            >
              Teams this project belongs to and their effective members. Assign
              from a team&rsquo;s detail page.
            </p>
          </div>
          <TeamRosterSection projectId={projectId} />
        </PmPanel>
      ) : null}

      {activeSection === "danger" && isOwner ? (
        <PmPanel className="border-destructive/30 bg-destructive/5 p-4" solid>
          <div className="mb-3 border-b border-destructive/20 pb-3">
            <h3
              className={cn(
                "text-sm font-medium text-destructive",
                TEXT_ONE_LINE,
              )}
            >
              Danger Zone
            </h3>
            <p
              className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}
            >
              Irreversible actions for this project.
            </p>
          </div>
          <DangerZoneSection
            projectId={projectId}
            projectName={projectName}
            onDeleted={onDeleted}
          />
        </PmPanel>
      ) : null}
    </PmSection>
  );
}
