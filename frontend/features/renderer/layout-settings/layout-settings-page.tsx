"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { LAYOUT_REGISTRY, type RegisteredLayout } from "@/lib/renderer/registry";
import { useAccess } from "@/hooks/api/access";
import { validateAdjustment, type LayoutAdjustment } from "@/lib/renderer/layout-adjustment";
import {
  useCanAdjustLayouts,
  useLayoutAdjustment,
  useResetLayoutAdjustment,
  useSaveLayoutAdjustment,
} from "@/hooks/api/renderer/layouts";
import {
  adjustmentFrom,
  draftFrom,
  moveRow,
  setGroup,
  setHidden,
  type FieldRowDraft,
} from "./arrangement-draft";
import { FieldArrangement } from "./field-arrangement";
import { LayoutProposalPanel } from "./layout-proposal-panel";

/**
 * Where a tenant arranges a record type.
 *
 * A page rather than a dialog. Reordering twenty fields, hiding some and
 * grouping the rest is multi-step work with a state a person could lose by
 * pressing Escape, and that is the line a modal is on the wrong side of.
 */
export function LayoutSettingsPage() {
  const canAdjust = useCanAdjustLayouts();
  const access = useAccess();
  const [layoutKey, setLayoutKey] = useState<string | null>(null);

  /*
    Only the record types this account may read.

    Arranging a record type you cannot see is not a job anybody has, and the
    picker would otherwise name the fields of modules a tenant has not bought.
    It is the same read gate each surface already uses — an arrangement neither
    grants access nor needs more of it than looking at the list does.
  */
  const allowed = useMemo<RegisteredLayout[]>(() => {
    const scopes = access.data;
    if (!scopes) return [];
    return LAYOUT_REGISTRY.filter(
      (entry) => scopes.isOrgOwner || entry.viewPermission in scopes.scopes,
    );
  }, [access.data]);

  const sections = useMemo(() => {
    const grouped = new Map<string, RegisteredLayout[]>();
    for (const entry of allowed) {
      const list = grouped.get(entry.section) ?? [];
      list.push(entry);
      grouped.set(entry.section, list);
    }
    return [...grouped.entries()];
  }, [allowed]);

  const layout = useMemo(
    () =>
      allowed.find((entry) => entry.layout.key === layoutKey)?.layout ??
      allowed[0]?.layout,
    [allowed, layoutKey],
  );

  const stored = useLayoutAdjustment(layout?.key ?? "");
  const save = useSaveLayoutAdjustment(layout?.key ?? "");
  const reset = useResetLayoutAdjustment(layout?.key ?? "");

  /*
    The edit is held only once somebody makes one, and the arrangement on screen
    is otherwise derived from what the server sent. Copying the server's answer
    into state in an effect would render one arrangement and then replace it,
    which is the flash this screen exists to avoid on every other surface.
  */
  const [edited, setEdited] = useState<{ key: string; rows: FieldRowDraft[] } | null>(null);

  const saved = useMemo(
    () => (layout ? draftFrom(layout, stored.data) : []),
    [layout, stored.data],
  );
  const rows = edited && layout && edited.key === layout.key ? edited.rows : saved;

  const setRows = useCallback(
    (next: (current: FieldRowDraft[]) => FieldRowDraft[]) => {
      setEdited((current) => ({
        key: layout?.key ?? "",
        rows: next(current && current.key === layout?.key ? current.rows : saved),
      }));
    },
    [layout?.key, saved],
  );

  /*
    A permission check in flight is not an empty result. Showing "no record
    types" to somebody whose scopes have not arrived yet is the failure this
    product has already made thirty times over — a loading query dressed as
    emptiness — and it is worse here, because the honest answer a second later
    is the opposite one.
  */
  if (access.isLoading)
    return (
      <PageWrapper title="Record layouts">
        <div className="flex flex-1 flex-col gap-gap-inline">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      </PageWrapper>
    );

  if (access.isError)
    return (
      <PageWrapper title="Record layouts">
        <ErrorState
          title="Couldn't check what you may see"
          description="Which record types you can arrange depends on what you can read, and that check didn't load."
          onRetry={() => void access.refetch()}
        />
      </PageWrapper>
    );

  if (!layout)
    return (
      <PageWrapper title="Record layouts">
        {/*
          A denial, said as one. There are record types; this account may not
          read any of them.
        */}
        <EmptyState
          title="No record types you can arrange"
          description="Arranging a record type needs permission to read it. Ask an administrator for access to the records you want to lay out."
        />
      </PageWrapper>
    );

  const isBusy = save.isPending || reset.isPending;

  function handleApply(adjustment: LayoutAdjustment) {
    if (!layout) return;
    setEdited({ key: layout.key, rows: draftFrom(layout, adjustment) });
  }

  function handleSave() {
    if (!layout) return;
    const adjustment = adjustmentFrom(layout, rows);
    const problems = validateAdjustment(layout, adjustment);
    if (problems.length > 0) {
      toast.error(`${problems[0].where}: ${problems[0].message}`);
      return;
    }

    save.mutate(
      { order: adjustment.order, hidden: adjustment.hidden, groups: adjustment.groups },
      {
        onSuccess: () => toast.success(`${layout.plural} rearranged for your organisation`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleReset() {
    if (!layout) return;
    reset.mutate(undefined, {
      onSuccess: () => {
        setEdited(null);
        toast.success(`${layout.plural} restored to the standard arrangement`);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const hiddenCount = rows.filter((row) => row.hidden).length;

  return (
    <PageWrapper
      title="Record layouts"
      subtitle="Reorder, hide and group the fields on a record type. Everyone in your organisation sees the arrangement you save."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={layout.key} onValueChange={setLayoutKey}>
            <SelectTrigger
              className={cn(FILTER_SELECT_TRIGGER, "w-48")}
              aria-label="Record type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map(([section, entries]) => (
                <SelectGroup key={section}>
                  <SelectLabel>{section}</SelectLabel>
                  {entries.map((entry) => (
                    <SelectItem key={entry.layout.key} value={entry.layout.key}>
                      {entry.layout.plural}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        canAdjust ? (
          <div className="flex items-center gap-gap-field">
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={handleReset}>
              Restore standard
            </Button>
            <LoadingButton size="sm" isPending={save.isPending} onClick={handleSave}>
              Save arrangement
            </LoadingButton>
          </div>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-section">
        <p className="text-dense text-muted-foreground">
          Hiding a field takes it off the screen and nothing else. The value stays
          on the record, keeps arriving from the API, and comes back the moment you
          show the field again. It is not a permission — someone who may not read a
          field still may not read it, shown or hidden.
          {hiddenCount > 0
            ? ` ${hiddenCount} field${hiddenCount === 1 ? " is" : "s are"} hidden.`
            : ""}
        </p>

        {stored.isLoading ? (
          <div className="flex flex-col gap-gap-inline">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : stored.isError ? (
          <ErrorState
            title={`Couldn't load your ${layout.plural.toLowerCase()} arrangement`}
            description="The standard arrangement is still in use. Nothing has been changed."
            onRetry={() => void stored.refetch()}
          />
        ) : (
          <FieldArrangement
            rows={rows}
            disabled={!canAdjust || isBusy}
            onMove={(index, by) => setRows((current) => moveRow(current, index, by))}
            onHiddenChange={(name, hidden) =>
              setRows((current) => setHidden(current, name, hidden))
            }
            onGroupChange={(name, group) =>
              setRows((current) => setGroup(current, name, group))
            }
          />
        )}

        {canAdjust ? <LayoutProposalPanel layout={layout} onApply={handleApply} disabled={isBusy} /> : null}
      </div>
    </PageWrapper>
  );
}
