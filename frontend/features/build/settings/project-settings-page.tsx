"use client";

import { use, useState, useCallback, useRef } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProject, useUpdateProject } from "@/hooks/api/build";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import {
  ProjectInfoSection,
  formSchema,
} from "@/features/build/settings/project-info-section";
import {
  MembersSelector,
  ReassignDialog,
  DangerZoneSection,
  ProjectMemberRolesSection,
} from "@/features/build/settings/project-members-section";
import { CustomFieldsSettings } from "@/features/build/settings/custom-fields-settings";
import { LabelsSettings } from "@/features/build/settings/labels-settings";
import { StatusesSettings } from "@/features/build/settings/statuses-settings";
import { TeamRosterSection } from "@/features/build/settings/team-roster-section";
import { InvoiceLineDetailSection } from "@/features/build/settings/invoice-line-detail-section";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import {
  TEXT_ONE_LINE,
  TEXT_BODY,
} from "@/lib/text-overflow";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

type FormValues = z.infer<typeof formSchema>;

type SectionId =
  | "general"
  | "labels"
  | "statuses"
  | "custom-fields"
  | "teams"
  | "danger";

interface NavSection {
  id: SectionId;
  label: string;
}

const BASE_NAV: NavSection[] = [
  { id: "general", label: "General" },
  { id: "labels", label: "Labels" },
  { id: "statuses", label: "Statuses" },
  { id: "custom-fields", label: "Custom Fields" },
  { id: "teams", label: "Teams & Roster" },
];

const DANGER_SECTION: NavSection = { id: "danger", label: "Danger Zone" };

function isSectionId(value: string): value is SectionId {
  return (
    value === "general" ||
    value === "labels" ||
    value === "statuses" ||
    value === "custom-fields" ||
    value === "teams" ||
    value === "danger"
  );
}

