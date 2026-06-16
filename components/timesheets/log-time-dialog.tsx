"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useProjects,
  useProject,
  useLogTime,
} from "@/lib/api/hooks/projects";
import { Plus, Loader2 } from "lucide-react";
import { addTimeEntryInputSchema } from "@/lib/validation/projects";
import { ScrollArea } from "../ui/scroll-area";
import { apiClient } from "@/lib/api-client";
import { LogTimeForm } from "./log-time-form";

interface LogTimeDialogProps {
  trigger?: React.ReactNode;
}

export function LogTimeDialog({ trigger }: LogTimeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<(string | null)[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];
  const { data: projectDetails, isLoading: isLoadingTickets } = useProject(
    selectedProjectId ?? 0,
  );
  const tickets = projectDetails?.tickets ?? [];

  const mutation = useLogTime();

  const form = useForm<z.infer<typeof addTimeEntryInputSchema>>({
    resolver: zodResolver(addTimeEntryInputSchema),
    defaultValues: {
      ticketId: undefined as unknown as number,
      hours: 0,
      description: "",
      date: new Date(),
      workLink: "",
    },
  });

  const uploadAttachment = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "time-entries");
      const data = await apiClient.upload<{ url?: string; key?: string }>(
        "/storage/upload",
        formData,
      );
      return data.url ?? data.key ?? null;
    } catch {
      toast.error("Failed to upload file");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleProjectChange = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  async function onSubmit(values: z.infer<typeof addTimeEntryInputSchema>) {
    let imageUrl: string | undefined;
    if (attachmentFiles.length > 0) {
      const url = await uploadAttachment(attachmentFiles[0]);
      if (!url) return;
      imageUrl = url;

      for (let i = 1; i < attachmentFiles.length; i++) {
        await uploadAttachment(attachmentFiles[i]);
      }
    }
    const submitValues = {
      ...values,
      projectId: selectedProjectId!,
      workLink: (values.workLink || "").trim() || undefined,
      imageUrl: imageUrl ?? values.imageUrl ?? "",
    };
    mutation.mutate(submitValues, {
      onSuccess: () => {
        toast.success("Time logged successfully");
        setOpen(false);
        form.reset();
        setSelectedProjectId(null);
        setAttachmentFiles([]);
        setAttachmentPreviews([]);
      },
      onError: (err) => {
        toast.error((err as Error).message || "Failed to log time");
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-sm">Log Time</SheetTitle>
          <SheetDescription className="text-xs">
            Record your work hours on a ticket.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-4">
              <LogTimeForm
                form={form}
                projects={projects}
                tickets={tickets}
                isLoadingTickets={isLoadingTickets && !!selectedProjectId}
                attachmentFiles={attachmentFiles}
                attachmentPreviews={attachmentPreviews}
                uploading={uploading}
                onProjectChange={handleProjectChange}
                onAttachmentFilesChange={setAttachmentFiles}
                onAttachmentPreviewsChange={setAttachmentPreviews}
              />
            </div>
          </ScrollArea>

          <SheetFooter className="px-4 py-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending || uploading}
            >
              {(mutation.isPending || uploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log Time
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
