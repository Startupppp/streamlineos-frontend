"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCaptureSubmission } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  captureSubmissionSchema,
  type CaptureSubmissionFormValues,
  SOURCE_CHANNEL_OPTIONS,
  CONSENT_STATUS_OPTIONS,
  TYPE_OPTIONS_CAPTURE,
  SENTIMENT_OPTIONS,
} from "./capture-submission-schema";

interface CaptureSubmissionSheetProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: CaptureSubmissionFormValues = {
  message: "",
  sourceChannel: "manual",
  type: "idea",
  consentStatus: "unknown",
  reporterName: "",
  reporterEmail: "",
  segment: "",
  theme: "",
};

export function CaptureSubmissionSheet({ managedProductId, open, onOpenChange }: CaptureSubmissionSheetProps) {
  const qc = useQueryClient();
  const capture = useCaptureSubmission();

  const handleSubmit = (values: CaptureSubmissionFormValues) => {
    capture.mutate(
      {
        managedProductId,
        message: values.message,
        sourceChannel: values.sourceChannel,
        type: values.type,
        consentStatus: values.consentStatus,
        ...(values.reporterName?.trim() ? { reporterName: values.reporterName.trim() } : {}),
        ...(values.reporterEmail?.trim() ? { reporterEmail: values.reporterEmail.trim() } : {}),
        ...(values.segment?.trim() ? { segment: values.segment.trim() } : {}),
        ...(values.theme?.trim() ? { theme: values.theme.trim() } : {}),
        ...(values.sentiment ? { sentiment: values.sentiment } : {}),
      },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          toast.success("Feedback captured");
          const firstPageKey = growthAndSignQueryKeys.feedbucket.submissions({
            managedProductId,
            page: 1,
            limit: 25,
          });
          qc.setQueryData(firstPageKey, (old: { data: unknown[]; total: number } | undefined) => {
            if (!old) return old;
            return { ...old, data: [{ id: result.submissionId, ...values }, ...old.data] };
          });
        },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  };

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Capture feedback"
      description="Record feedback from any source channel"
      resolver={zodResolver(captureSubmissionSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={capture.isPending}
      submitLabel="Capture"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Describe the feedback…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sourceChannel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source channel</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SOURCE_CHANNEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TYPE_OPTIONS_CAPTURE.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select consent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONSENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reporterName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reporter name</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reporterEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reporter email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Optional" {...field} />
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
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
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
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SENTIMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
