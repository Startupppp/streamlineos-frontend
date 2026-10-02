"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import {
  CircleDot,
  ListChecks,
  Settings2,
  ShieldAlert,
  Tags,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProject, useUpdateProject } from "@/hooks/api/build/projects";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isWriteConflict } from "@/lib/api-envelope";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import {
  ProjectInfoSection,
  formSchema,
} from "@/features/build/settings/project-info-section";
import {
  MembersSelector,
  ReassignDialog,
} from "@/features/build/settings/project-member-selector";
import { DangerZoneSection } from "@/features/build/settings/danger-zone-section";
import { ProjectMemberRolesSection } from "@/features/build/settings/project-member-roles-section";
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
  description: string;
  icon: LucideIcon;
}

const BASE_NAV: NavSection[] = [
  {
    id: "general",
    label: "General",
    description: "Identity, ownership, members, and billing",
    icon: Settings2,
  },
  {
    id: "labels",
    label: "Labels",
    description: "Reusable work classification",
    icon: Tags,
  },
  {
    id: "statuses",
    label: "Statuses",
    description: "Workflow states and limits",
    icon: CircleDot,
  },
  {
    id: "custom-fields",
    label: "Custom Fields",
    description: "Structured project metadata",
    icon: ListChecks,
  },
  {
    id: "teams",
    label: "Teams & Roster",
    description: "Inherited access and staffing",
    icon: UsersRound,
  },
];

const DANGER_SECTION: NavSection = {
  id: "danger",
  label: "Danger Zone",
  description: "Permanent project actions",
  icon: ShieldAlert,
};

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
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [isConflict, setIsConflict] = useState(false);

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
          clientId: project.crmClient ? String(project.crmClient.id) : undefined,
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
  const [selectedSection, setSelectedSection] = useState<SectionId>(parsedSection);

  useEffect(() => {
    setSelectedSection(parsedSection);
  }, [parsedSection]);

  useEffect(() => {
    if (!searchParams.has("q")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("q");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const activeSection: SectionId =
    selectedSection === "danger" && !isOwner ? "general" : selectedSection;

  const allNavSections = isOwner ? [...BASE_NAV, DANGER_SECTION] : BASE_NAV;

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleKeyboardOpen = useCallback((_i: number) => {}, []);
  const handleKeyboardClear = useCallback(() => {}, []);

  useBuildListKeyboard({
    itemCount: 0,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    onShortcutHelp: handleShortcutHelp,
  });

  const handleSectionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rawId = e.currentTarget.dataset.section;
      if (!rawId || !isSectionId(rawId)) return;
      setSelectedSection(rawId);
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

  const isOnline = useOnlineStatus();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleDismissConflict = useCallback(() => { setIsConflict(false); void refetch(); }, [refetch]);

  const handleDeleteSuccess = useCallback(() => {
    router.push("/build/projects");
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
          },
          onError: (mutationError) => {
            if (isWriteConflict(mutationError)) {
              setIsConflict(true);
            } else {
              toast.error(getErrorMessage(mutationError));
            }
          },
        },
      );
    },
    [updateMutation, projectId],
  );

  return (
    <PageWrapper
      title="Settings"
      subtitle={project ? `Configure ${project.name}` : undefined}
    >
      <PmPageShell className="lg:h-full">
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
              action={{ label: "Back to projects", href: "/build/projects" }}
            />
          }
          onRetry={handleRetry}
          className="flex-1"
        >
          {project && (
            <>
              {!isOnline && (
                <div
                  role="status"
                  className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
                >
                  You are offline — changes will not be saved until you reconnect.
                </div>
              )}
              {isConflict && (
                <div role="alert" className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <span>Saving failed — this project was updated elsewhere. Reload to see the latest version.</span>
                  <button type="button" className="ml-4 shrink-0 font-medium underline" onClick={handleDismissConflict}>Reload</button>
                </div>
              )}
              <div className="grid gap-5 pb-8 lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:grid-cols-[17rem_minmax(0,1fr)] lg:overflow-hidden lg:pb-4">
              <PmSection index={0} className="min-w-0 lg:h-full lg:min-h-0">
                <PmPanel className="p-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col" solid>
                  <div className="px-2 pb-2 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Project configuration
                    </p>
                  </div>
                  <nav
                    aria-label="Project settings"
                    className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:content-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
                  >
                    {allNavSections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          data-section={section.id}
                          aria-label={section.label}
                          aria-current={isActive ? "page" : undefined}
                          onClick={handleSectionClick}
                          className={cn(
                            "group flex min-w-0 items-start gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                            section.id === "danger" && "lg:mt-2 lg:border-t-border",
                            isActive
                              ? section.id === "danger"
                                ? "border-destructive/20 bg-destructive/10 text-destructive"
                                : "border-border bg-accent text-accent-foreground shadow-xs"
                              : section.id === "danger"
                                ? "text-destructive hover:bg-destructive/5"
                                : "text-foreground/80 hover:border-border hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-5">
                              {section.label}
                            </span>
                            <span className="mt-0.5 hidden text-xs leading-4 text-muted-foreground lg:block">
                              {section.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </PmPanel>
              </PmSection>

              <PmSection index={1} className="min-w-0 flex-1 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                {activeSection === "general" ? (
                  <div className="space-y-4">
                    <PmPanel className="p-4" solid>
                      <div className="mb-3 border-b border-border pb-3">
                        <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
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
                        <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
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
                        <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
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
                      <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
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
                          "text-sm font-medium text-destructive",
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
            </>
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
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </PageWrapper>
  );
}
