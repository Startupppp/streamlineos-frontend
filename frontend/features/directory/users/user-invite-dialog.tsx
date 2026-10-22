"use client";

import { useState, useCallback, useMemo } from "react";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInviteUser } from "@/hooks/api/users";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { describeInviteFailure } from "@/features/directory/users/invite-error-message";
import { CheckCircle2, Info, Mail } from "lucide-react";
import { DEFAULT_INVITE_ROLE, USER_INVITE_ROLES } from "@/lib/constants/user-invite-roles";
import { InviteSeatNotice } from "./invite-seat-notice";
import { INVITE_ACCESS_PRESETS, ModuleAccessSection } from "./invite-module-access";
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutate: inviteUser, isPending } = useInviteUser();
  const canManageRbac = useCan("settings:rbac:manage");
  const buildEnabled = useModuleEnabled("build");
  const defaultModuleAccess = useMemo(
    () =>
      buildEnabled
        ? (INVITE_ACCESS_PRESETS.find((p) => p.id === "build-member")?.access ?? [])
        : [],
    [buildEnabled],
  );

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: defaultEmail ?? "",
      role: DEFAULT_INVITE_ROLE,
      moduleAccess: defaultModuleAccess,
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        form.reset({
          email: defaultEmail ?? "",
          role: DEFAULT_INVITE_ROLE,
          moduleAccess: defaultModuleAccess,
        });
        setInvited(false);
        setWasResent(false);
        setSubmitError(null);
      }
      onOpenChange(isOpen);
    },
    [form, onOpenChange, defaultEmail, defaultModuleAccess],
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
          const message = describeInviteFailure("invite", getErrorMessage(error));
          setSubmitError(message);
          toast.error(message);
        },
      },
    );
  }

  const handleResetInvite = useCallback(() => {
    form.reset({
      email: defaultEmail ?? "",
      role: DEFAULT_INVITE_ROLE,
      moduleAccess: defaultModuleAccess,
    });
    setInvited(false);
    setWasResent(false);
    setSubmitError(null);
  }, [form, defaultEmail, defaultModuleAccess]);

  const roleHint = canManageRbac
    ? "Member for day-to-day access; Org Admin for settings and billing. Job-specific grants use Module access below."
    : "Member for day-to-day access; Org Admin for settings and billing. Job-specific grants are managed under Settings → Access.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 sm:max-w-md">
        <TooltipProvider delayDuration={200}>
        <DialogHeader className="gap-1 space-y-0 pr-6">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base leading-none">
              Invite user
            </DialogTitle>
            {!invited ? <InviteSeatNotice requesting={1} /> : null}
          </div>
          <DialogDescription className="text-xs leading-snug">
            Sends a join link by email. Access starts when they accept.
          </DialogDescription>
        </DialogHeader>

        {invited ? (
          <div className="flex flex-col items-center gap-2.5 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-success-surface">
              <CheckCircle2 className="h-5 w-5 text-status-success-ink" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {wasResent ? "Invitation re-sent!" : "Invitation sent!"}
              </p>
              <p className="text-xs text-muted-foreground">
                They will get an email with a join link.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleResetInvite}>
              Invite another
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
              noValidate
            >
              {submitError ? (
                <p
                  role="alert"
                  className="rounded-md bg-status-danger-surface px-3 py-2 text-xs text-status-danger-ink"
                >
                  {submitError}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>
                        Email address{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="colleague@company.com"
                            type="email"
                            className="h-9 pl-9"
                            autoComplete="off"
                            autoFocus
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
                    <FormItem className="sm:col-span-2">
                      <div className="flex items-center gap-1">
                        <FormLabel className="mb-0">
                          Role <span className="text-destructive">*</span>
                        </FormLabel>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="About roles"
                            >
                              <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[16rem] text-xs leading-relaxed"
                          >
                            {roleHint}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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
              </div>

              {canManageRbac ? (
                <FormField
                  control={form.control}
                  name="moduleAccess"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Module access</FormLabel>
                      <ModuleAccessSection field={field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <DialogFooter className="gap-2 sm:gap-2">
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
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
