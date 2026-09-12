"use client";

import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useBulkInviteUsers } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { USER_INVITE_ROLES } from "@/lib/constants/user-invite-roles";
import { cn } from "@/lib/utils";

const bulkInviteFormSchema = z.object({
  emailsRaw: z
    .string()
    .min(1, "Enter at least one email address"),
  role: z.string().min(1, "Please select a role"),
});

type BulkInviteFormValues = z.infer<typeof bulkInviteFormSchema>;

interface RowFailure {
  originalEmail: string;
  reason: string;
  isDuplicate: boolean;
}

interface BulkInviteResult {
  queued: number;
  failures: RowFailure[];
  role: string;
}

interface UserBulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function deduplicatePreview(emails: string[]): { unique: string[]; duplicates: string[] } {
  const seen = new Set<string>();
  const unique: string[] = [];
  const duplicates: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(email);
    } else {
      seen.add(key);
      unique.push(email);
    }
  }
  return { unique, duplicates };
}

export function UserBulkInviteDialog({ open, onOpenChange }: UserBulkInviteDialogProps) {
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const { mutate: bulkInvite, isPending } = useBulkInviteUsers();

  const form = useForm<BulkInviteFormValues>({
    resolver: zodResolver(bulkInviteFormSchema),
    defaultValues: { emailsRaw: "", role: "" },
  });

  const emailsRaw = form.watch("emailsRaw");
  const parsedEmails = useMemo(() => parseEmails(emailsRaw), [emailsRaw]);
  const { unique: uniqueEmails, duplicates: previewDuplicates } = useMemo(
    () => deduplicatePreview(parsedEmails),
    [parsedEmails],
  );

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setResult(null);
    }
    onOpenChange(isOpen);
  }, [form, onOpenChange]);

  const handleCloseDialog = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const handleResetResult = useCallback(() => {
    form.reset();
    setResult(null);
  }, [form]);

  const retryableFailures = useMemo(
    () => (result?.failures ?? []).filter((failure) => !failure.isDuplicate),
    [result],
  );

  /**
   * Only the addresses that did NOT get an invitation are put back in the box.
   * Re-submitting the original paste would rotate a fresh token for everyone who
   * already succeeded, so the second email is the one the recipient must ignore.
   */
  const handleRetryFailed = useCallback(() => {
    if (!result) return;
    form.reset({
      emailsRaw: retryableFailures.map((failure) => failure.originalEmail).join("\n"),
      role: result.role,
    });
    setResult(null);
  }, [form, result, retryableFailures]);

  function onSubmit(values: BulkInviteFormValues) {
    const emails = parseEmails(values.emailsRaw);
    if (emails.length === 0) {
      form.setError("emailsRaw", { message: "Enter at least one email address" });
      return;
    }
    bulkInvite(
      { emails, role: values.role },
      {
        onSuccess: (data) => {
          const queued = data.results.filter((r) => r.success).length;
          const failures: RowFailure[] = data.results
            .filter((r) => !r.success)
            .map((r) => ({
              originalEmail: r.originalEmail,
              reason: r.error ?? "Unknown error",
              isDuplicate: r.isDuplicate === true,
            }));
          setResult({ queued, failures, role: values.role });
          if (queued > 0 && failures.length === 0) {
            toast.success(
              `${queued} invitation${queued !== 1 ? "s" : ""} queued for delivery`,
            );
          } else if (queued === 0) {
            toast.error("No invitations could be sent. Review the failures below.");
          }
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }

  const isSuccessView = result !== null;
  const hasFailures = (result?.failures.length ?? 0) > 0;
  const allFailed = isSuccessView && result.queued === 0 && hasFailures;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSuccessView
              ? allFailed
                ? "Invitations failed"
                : hasFailures
                  ? "Invitations partially queued"
                  : "Invitations queued"
              : "Bulk Invite Users"}
          </DialogTitle>
          {isSuccessView ? (
            <DialogDescription className="sr-only">
              Bulk invite result summary
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-5 py-2">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full",
                allFailed
                  ? "bg-destructive/10"
                  : hasFailures
                    ? "bg-status-warning-surface"
                    : "bg-status-success-surface",
              )}
            >
              {allFailed ? (
                <XCircle className="size-7 text-destructive" />
              ) : hasFailures ? (
                <AlertTriangle className="size-7 text-status-warning-ink" />
              ) : (
                <CheckCircle2 className="size-7 text-status-success-ink" />
              )}
            </div>

            <div className="w-full space-y-1.5 text-center">
              <p className="text-base font-semibold text-foreground tabular-nums">
                {result.queued > 0
                  ? `${result.queued} invitation${result.queued !== 1 ? "s" : ""} queued`
                  : "No invitations queued"}
              </p>
              <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                {allFailed
                  ? "None of the addresses could be invited. Review the failures below and try again."
                  : hasFailures
                    ? "Some invitations were queued. Review the addresses that could not be invited below."
                    : "Each invitee will receive an email with instructions to join your organization. Delivery may take a few minutes."}
              </p>
            </div>

            {hasFailures ? (
              <div className="w-full rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-left space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {result.failures.length} could not be invited
                </p>
                <div className="flex flex-col gap-2">
                  {result.failures.map((f) => (
                    <div key={f.originalEmail} className="flex flex-col gap-0.5">
                      <Badge
                        variant="outline"
                        className="w-fit text-xs text-destructive border-destructive/30 bg-destructive/5"
                      >
                        {f.originalEmail}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground pl-0.5">
                        {f.isDuplicate ? "Duplicate in this batch" : f.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                className="h-10 w-full"
                onClick={handleCloseDialog}
              >
                Done
              </Button>
              {retryableFailures.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  onClick={handleRetryFailed}
                >
                  {`Retry ${retryableFailures.length} failed address${retryableFailures.length !== 1 ? "es" : ""}`}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  onClick={handleResetResult}
                >
                  Invite more
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="emailsRaw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email addresses <span className="text-destructive">*</span>
                      {parsedEmails.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({uniqueEmails.length} unique
                          {previewDuplicates.length > 0
                            ? `, ${previewDuplicates.length} duplicate${previewDuplicates.length !== 1 ? "s" : ""}`
                            : ""})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="alice@company.com, bob@company.com&#10;one per line or comma-separated"
                        className="min-h-[120px] font-mono text-xs"
                      />
                    </FormControl>
                    {previewDuplicates.length > 0 ? (
                      <p className="text-[11px] text-status-warning-ink">
                        Duplicate entries will be collapsed to a single invitation each.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role for all invitees <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_INVITE_ROLES.map((r) => (
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={isPending}
                  loadingText="Queuing…"
                  disabled={uniqueEmails.length === 0}
                >
                  {uniqueEmails.length > 0
                    ? `Invite ${uniqueEmails.length} user${uniqueEmails.length !== 1 ? "s" : ""}`
                    : "Send invitations"}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
