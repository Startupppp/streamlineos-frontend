"use client";

import { use, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/api/projects";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { updateProjectSettingsInputSchema } from "@/lib/validation/projects";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectInfoSection } from "@/features/projects/settings/project-info-section";
import {
  MembersSelector,
  ReassignDialog,
  DangerZoneSection,
} from "@/features/projects/settings/project-members-section";
import { CustomFieldsSettings } from "@/features/projects/settings/custom-fields-settings";
import { LabelsSettings } from "@/features/projects/settings/labels-settings";
import { StatusesSettings } from "@/features/projects/settings/statuses-settings";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

const formSchema = updateProjectSettingsInputSchema.omit({ projectId: true });
type FormValues = z.infer<typeof formSchema>;

type SectionId =
  | "general"
  | "labels"
  | "statuses"
  | "custom-fields"
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
];

const DANGER_SECTION: NavSection = { id: "danger", label: "Danger Zone" };

function isSectionId(value: string): value is SectionId {
  return (
    value === "general" ||
    value === "labels" ||
    value === "statuses" ||
    value === "custom-fields" ||
    value === "danger"
  );
}

export default function ProjectSettingsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("general");

  const { data: project, isLoading } = useProject(projectId);
  const deleteMutation = useDeleteProject();

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
          status:
            (project.status as "ACTIVE" | "COMPLETED" | "ARCHIVED") ||
            "ACTIVE",
          memberIds:
            project.members?.map((m: { userId: string }) => m.userId) || [],
        }
      : undefined,
  });

  const isOwner = useCan("projects:delete");
  const updateMutation = useUpdateProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [reassignDialog, setReassignDialog] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("__unassign__");
  const reassignmentsRef = useRef<Record<string, string>>({});
  const pendingFieldChangeRef = useRef<(() => void) | null>(null);

  const navSections: NavSection[] = isOwner
    ? [...BASE_NAV, DANGER_SECTION]
    : BASE_NAV;

  const handleSectionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rawId = e.currentTarget.dataset.section;
      if (rawId && isSectionId(rawId)) {
        setActiveSection(rawId);
      }
    },
    []
  );

  const handleMemberRemoved = useCallback(
    (memberId: string, memberName: string, applyChange: () => void) => {
      setReassignTo("__unassign__");
      pendingFieldChangeRef.current = applyChange;
      setReassignDialog({ memberId, memberName });
    },
    []
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

  const handleDeleteConfirm = useCallback(() => {
    deleteMutation.mutate(
      { projectId },
      {
        onSuccess: () => {
          toast.success("Project deleted successfully");
          router.push("/projects/all");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [deleteMutation, projectId, router]);

  const handleDeleteClick = useCallback(() => setDeleteDialogOpen(true), []);

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
            router.push(`/projects/${projectId}`);
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        }
      );
    },
    [updateMutation, projectId, router]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Settings">
        <div className="flex flex-col md:flex-row gap-0 pb-8">
          <div className="flex md:flex-col gap-1 md:w-44 shrink-0 p-2 mb-4 md:mb-0 border-b border-border md:border-b-0 md:border-r md:pr-4 bg-card/50 md:rounded-l-lg">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 md:w-full" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!project) {
    return (
      <PageWrapper title="Settings">
        <div className="flex items-center justify-center h-64" role="alert">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-destructive">
              Project not found
            </h2>
            <p className="text-sm text-muted-foreground">
              The requested project could not be loaded.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="Projects"
      title="Settings"
      subtitle={project.name}
      backHref={`/projects/${projectId}`}
    >
      <div className="flex flex-col md:flex-row gap-6 pb-8">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:w-44 shrink-0 pb-1 md:pb-0">
          {navSections.map((section) => (
            <button
              key={section.id}
              type="button"
              data-section={section.id}
              onClick={handleSectionClick}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm text-left transition-colors",
                activeSection === section.id
                  ? section.id === "danger"
                    ? "bg-destructive/5 text-destructive font-medium"
                    : "bg-muted text-foreground font-medium"
                  : section.id === "danger"
                    ? "text-destructive/70 hover:bg-destructive/5 hover:text-destructive"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeSection === "general" && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="pb-3 mb-3 border-b border-border">
                <h3 className="text-sm font-semibold">General</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Project name, description, status, and members.
                </p>
              </div>
              <ProjectInfoSection
                form={form}
                isPending={updateMutation.isPending}
                originalMemberIds={
                  project.members?.map((m: { userId: string }) => m.userId) ??
                  []
                }
                onMemberRemoved={handleMemberRemoved}
                onSubmit={handleSubmit}
                MembersSelector={MembersSelector}
              />
            </div>
          )}

          {activeSection === "labels" && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="pb-3 mb-3 border-b border-border">
                <h3 className="text-sm font-semibold">Labels</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage labels for organizing tickets across this organization.
                </p>
              </div>
              <LabelsSettings />
            </div>
          )}

          {activeSection === "statuses" && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="pb-3 mb-3 border-b border-border">
                <h3 className="text-sm font-semibold">Workflow Statuses</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define custom workflow statuses for this project.
                </p>
              </div>
              <StatusesSettings projectId={projectId} />
            </div>
          )}

          {activeSection === "custom-fields" && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="pb-3 mb-3 border-b border-border">
                <h3 className="text-sm font-semibold">Custom Fields</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define additional data fields for tickets in this project.
                </p>
              </div>
              <CustomFieldsSettings projectId={projectId} />
            </div>
          )}

          {activeSection === "danger" && isOwner && (
            <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4">
              <div className="pb-3 mb-3 border-b border-destructive/20">
                <h3 className="text-sm font-semibold text-destructive">
                  Danger Zone
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Irreversible actions for this project.
                </p>
              </div>
              <DangerZoneSection
                projectName={project.name}
                isPending={deleteMutation.isPending}
                deleteDialogOpen={deleteDialogOpen}
                onDeleteClick={handleDeleteClick}
                onDeleteDialogChange={setDeleteDialogOpen}
                onDeleteConfirm={handleDeleteConfirm}
              />
            </div>
          )}
        </div>
      </div>

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
