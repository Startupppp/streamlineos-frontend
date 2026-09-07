"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Share2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCurrencyFull } from "@/lib/format-utils";
import { referrerPortalSchema, type ReferrerPortalFormValues } from "./referrer-portal-schema";
import type { PublicReferrerPortal } from "@/lib/public-fetch";

const publicReferralSubmitContract = lazyContract(() =>
  import("@/lib/public-schema").then((m) => m.publicReferralSubmitContract),
);

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  REVIEWING: "Reviewing",
  HIRED: "Hired",
  REJECTED: "Not Selected",
  INELIGIBLE: "Already In Pipeline",
  REWARD_PENDING: "Reward Pending",
  REWARD_PAID: "Reward Paid",
};

interface Props {
  data: PublicReferrerPortal;
  token: string;
}

export function ReferrerPortalIsland({ data, token }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const form = useForm<ReferrerPortalFormValues>({
    resolver: zodResolver(referrerPortalSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobPostingId: "",
    },
  });

  async function handleSubmit(values: ReferrerPortalFormValues) {
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const result = await apiClient.post<{ alreadyReferred: boolean }>(
        `/public/referrals/${token}/submit`,
        {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone?.trim() || undefined,
          jobPostingId: values.jobPostingId ? Number(values.jobPostingId) : undefined,
        },
        undefined,
        publicReferralSubmitContract,
      );
      setSubmitSuccess(
        result.alreadyReferred
          ? "You've already referred this person — no need to submit again."
          : "Referral submitted! We'll keep you posted on their progress.",
      );
      form.reset();
      router.refresh();
    } catch (e) {
      setSubmitError(getErrorMessage(e) || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Share2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-center">Welcome, {data.referrerName}</CardTitle>
          <p className="text-sm text-muted-foreground text-center">Refer candidates for open roles at {data.orgName}.</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {data.openJobs.length > 0 && (
                <FormField
                  control={form.control}
                  name="jobPostingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an open role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.openJobs.map((job) => (
                            <SelectItem key={job.id} value={String(job.id)}>
                              {job.title}{job.location ? ` · ${job.location}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-status-success-ink">{submitSuccess}</p>}
              <LoadingButton type="submit" className="w-full" isPending={submitting} loadingText="Submitting…">
                Refer This Candidate
              </LoadingButton>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {data.referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">You haven&apos;t referred anyone yet.</p>
          ) : (
            <div className="space-y-2">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.jobTitle ?? "General"} · {format(new Date(r.createdAt), "MMM d, yyyy")}
                      {r.rewardAmount && ` · ${formatCurrencyFull(parseFloat(r.rewardAmount), data.currency)}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
