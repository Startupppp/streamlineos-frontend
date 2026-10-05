"use client";

import { useCallback, useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GitProvider } from "@/hooks/api/git-integration";
import { SetupInstructions } from "./git-setup-instructions";
import { ProviderIcon } from "./git-connection-row";
import {
  gitConnectionSchema,
  type GitConnectionFormValues,
} from "./git-connection-schema";

export const PROVIDERS: { value: GitProvider; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "bitbucket", label: "Bitbucket" },
];

interface GitConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (values: GitConnectionFormValues) => void;
}

export function GitConnectionDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: GitConnectionDialogProps) {
  const form = useForm<GitConnectionFormValues>({
    resolver: zodResolver(gitConnectionSchema),
    defaultValues: { provider: "github", repoUrl: "", repoName: "" },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const selectedProvider = form.watch("provider");

  const handleCancel = useCallback(
    () => onOpenChange(false),
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Add Git connection</DialogTitle>
          <DialogDescription>
            We generate a webhook URL and secret for you to paste into your
            repository.
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
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <ProviderIcon
                                provider={p.value}
                                className="h-4 w-4"
                              />
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="repoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Repository URL{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          className="pl-9"
                          placeholder="https://github.com/org/repo"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="repoName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="org/repo" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              {selectedProvider === "github" ? (
                <SetupInstructions
                  compact
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                />
              ) : null}
            </DialogBody>
            <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={isPending}
                loadingText="Creating…"
              >
                Create connection
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddConnectionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      Add connection
    </Button>
  );
}
