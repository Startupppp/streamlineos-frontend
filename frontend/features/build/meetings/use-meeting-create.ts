"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useCreateMeeting } from "@/hooks/api/build/meetings";
import { getErrorMessage } from "@/lib/get-error-message";
import { MEETING_TEMPLATES, type MeetingTemplate } from "./new-meeting-button";
import type { CreateMeetingInput } from "@/types/projects";

interface UseMeetingCreateProps {
  projectId: number;
}

export function useMeetingCreate({ projectId }: UseMeetingCreateProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null);
  const createMeeting = useCreateMeeting(projectId);

  const handleOpenSheet = useCallback(() => {
    setSelectedTemplate(null);
    setSheetOpen(true);
  }, []);

  const handleOpenTemplate = useCallback((tpl: MeetingTemplate) => {
    setSelectedTemplate(tpl);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedTemplate(null);
  }, []);

  const handleCreate = useCallback(
    (input: CreateMeetingInput) => {
      createMeeting.mutate(input, {
        onSuccess: () => {
          toast.success("Meeting created");
          setSheetOpen(false);
          setSelectedTemplate(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createMeeting],
  );

  const handleScheduleStandup = useCallback(() => {
    const template = MEETING_TEMPLATES[0];
    if (template) handleOpenTemplate(template);
  }, [handleOpenTemplate]);

  const handleSchedulePlanning = useCallback(() => {
    const template = MEETING_TEMPLATES[1];
    if (template) handleOpenTemplate(template);
  }, [handleOpenTemplate]);

  return {
    sheetOpen,
    selectedTemplate,
    createMeeting,
    handleOpenSheet,
    handleOpenTemplate,
    handleSheetOpenChange,
    handleCreate,
    handleScheduleStandup,
    handleSchedulePlanning,
  };
}