export function ProjectSettingsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useProject(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "ACTIVE",
    },
    values: project
      ? {
          name: project.name || "",
          description: project.description || "",
          status: project.status ?? "ACTIVE",
          memberIds:
            project.members?.map((m: { userId: string }) => m.userId) || [],
        }
      : undefined,
  });

  useRegisterDirtyState(form.formState.isDirty);

  const isOwner = useCan("build:delete");
  const updateMutation = useUpdateProject();

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: project === null,
  });

  const [reassignDialog, setReassignDialog] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("__unassign__");
  const reassignmentsRef = useRef<Record<string, string>>({});
  const pendingFieldChangeRef = useRef<(() => void) | null>(null);

  const rawSection = searchParams.get("section") ?? "general";
  const parsedSection: SectionId = isSectionId(rawSection) ? rawSection : "general";
  const activeSection: SectionId =
    parsedSection === "danger" && !isOwner ? "general" : parsedSection;

  const navSections: NavSection[] = isOwner
    ? [...BASE_NAV, DANGER_SECTION]
    : BASE_NAV;

  const handleSectionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rawId = e.currentTarget.dataset.section;
      if (!rawId || !isSectionId(rawId)) return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("section", rawId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleMemberRemoved = useCallback(
    (memberId: string, memberName: string, applyChange: () => void) => {
      setReassignTo("__unassign__");
      pendingFieldChangeRef.current = applyChange;
      setReassignDialog({ memberId, memberName });
    },
    [],
  );

  const confirmReassign = useCallback(() => {
    if (!reassignDialog) return;
    if (reassignTo && reassignTo !== "__unassign__") {
      reassignmentsRef.current[reassignDialog.memberId] = reassignTo;
    } else {
      delete reassignmentsRef.current[reassignDialog.memberId];
    }
    pendingFieldChangeRef.current?.();
    pendingFieldChangeRef.current = null;
    setReassignDialog(null);
  }, [reassignDialog, reassignTo]);

  const cancelReassign = useCallback(() => {
    pendingFieldChangeRef.current = null;
    setReassignDialog(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteSuccess = useCallback(() => {
    router.push("/build");
  }, [router]);

  const handleSubmit = useCallback(
    (values: FormValues) => {
      const reassignments =
        Object.keys(reassignmentsRef.current).length > 0
          ? { ...reassignmentsRef.current }
          : undefined;
      updateMutation.mutate(
        { projectId, ...values, ...(reassignments && { reassignments }) },
        {
          onSuccess: () => {
            reassignmentsRef.current = {};
            toast.success("Project settings updated");
            router.push(`/build/${projectId}`);
          },
          onError: (mutationError) => {
            toast.error(getErrorMessage(mutationError));
          },
        },
      );
    },
    [updateMutation, projectId, router],
  );

  return (
    <PageWrapper title="Settings" subtitle={project?.name}>
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <div className="flex flex-col gap-4 pb-8 md:flex-row">
              <div className="flex shrink-0 gap-0.5 border-b border-border pb-2 md:w-48 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-md md:w-full" />
                ))}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          }
          empty={
            <EmptyState
              className="flex-1"
              illustrationPreset="projects"
              title="Project not found"
              description="This project no longer exists, or you no longer have access to it."
              action={{ label: "Back to projects", href: "/build" }}
            />
          }
          onRetry={handleRetry}
          className="flex-1"
        >
          {project && (
            <div className="flex flex-col gap-4 pb-8 md:flex-row">
              <PmSection index={0} className="w-full shrink-0 md:w-52">
                <PmPanel className="p-1.5">
                  <nav
                    aria-label="Project settings"
                    className="flex w-full gap-0.5 overflow-x-auto md:flex-col md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {navSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        data-section={section.id}
                        onClick={handleSectionClick}
                        className={cn(
                          "shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                          TEXT_ONE_LINE,
                          section.id === "danger" &&
                            "md:mt-2 md:border-t md:border-border md:pt-2 max-md:ml-1 max-md:border-l max-md:border-border max-md:pl-2",
                          activeSection === section.id
                            ? section.id === "danger"
                              ? "bg-destructive/10 font-semibold text-destructive"
                              : "bg-accent font-semibold text-accent-foreground"
                            : section.id === "danger"
                              ? "text-destructive hover:bg-destructive/5 hover:text-destructive"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {section.label}
                      </button>
                    ))}
                  </nav>
                </PmPanel>
              </PmSection>

              <PmSection index={1} className="min-w-0 flex-1">
                {activeSection === "general" ? (
                  <div className="space-y-4">
                    <PmPanel className="p-4" solid>
                      <div className="mb-3 border-b border-border pb-3">
                        <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                          General
                        </h3>
                        <p
                          className={cn(
                            "mt-0.5 text-xs text-muted-foreground",
                            TEXT_BODY,
                          )}
                        >
                          Project name, description, status, and members.
                        </p>
                      </div>
                      <ProjectInfoSection
                        form={form}
                        isPending={updateMutation.isPending}
                        originalMemberIds={
                          project.members?.map(
                            (m: { userId: string }) => m.userId,
                          ) ?? []
                        }
                        onMemberRemoved={handleMemberRemoved}
                        onSubmit={handleSubmit}
                        MembersSelector={MembersSelector}
                      />
                    </PmPanel>
                    <PmPanel className="p-4" solid>
                      <div className="mb-3 border-b border-border pb-3">
                        <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                          Member Roles
                        </h3>
                        <p
                          className={cn(
                            "mt-0.5 text-xs text-muted-foreground",
                            TEXT_BODY,
                          )}
                        >
                          Project-level roles are informational. Access is governed
                          by org-level permissions.
                        </p>
                      </div>
                      <ProjectMemberRolesSection projectId={projectId} />
                    </PmPanel>
                    <PmPanel className="p-4" solid>
                      <div className="mb-3 border-b border-border pb-3">
                        <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                          Billing
                        </h3>
                        <p
                          className={cn(
                            "mt-0.5 text-xs text-muted-foreground",
                            TEXT_BODY,
                          )}
                        >
                          What an invoice generated from this project&rsquo;s
                          approved time says on each line.
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
                      <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                        Teams &amp; Roster
                      </h3>
                      <p
                        className={cn(
                          "mt-0.5 text-xs text-muted-foreground",
                          TEXT_BODY,
                        )}
                      >
                        Teams this project belongs to and their effective members.
                        Assign from a team&rsquo;s detail page.
                      </p>
                    </div>
                    <TeamRosterSection projectId={projectId} />
                  </PmPanel>
                ) : null}

                {activeSection === "danger" && isOwner ? (
                  <PmPanel
                    className="border-destructive/30 bg-destructive/5 p-4"
                    solid
                  >
                    <div className="mb-3 border-b border-destructive/20 pb-3">
                      <h3
                        className={cn(
                          "text-sm font-semibold text-destructive",
                          TEXT_ONE_LINE,
                        )}
                      >
                        Danger Zone
                      </h3>
                      <p
                        className={cn(
                          "mt-0.5 text-xs text-muted-foreground",
                          TEXT_BODY,
                        )}
                      >
                        Irreversible actions for this project.
                      </p>
                    </div>
                    <DangerZoneSection
                      projectId={projectId}
                      projectName={project.name}
                      onDeleted={handleDeleteSuccess}
                    />
                  </PmPanel>
                ) : null}
              </PmSection>
            </div>
          )}
        </PageState>
      </PmPageShell>

      <ReassignDialog
        open={reassignDialog !== null}
        memberName={reassignDialog?.memberName ?? ""}
        removedMemberId={reassignDialog?.memberId ?? ""}
        currentMemberIds={form.getValues("memberIds") ?? []}
        reassignTo={reassignTo}
        onReassignToChange={setReassignTo}
        onConfirm={confirmReassign}
        onCancel={cancelReassign}
      />
    </PageWrapper>
  );
}
