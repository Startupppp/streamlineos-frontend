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

const bulkInviteSchema = z.object({
  emailsRaw: z
    .string()
    .min(1, "Enter at least one email address"),
  role: z.string().min(1, "Please select a role"),
});

type BulkInviteFormValues = z.infer<typeof bulkInviteSchema>;

interface BulkInviteResult {
  invited: number;
  failed: string[];
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

export function UserBulkInviteDialog({ open, onOpenChange }: UserBulkInviteDialogProps) {
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const { mutate: bulkInvite, isPending } = useBulkInviteUsers();

  const form = useForm<BulkInviteFormValues>({
    resolver: zodResolver(bulkInviteSchema),
    defaultValues: { emailsRaw: "", role: "" },
  });

  const emailsRaw = form.watch("emailsRaw");
  const parsedEmails = useMemo(() => parseEmails(emailsRaw), [emailsRaw]);

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
          const invited = data.results.filter((r) => r.success).length;
          const failed = data.results.filter((r) => !r.success).map((r) => r.email);
          setResult({ invited, failed });
          toast.success(`${invited} invitation(s) sent`);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }

  const isSuccessView = result !== null;
  const hasFailures = (result?.failed.length ?? 0) > 0;
  const allFailed = isSuccessView && result.invited === 0 && hasFailures;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSuccessView
              ? allFailed
                ? "Invitations failed"
                : hasFailures
                  ? "Invitations partially sent"
                  : "Invitations sent"
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
                {result.invited > 0
                  ? `${result.invited} invitation${result.invited !== 1 ? "s" : ""} sent`
                  : "No invitations sent"}
              </p>
              <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                {allFailed
                  ? "None of the addresses could be invited. Review the failures below and try again."
                  : hasFailures
                    ? "Some invitations were sent. Review the addresses that could not be invited below."
                    : "Each invitee will get an email with instructions to join your organization."}
              </p>
            </div>

            {hasFailures ? (
              <div className="w-full rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-left space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {result.failed.length} could not be invited
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.failed.map((email) => (
                    <Badge
                      key={email}
                      variant="outline"
                      className="text-xs text-destructive border-destructive/30 bg-destructive/5"
                    >
                      {email}
                    </Badge>
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
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                onClick={handleResetResult}
              >
                Invite more
              </Button>
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
                          ({parsedEmails.length} detected)
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
                  loadingText="Sending…"
                  disabled={parsedEmails.length === 0}
                >
                  {parsedEmails.length > 0
                    ? `Invite ${parsedEmails.length} user${parsedEmails.length !== 1 ? "s" : ""}`
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
