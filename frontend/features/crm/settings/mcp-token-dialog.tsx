"use client";

import { useCallback, useMemo, useState } from "react";
import { CopyIcon } from "@animateicons/react/lucide";
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
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  MCP_TOKEN_LAYOUT,
  withMcpScopeGroups,
} from "@/lib/renderer/crm/settings/mcp-token-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCrmAgentToken } from "@/hooks/api/crm";
import type { CreateAgentTokenResponse } from "@/types/projects/agent-tokens";
import { requiredText, numberOr } from "./shared/record-payload";
import { CRM_MCP_SCOPE_GROUPS, resolveCrmMcpScopes } from "./mcp-scopes";

type DialogPhase = "form" | "reveal";

const DEFAULT_EXPIRY_DAYS = 90;

interface CrmMcpTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CrmMcpTokenDialog({ open, onOpenChange }: CrmMcpTokenDialogProps) {
  const [phase, setPhase] = useState<DialogPhase>("form");
  const [created, setCreated] = useState<CreateAgentTokenResponse | null>(null);
  const createToken = useCreateCrmAgentToken();

  const tenantLayout = useTenantLayout(MCP_TOKEN_LAYOUT);
  const layout = useMemo(
    () => withMcpScopeGroups(tenantLayout, CRM_MCP_SCOPE_GROUPS),
    [tenantLayout],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setCreated(null);
        setPhase("form");
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      createToken.mutate(
        {
          name: requiredText(values, "name"),
          expiresInDays: numberOr(values, "expiresInDays", DEFAULT_EXPIRY_DAYS),
          scopes: resolveCrmMcpScopes(requiredText(values, "scopeGroup")),
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
            
            <RecordForm
              key={open ? "open" : "closed"}
              layout={layout}
              mode="create"
              initial={{ scopeGroup: "relationship", expiresInDays: String(DEFAULT_EXPIRY_DAYS) }}
              onSubmit={handleSubmit}
              onCancel={handleDone}
              isSubmitting={createToken.isPending}
              submitLabel="Create token"
            />
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
