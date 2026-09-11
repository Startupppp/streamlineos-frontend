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
import { RecordForm, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  MCP_TOKEN_LAYOUT,
  withMcpScopeGroups,
} from "@/lib/renderer/crm/settings/mcp-token-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCrmAgentToken } from "@/hooks/api/crm";
import type { CreateAgentTokenResponse } from "@/types/projects";
import { requiredText, numberOr } from "./shared/record-payload";
import { CRM_MCP_SCOPE_GROUPS, resolveCrmMcpScopes } from "./mcp-scopes";

type DialogPhase = "form" | "reveal";

/** Ninety days, matching the layout's middle expiry option. */
const DEFAULT_EXPIRY_DAYS = 90;

interface CrmMcpTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Issuing an agent token, in two phases.
 *
 * The first is a generated form: three fields, described by `MCP_TOKEN_LAYOUT`,
 * with the scope options and their explanations filled in from
 * `mcp-scopes.ts` — which is where the groups live beside the permission keys
 * they resolve to, so this screen carries no second copy of a security decision.
 * The generated resolver validates the same description that rendered the
 * controls, which is what retired the hand-written `mcp-token-schema.ts` beside
 * it: two statements of what a token is could disagree, and one cannot.
 *
 * The second phase is not a record and is not described. The secret is shown
 * once, is not recoverable, and the only thing to do with it is copy it — there
 * is no field here, only a value and a warning.
 */
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
            {/*
              Keyed on the dialog's own state so a closed and reopened dialog
              starts blank rather than holding the last agent's name, which is
              how the form used to be reset by hand.
            */}
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
