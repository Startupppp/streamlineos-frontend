"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
import { useInviteUser } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";
import { USER_INVITE_ROLES } from "./user-invite-roles";
import {
  inviteUserSchema,
  type InviteUserFormValues,
} from "./user-invite-schema";

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const [invited, setInvited] = useState(false);
  const [wasResent, setWasResent] = useState(false);
  const { mutate: inviteUser, isPending } = useInviteUser();

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: "",
    },
  });

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setInvited(false);
      setWasResent(false);
    }
    onOpenChange(isOpen);
  }, [form, onOpenChange]);

  const handleCloseDialog = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  function onSubmit(values: InviteUserFormValues) {
    inviteUser(
      {
        email: values.email,
        role: values.role,
      },
      {
        onSuccess: (result) => {
          setInvited(true);
          setWasResent(result.resent);
          toast.success(result.resent ? "Invitation re-sent!" : "Invitation sent!");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }

  const handleResetInvite = useCallback(() => {
    form.reset();
    setInvited(false);
    setWasResent(false);
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        {invited ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-sm">{wasResent ? "Invitation re-sent!" : "Invitation sent!"}</p>
            <p className="text-xs text-muted-foreground">
              The user will receive an email with instructions to join.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetInvite}
            >
              Invite another
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="colleague@company.com"
                          type="email"
                          className="pl-9"
                          autoComplete="off"
                        />
                      </div>
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
                    <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
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
                <LoadingButton type="submit" isPending={isPending} loadingText="Sending…">
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
