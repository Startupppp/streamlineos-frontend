"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useDismissLeavePolicyTemplates,
  useImportLeavePolicyTemplates,
  useLeavePolicyTemplateOffer,
  type LeavePolicyTemplateImportItem,
} from "@/hooks/api/hr/leave-policy-templates";
import type { LeavePolicyTemplateKey } from "@/hooks/api/hr/leave-policy-templates-schema";
import {
  TemplateRow,
  draftOf,
  rowErrors,
  type DraftRow,
} from "./leave-policy-template-row";

/**
 * Ticket 08. The first thing an administrator of a new organisation sees on
 * Leave Policies, and only then: the server decides whether to offer, from
 * whether any policy exists and whether anyone has already refused.
 *
 * Nothing is written until "Import"; "Not now" records the refusal and the
 * prompt never returns for this organisation.
 */
export function LeavePolicyTemplatesDialog() {
  const canManage = useCan("hr:leaves:manage");
  const { data: offer } = useLeavePolicyTemplateOffer();
  const dismiss = useDismissLeavePolicyTemplates();
  const importTemplates = useImportLeavePolicyTemplates();
  const [drafts, setDrafts] = useState<Record<string, DraftRow> | null>(null);
  const [closedInSession, setClosedInSession] = useState(false);

  const templates = useMemo(
    () =>
      (offer?.templates ?? []).filter(
        (template) => !offer?.alreadyPresent.includes(template.key),
      ),
    [offer],
  );

  const rows = useMemo(() => {
    if (drafts) return drafts;
    return Object.fromEntries(
      templates.map((template) => [template.key, draftOf(template)]),
    );
  }, [drafts, templates]);

  const updateRow = useCallback(
    (key: LeavePolicyTemplateKey, patch: Partial<DraftRow>) => {
      setDrafts((previous) => {
        const base = previous ?? rows;
        const current = base[key];
        if (!current) return base;
        return { ...base, [key]: { ...current, ...patch } };
      });
    },
    [rows],
  );

  const selected = templates.filter((template) => rows[template.key]?.selected);
  const errors = templates.map((template) => rowErrors(rows[template.key] ?? draftOf(template)));
  const hasErrors = errors.some((error) => Object.keys(error).length > 0);

  const handleDismiss = useCallback(() => {
    dismiss.mutate(undefined, {
      onSuccess: () => setClosedInSession(true),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [dismiss]);

  const handleImport = useCallback(() => {
    const items: LeavePolicyTemplateImportItem[] = selected.map((template) => {
      const row = rows[template.key] ?? draftOf(template);
      return {
        key: template.key,
        leaveTypeName: row.leaveTypeName.trim(),
        policyName: row.leaveTypeName.trim(),
        daysPerYear: Number(row.daysPerYear),
        carryForward: Number(row.carryForwardDays) > 0,
        accrualType: template.accrualType,
        accrualRate: row.accrualRate.trim(),
        maxBalance: template.maxBalance ?? undefined,
        carryForwardDays: row.carryForwardDays.trim(),
        encashable: template.encashable,
        probationRestricted: template.probationRestricted,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      };
    });

    importTemplates.mutate(items, {
      onSuccess: (result) => {
        setClosedInSession(true);
        toast.success(
          result.created === 1
            ? "Created 1 leave policy."
            : `Created ${result.created} leave policies.`,
        );
        if (result.skipped.length > 0) {
          toast.info(
            `${result.skipped.length} already had a policy and were left alone.`,
          );
        }
      },
      // The draft stays on screen and keeps every edit, so a failure is a retry
      // rather than a re-type.
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [importTemplates, rows, selected]);

  const open =
    canManage &&
    !closedInSession &&
    Boolean(offer?.shouldOffer) &&
    templates.length > 0;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Escape and the overlay mean "not now" in this session only; the refusal
      // that lasts is the explicit one, so the prompt returns on the next visit
      // until somebody answers it.
      if (!next) setClosedInSession(true);
    },
    [],
  );

  if (!open) return null;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start with three common leave policies?</DialogTitle>
          <DialogDescription>
            A starting point for a new organisation. Edit anything before
            importing — nothing is created until you choose Import.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {templates.map((template, index) => {
            const row = rows[template.key] ?? draftOf(template);
            const error = errors[index] ?? {};
            return (
              <TemplateRow
                key={template.key}
                template={template}
                row={row}
                error={error}
                onChange={updateRow}
              />
            );
          })}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDismiss}
            disabled={dismiss.isPending || importTemplates.isPending}
          >
            Not now
          </Button>
          <LoadingButton
            type="button"
            onClick={handleImport}
            isPending={importTemplates.isPending}
            disabled={selected.length === 0 || hasErrors}
          >
            Import {selected.length === 1 ? "1 policy" : `${selected.length} policies`}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

