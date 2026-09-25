"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateAgentToken,
  type CreateAgentTokenResponse,
} from "@/hooks/api/build/agent-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  EXPIRY_OPTIONS,
  createSchema,
  type ExpiryValue,
  type CreateFormValues,
} from "./agent-token-schema";

type DialogPhase = "form" | "reveal";

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTokenDialog({ open, onOpenChange }: CreateTokenDialogProps) {
  const [phase, setPhase] = useState<DialogPhase>("form");
  const [expiry, setExpiry] = useState<ExpiryValue>("90");
  const [created, setCreated] = useState<CreateAgentTokenResponse | null>(null);
  const createToken = useCreateAgentToken();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

  const handleExpiryChange = useCallback((val: string) => {
    const matched = EXPIRY_OPTIONS.find((o) => o.value === val);
    if (matched) setExpiry(matched.value);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        form.reset();
        setPhase("form");
        setExpiry("90");
        setCreated(null);
      }
      onOpenChange(next);
    },
    [form, onOpenChange],
  );

  const handleSubmit = useCallback(
    (values: CreateFormValues) => {
      const expiresInDays = expiry === "never" ? undefined : Number(expiry);
      createToken.mutate(
        { name: values.name, expiresInDays },
        {
          onSuccess: (data) => {
            setCreated(data);
            setPhase("reveal");
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [createToken, expiry],
  );

  const handleCopyToken = useCallback(() => {
    if (!created) return;
    void navigator.clipboard.writeText(created.token).then(() => {
      toast.success("Token copied to clipboard");
    });
  }, [created]);

  const handleDone = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {phase === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>New agent token</DialogTitle>
              <DialogDescription>
                Tokens grant AI agents access to your projects. Keep them secret.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Cursor dev machine" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="token-expiry">Expiry</Label>
                  <Select value={expiry} onValueChange={handleExpiryChange}>
                    <SelectTrigger id="token-expiry">
                      <SelectValue placeholder="Select expiry" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDone}>
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    isPending={createToken.isPending}
                    loadingText="Creating…"
                  >
                    Create token
                  </LoadingButton>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
              <DialogDescription>
                Copy your token now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative bg-muted rounded-md p-3">
                <p className="text-xs font-mono break-all pr-8 leading-relaxed select-all">
                  {created?.token}
                </p>
                <div className="absolute top-2 right-2">
                  <AnimatedIconButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-1 text-muted-foreground hover:text-foreground"
                    onClick={handleCopyToken}
                    aria-label="Copy token"
                    icon={CopyIcon}
                    iconSize={14}
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2.5">
                <span className="text-status-warning-ink shrink-0 mt-px text-sm">⚠</span>
                  <p className="text-xs text-status-warning-ink-strong leading-relaxed">
                  This token will not be shown again. Store it securely before closing this dialog.
                </p>
              </div>
            </div>
            <DialogFooter>
              <AnimatedIconButton
                variant="outline"
                onClick={handleCopyToken}
                icon={CopyIcon}
                iconSize={16}
                iconClassName="mr-1.5"
              >
                Copy token
              </AnimatedIconButton>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
