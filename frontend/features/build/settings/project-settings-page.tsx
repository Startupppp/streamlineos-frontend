"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
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
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { formSchema } from "@/features/build/settings/project-info-section";
import {
  MembersSelector,
  ReassignDialog,
} from "@/features/build/settings/project-member-selector";
import { ProjectSettingsSectionPanels } from "./project-settings-section-panels";
import {
  PmPageShell,
  PmSection,
} from "@/components/pm-chrome";
import {
  type SectionId,
  BASE_NAV,
  DANGER_SECTION,
  isSectionId,
  ProjectSettingsNavList,
} from "./project-settings-nav";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

type FormValues = z.infer<typeof formSchema>;

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

  useEffect(() => {
    if (!searchParams.has("q")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("q");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const activeSection: SectionId =
    parsedSection === "danger" && !isOwner ? "general" : parsedSection;

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
                <ProjectSettingsNavList
                  sections={allNavSections}
                  activeSection={activeSection}
                  onSectionClick={handleSectionClick}
                />
              </PmSection>
              <ProjectSettingsSectionPanels
                activeSection={activeSection}
                projectId={projectId}
                projectName={project.name}
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
                isOwner={isOwner}
                onDeleted={handleDeleteSuccess}
              />
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
