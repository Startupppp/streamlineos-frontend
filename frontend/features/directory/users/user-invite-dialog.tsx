"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useInviteUser } from "@/hooks/api/users";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";
import { USER_INVITE_ROLES } from "@/lib/constants/user-invite-roles";
import { InviteSeatNotice } from "./invite-seat-notice";
import { ModuleAccessSection } from "./invite-module-access";
import {
  inviteUserSchema,
  type InviteUserFormValues,
} from "./user-invite-schema";

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function UserInviteDialog({
  open,
  onOpenChange,
  defaultEmail,
}: UserInviteDialogProps) {
  const [invited, setInvited] = useState(false);
  const [wasResent, setWasResent] = useState(false);
  /**
   * The refusal, kept on screen.
   *
   * A toast was the only thing this form said when an invitation was refused, and a
   * toast is transient and lives in one corner of the viewport — anything floating
   * there, and a reader who looked away for four seconds, sees a form that went
   * "Sending…" and then came back unchanged with no success and no error. That is how
   * a plan-limit or already-a-member refusal reads as "the button does nothing"
   * (CHAT-002). The toast still fires; this is the copy that stays until the next
   * attempt.
   */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutate: inviteUser, isPending } = useInviteUser();
  const canManageRbac = useCan("settings:rbac:manage");

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: defaultEmail ?? "",
      role: undefined,
      moduleAccess: [],
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        form.reset();
        setInvited(false);
        setWasResent(false);
        setSubmitError(null);
      }
      onOpenChange(isOpen);
    },
    [form, onOpenChange],
  );

  const handleCloseDialog = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  function onSubmit(values: InviteUserFormValues) {
    setSubmitError(null);
    inviteUser(
      {
        email: values.email,
        role: values.role,
        ...(values.moduleAccess && values.moduleAccess.length > 0
          ? { moduleAccess: values.moduleAccess }
          : {}),
      },
      {
        onSuccess: (result) => {
          setSubmitError(null);
          setInvited(true);
          setWasResent(result.resent);
          toast.success(
            result.resent ? "Invitation re-sent" : "Invitation sent",
          );
        },
        onError: (error) => {
          const message = getErrorMessage(error);
          setSubmitError(message);
          toast.error(message);
        },
      },
    );
  }

  const handleResetInvite = useCallback(() => {
    form.reset();
    setInvited(false);
    setWasResent(false);
    setSubmitError(null);
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            They receive an email with a link to join this organization. The
            role and module access you pick here apply the moment they accept.
          </DialogDescription>
        </DialogHeader>

        {invited ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success-surface">
              <CheckCircle2 className="h-6 w-6 text-status-success-ink" />
            </div>
            <p className="font-medium text-sm">
              {wasResent ? "Invitation re-sent!" : "Invitation sent!"}
            </p>
            <p className="text-xs text-muted-foreground">
              The user will receive an email with instructions to join.
            </p>
            <Button size="sm" variant="outline" onClick={handleResetInvite}>
              Invite another
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <InviteSeatNotice requesting={1} />
              {submitError ? (
                <p
                  role="alert"
                  className="rounded-md bg-status-danger-surface px-3 py-2 text-xs text-status-danger-ink"
                >
                  {submitError}
                </p>
              ) : null}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email address{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="colleague@company.com"
                          type="email"
                          className="pl-9"
                          autoComplete="off"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Role <span className="text-destructive">*</span>
                    </FormLabel>
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
                    {/*
                      BUG-HRMS-003. QA asked for HR Admin / Manager / Finance /
                      Viewer here. There are exactly three org standings by design
                      (BE-102) and a fourth invite role would be a parallel role
                      system; finer grants go through Module access.
                    */}
                    <FormDescription className="text-xs">
                      Member for everyone; Org Admin for organisation settings and billing.
                      {canManageRbac
                        ? " Job-specific access — HR, payroll, finance — is set under Module access below."
                        : " Job-specific access — HR, payroll, finance — is granted per person under Settings → Access."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canManageRbac && (
                <FormField
                  control={form.control}
                  name="moduleAccess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module access</FormLabel>
                      <ModuleAccessSection field={field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                >
                  Send invitation
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
