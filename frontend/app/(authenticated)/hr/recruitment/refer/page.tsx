"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAllReferrals, useSubmitReferral } from "@/hooks/api/hr/recruitment/referrals";
import { useJobPostings } from "@/hooks/api/hr/recruitment";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import type { ReferralStatus } from "@/types/hr/recruitment";
import { ErrorState } from "@/components/shared/error-state";
import {
  referSchema,
  type ReferFormValues,
} from "@/features/hr/recruitment/refer-schema";

const STATUS_CONFIG: Record<ReferralStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUBMITTED: { label: "Submitted", variant: "secondary" },
  REVIEWING: { label: "Under Review", variant: "default" },
  HIRED: { label: "Hired!", variant: "default" },
  REJECTED: { label: "Not Selected", variant: "destructive" },
  BONUS_PAID: { label: "Bonus Paid", variant: "default" },
};

export default function ReferPage() {
  const {
    data: referrals = [],
    isLoading: loadingReferrals,
    isError: referralsError,
    refetch: refetchReferrals,
  } = useAllReferrals();
  const { data: jobs = [], isError: jobsError, refetch: refetchJobs } = useJobPostings({
    status: "OPEN",
  });
  const createMutation = useSubmitReferral();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReferFormValues>({ resolver: zodResolver(referSchema) });

  const phoneValue = watch("phone") ?? "";

  function handlePhoneChange(value: string) {
    setValue("phone", value, { shouldValidate: true });
  }

  function handleJobPostingChange(v: string) {
    setValue("jobPostingId", v === "none" ? undefined : v);
  }

  const onSubmit = async (values: ReferFormValues) => {
    try {
      await createMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        jobPostingId: values.jobPostingId ? Number(values.jobPostingId) : undefined,
        relationship: values.relationship,
        notes: values.notes,
      });
      toast.success("Referral submitted successfully");
      reset();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <PageWrapper
      title="Refer a Candidate"
      subtitle="Know someone great? Submit a referral and earn a bonus if they're hired."
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit a Referral</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...register("firstName")} placeholder="Jane" />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...register("lastName")} placeholder="Doe" />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} placeholder="jane@example.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <PhoneInput value={phoneValue} onChange={handlePhoneChange} defaultCountry="IN" />
              </div>

              <div className="space-y-1.5">
                <Label>Job Opening (optional)</Label>
                <Select onValueChange={handleJobPostingChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific job</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={String(job.id)}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="relationship">Your Relationship</Label>
                <Input id="relationship" {...register("relationship")} placeholder="e.g. Former colleague, Friend" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Why are you referring them?</Label>
                <Textarea id="notes" {...register("notes")} placeholder="Brief note about this candidate..." rows={3} />
              </div>

              <LoadingButton type="submit" className="w-full" isPending={createMutation.isPending} loadingText="Submitting...">
                Submit Referral
              </LoadingButton>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">My Referrals</h3>
          {loadingReferrals ? (
            <div className="space-y-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : referralsError ? (
            <ErrorState
              title="Unable to load your referrals"
              description="Try again. If this keeps happening, check your permissions."
              onRetry={() => {
                void refetchReferrals();
                if (jobsError) void refetchJobs();
              }}
              compact
            />
          ) : referrals.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                You haven&apos;t submitted any referrals yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => {
                const cfg = STATUS_CONFIG[referral.status];
                return (
                  <Card key={referral.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {referral.candidate?.firstName} {referral.candidate?.lastName}
                            </span>
                            <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                            <p>{referral.candidate?.email}</p>
                            {referral.jobPosting && <p>{referral.jobPosting.title}</p>}
                            <p>{format(new Date(referral.createdAt), "MMM d, yyyy")}</p>
                            {referral.bonusPaidAt && referral.bonusAmount && (
                              <p className="text-status-success-ink font-medium">
                                Bonus: ₹{parseFloat(referral.bonusAmount).toLocaleString()} paid {format(new Date(referral.bonusPaidAt), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </PageWrapper>
  );
}
