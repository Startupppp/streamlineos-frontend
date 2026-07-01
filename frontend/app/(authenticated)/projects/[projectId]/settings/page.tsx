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

export default function ProjectSettingsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const router = useRouter();

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
          router.push("/projects");
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
        <div className="max-w-xl mx-auto space-y-6 pb-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
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
    <PageWrapper title="Settings" subtitle={project.name}>
      <div className="max-w-xl mx-auto space-y-6 pb-8">
        <ProjectInfoSection
          form={form}
          isPending={updateMutation.isPending}
          originalMemberIds={
            project.members?.map((m: { userId: string }) => m.userId) ?? []
          }
          onMemberRemoved={handleMemberRemoved}
          onSubmit={handleSubmit}
          MembersSelector={MembersSelector}
        />

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Labels</h3>
            <p className="text-sm text-muted-foreground">
              Manage labels for organizing tickets across this organization.
            </p>
          </div>
          <LabelsSettings />
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Workflow Statuses</h3>
            <p className="text-sm text-muted-foreground">
              Define custom workflow statuses for this project.
            </p>
          </div>
          <StatusesSettings projectId={projectId} />
        </section>

        <CustomFieldsSettings projectId={projectId} />

        {isOwner && (
          <DangerZoneSection
            projectName={project.name}
            isPending={deleteMutation.isPending}
            deleteDialogOpen={deleteDialogOpen}
            onDeleteClick={handleDeleteClick}
            onDeleteDialogChange={setDeleteDialogOpen}
            onDeleteConfirm={handleDeleteConfirm}
          />
        )}
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
