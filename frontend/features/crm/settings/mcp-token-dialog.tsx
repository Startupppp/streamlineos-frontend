"use client";

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon } from "@animateicons/react/lucide";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateCrmAgentToken,
} from "@/hooks/api/crm";
import type { CreateAgentTokenResponse } from "@/types/projects";
import {
  CRM_MCP_EXPIRY_OPTIONS,
  mcpTokenSchema,
  type McpTokenFormValues,
} from "./mcp-token-schema";
import { CRM_MCP_SCOPE_GROUPS, resolveCrmMcpScopes } from "./mcp-scopes";

type DialogPhase = "form" | "reveal";

interface CrmMcpTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CrmMcpTokenDialog({
  open,
  onOpenChange,
}: CrmMcpTokenDialogProps) {
  const [phase, setPhase] = useState<DialogPhase>("form");
  const [created, setCreated] = useState<CreateAgentTokenResponse | null>(null);
  const createToken = useCreateCrmAgentToken();

  const form = useForm<McpTokenFormValues>({
    resolver: zodResolver(mcpTokenSchema),
    defaultValues: {
      name: "",
      scopeGroup: "relationship",
      expiresInDays: "90",
    },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        form.reset();
        setCreated(null);
        setPhase("form");
      }
      onOpenChange(next);
    },
    [form, onOpenChange],
  );

  const handleSubmit = useCallback(
    (values: McpTokenFormValues) => {
      createToken.mutate(
        {
          name: values.name,
          expiresInDays: Number(values.expiresInDays),
          scopes: resolveCrmMcpScopes(values.scopeGroup),
        },
        {
          onSuccess: (response) => {
            setCreated(response);
            setPhase("reveal");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [createToken],
  );

  const handleCopy = useCallback(() => {
    if (!created) return;
    void navigator.clipboard.writeText(created.token).then(() => {
      toast.success("Token copied");
    });
  }, [created]);

  const handleDone = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {phase === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>New CRM agent token</DialogTitle>
              <DialogDescription>
                Scope this token to the CRM tools the agent should be allowed to use.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sales desk agent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scopeGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a CRM scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CRM_MCP_SCOPE_GROUPS.map((group) => (
                            <SelectItem key={group.value} value={group.value}>
                              {group.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {
                          CRM_MCP_SCOPE_GROUPS.find(
                            (group) => group.value === field.value,
                          )?.description
                        }
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select expiry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CRM_MCP_EXPIRY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDone}>
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    isPending={createToken.isPending}
                    loadingText="Creating"
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
                Copy this token now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-muted p-3">
              <p className="break-all pr-8 font-mono text-xs leading-relaxed">
                {created?.token}
              </p>
            </div>
            <DialogFooter>
              <AnimatedIconButton
                type="button"
                variant="outline"
                onClick={handleCopy}
                icon={CopyIcon}
                iconSize={16}
                iconClassName="mr-1.5"
              >
                Copy token
              </AnimatedIconButton>
              <Button type="button" onClick={handleDone}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
