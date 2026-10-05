"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import {
  slackConnectionSchema,
  type SlackConnectionFormValues,
} from "./slack-connection-schema";

interface SlackAddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (values: SlackConnectionFormValues) => void;
}

export function SlackAddConnectionDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: SlackAddConnectionDialogProps) {
  const form = useForm<SlackConnectionFormValues>({
    resolver: zodResolver(slackConnectionSchema),
    defaultValues: {
      teamId: "",
      teamName: "",
      signingSecret: "",
      botToken: "",
      defaultChannelId: "",
    },
  });

  useRegisterDirtyState(open && form.formState.isDirty);

  const handleDialogChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) form.reset();
    },
    [form, onOpenChange],
  );

  const handleCancel = useCallback(() => handleDialogChange(false), [handleDialogChange]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Add Slack connection</DialogTitle>
          <DialogDescription>
            Enter your Slack app credentials. You can find these in your Slack app configuration.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody className="space-y-4 px-6 py-2">
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace / Team ID <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="TXXXXXXXX" className="font-mono" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corp" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="signingSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signing secret <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Slack signing secret" className="font-mono" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="botToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot token <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="xoxb-..." className="font-mono" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultChannelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default channel ID (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="CXXXXXXXX" className="font-mono" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Creating…">
                Create connection
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
