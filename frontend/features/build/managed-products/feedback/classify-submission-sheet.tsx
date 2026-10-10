"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EntityFormSheet } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClassifySubmission } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CONSENT_STATUS_OPTIONS, SENTIMENT_OPTIONS } from "./capture-submission-schema";

const classifySchema = z.object({
  theme: z.string().max(200).optional(),
  segment: z.string().max(200).optional(),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional(),
  consentStatus: z.enum(["granted", "denied", "unknown"]).optional(),
});

type ClassifyFormValues = z.infer<typeof classifySchema>;

interface ClassifySubmissionSheetProps {
  submissionId: number;
  currentTheme?: string | null;
  currentSegment?: string | null;
  currentSentiment?: string | null;
  currentConsentStatus?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassifySubmissionSheet({
  submissionId,
  currentTheme,
  currentSegment,
  currentSentiment,
  currentConsentStatus,
  open,
  onOpenChange,
}: ClassifySubmissionSheetProps) {
  const classify = useClassifySubmission();

  const defaultValues: ClassifyFormValues = {
    theme: currentTheme ?? "",
    segment: currentSegment ?? "",
    sentiment: (currentSentiment as ClassifyFormValues["sentiment"]) ?? undefined,
    consentStatus: (currentConsentStatus as ClassifyFormValues["consentStatus"]) ?? undefined,
  };

  const handleSubmit = (values: ClassifyFormValues) => {
    classify.mutate(
      {
        submissionId,
        input: {
          theme: values.theme?.trim() || null,
          segment: values.segment?.trim() || null,
          ...(values.sentiment ? { sentiment: values.sentiment } : { sentiment: null }),
          ...(values.consentStatus ? { consentStatus: values.consentStatus } : {}),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success("Classification saved");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  };

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Classify submission"
      description="Update theme, segment, sentiment and consent"
      resolver={zodResolver(classifySchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={classify.isPending}
      submitLabel="Save"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Performance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="segment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segment</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Enterprise" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sentiment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sentiment</FormLabel>
                <Select onValueChange={(v) => v && field.onChange(v)} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sentiment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SENTIMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="consentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consent</FormLabel>
                <Select onValueChange={(v) => v && field.onChange(v)} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select consent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONSENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
