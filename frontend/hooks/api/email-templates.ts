"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface EmailTemplatePreview {
  id: string;
  category: string;
  name: string;
  subject: string;
  html: string;
}

export function useEmailTemplatePreviews() {
  return useQuery({
    queryKey: ["email-templates", "previews"],
    queryFn: () =>
      apiClient.get<EmailTemplatePreview[]>(
        "/settings/email-templates/preview",
      ),
    staleTime: 10 * 60 * 1000,
  });
}
