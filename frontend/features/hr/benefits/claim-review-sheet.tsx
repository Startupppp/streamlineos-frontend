"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useReviewClaim, type InsuranceClaim } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const schema = z
  .object({
    status: z.enum(["in_review", "approved", "rejected"]),
    rejectionReason: z.string().max(1000).optional(),
    payoutRoute: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected" && !data.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rejection reason is required",
        path: ["rejectionReason"],
      });
    }
    if (data.status === "approved" && !data.payoutRoute) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payout route is required for approval",
        path: ["payoutRoute"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
] as const;

const PAYOUT_ROUTES = [
  { value: "payroll_payable", label: "Payroll Payable" },
  { value: "finance_payable", label: "Finance Payable" },
  { value: "already_paid", label: "Already Paid" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: InsuranceClaim | null;
}

export function ClaimReviewSheet({ open, onOpenChange, claim }: Props) {
  const reviewClaim = useReviewClaim();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "in_review",
      rejectionReason: "",
      payoutRoute: "",
    },
  });

  const watchedStatus = form.watch("status");

  function onSubmit(values: FormValues) {
    if (!claim) return;
    toast.promise(
      reviewClaim.mutateAsync({
        claimId: claim.id,
        status: values.status,
        rejectionReason:
          values.status === "rejected" ? values.rejectionReason : undefined,
        payoutRoute:
          values.status === "approved" && values.payoutRoute
            ? values.payoutRoute
            : undefined,
      }),
      {
        loading: "Updating claim...",
        success: () => {
          onOpenChange(false);
          return "Claim updated";
        },
        error: (e: unknown) => getErrorMessage(e),
      },
    );
  }

  if (!claim) return null;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Review Claim"
      description={`Claim #${claim.claimNumber}`}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Decision"
      isPending={reviewClaim.isPending}
    >
      <Form {...form}>
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Claimant</span>
            <span className="font-medium">
              {claim.user?.name ?? claim.user?.email ?? claim.userId}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">
              {claim.plan?.name ?? `Plan #${claim.planId}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-foreground">
              ₹{(claim.amountCents / 100).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span>
              {formatDistanceToNow(new Date(claim.submittedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Status</span>
            <Badge variant="outline" className="text-[10px]">
              {claim.status}
            </Badge>
          </div>
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decision</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedStatus === "approved" && (
          <FormField
            control={form.control}
            name="payoutRoute"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payout Route</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select payout route" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYOUT_ROUTES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchedStatus === "rejected" && (
          <FormField
            control={form.control}
            name="rejectionReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rejection Reason</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Explain why the claim is rejected..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </Form>
    </HrSheet>
  );
}
