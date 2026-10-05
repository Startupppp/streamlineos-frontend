import { MAX_PROJECT_FILE_BYTES } from "@/hooks/api/build/project-files";
import { createTicketInputSchema } from "@/lib/validation/projects";
import type { RelatedLinkDraft } from "./ticket-related-links-editor";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { z } from "zod";
import type { Cycle } from "@/types/projects";

export const MAX_ATTACHMENT_MB = MAX_PROJECT_FILE_BYTES / (1024 * 1024);

export const formSchema = createTicketInputSchema.omit({
  projectId: true,
  labelIds: true,
});

export type CreateTicketFormValues = z.infer<typeof formSchema>;

export function findActiveCycle(cycles: Cycle[]): Cycle | null {
  const today = new Date().toISOString().slice(0, 10);
  const active = cycles.find((c) => c.status === "active");
  if (active) return active;
  return cycles.find((c) => c.startDate <= today && c.endDate >= today) ?? null;
}

export function resolveDefaultCycleId(
  defaultCycleId: number | null | undefined,
  activeCycleId: number | null,
): number | null {
  if (defaultCycleId !== undefined) return defaultCycleId;
  return activeCycleId;
}

export interface UseCreateTicketFormOptions {
  projectId: number | null;
  defaultStatus?: string;
  defaultCycleId?: number | null;
  onCreated?: () => void;
  onClose?: () => void;
}

interface PostCreateContext {
  projectId: number;
  labelIds: number[];
  files: File[];
  relatedLinks: RelatedLinkDraft[];
  addLabel: (params: { ticketId: number; projectId: number; labelId: number }) => Promise<unknown>;
  addRelatedLink: (params: { projectId: number; ticketId: number; url: string; label?: string }) => Promise<unknown>;
  uploadFile: (file: File) => Promise<{ id: number }>;
  addAttachment: (params: { ticketId: number; projectId: number; fileId: number }) => Promise<unknown>;
  setIsUploading: (v: boolean) => void;
  onComplete: () => void;
}

export async function applyPostCreate(
  data: { id: number },
  ctx: PostCreateContext,
): Promise<void> {
  const { projectId, labelIds, files, relatedLinks } = ctx;

  const labelTask =
    labelIds.length > 0
      ? Promise.all(
          labelIds.map((labelId) =>
            ctx.addLabel({ ticketId: data.id, projectId, labelId }),
          ),
        ).catch(() =>
          toast.error("Ticket created but some labels failed to attach"),
        )
      : Promise.resolve();

  const linksTask =
    relatedLinks.length > 0
      ? Promise.all(
          relatedLinks.map((link) =>
            ctx.addRelatedLink({
              projectId,
              ticketId: data.id,
              url: link.url,
              label: link.label || undefined,
            }),
          ),
        ).catch(() =>
          toast.error("Ticket created but some links failed to attach"),
        )
      : Promise.resolve();

  if (files.length > 0) {
    try {
      ctx.setIsUploading(true);
      await Promise.all([labelTask, linksTask]);
      const outcomes = await Promise.allSettled(
        files.map(async (file) => {
          const uploaded = await ctx.uploadFile(file);
          await ctx.addAttachment({
            ticketId: data.id,
            projectId,
            fileId: uploaded.id,
          });
        }),
      );

      const failed = files.filter((_, i) => outcomes[i]?.status === "rejected");
      const succeeded = files.length - failed.length;

      if (failed.length === 0) {
        toast.success(
          `Issue created with ${succeeded} attachment${succeeded > 1 ? "s" : ""}`,
        );
      } else {
        const firstRejection = outcomes.find((o) => o.status === "rejected");
        const reason =
          firstRejection?.status === "rejected"
            ? getErrorMessage(firstRejection.reason)
            : "Upload failed.";
        const names = failed.map((f) => f.name).join(", ");
        toast.error(
          succeeded > 0
            ? `Issue created. ${succeeded} attached, but ${names} failed: ${reason}`
            : `Issue created, but ${names} could not be attached: ${reason}`,
        );
      }
    } catch (error) {
      toast.error(`Issue created, but attachments failed: ${getErrorMessage(error)}`);
    } finally {
      ctx.setIsUploading(false);
      ctx.onComplete();
    }
  } else {
    await Promise.all([labelTask, linksTask]);
    toast.success("Issue created");
    ctx.onComplete();
  }
}
