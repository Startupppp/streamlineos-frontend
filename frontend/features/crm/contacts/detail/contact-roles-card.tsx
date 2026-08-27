"use client";

import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { AppDialog } from "@/components/shared/app-dialog";
import {
  RecordForm,
  renderFieldValue,
  resolveField,
  type RecordFormValues,
} from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  CONTACT_ROLE_LAYOUT,
  packEntityRef,
  unpackEntityRef,
} from "@/lib/renderer/crm/contact-role-layout";
import {
  useContactRoles,
  useAddContactRole,
  useRemoveContactRole,
  useDeals,
  useCrmOrganizations,
} from "@/hooks/api/crm";
import { useCan, useCanState } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";

interface ContactRolesCardProps {
  contactId: number;
}

/**
 * Who this person is on each deal and account they touch.
 *
 * The add form is generated from `CONTACT_ROLE_LAYOUT`, which replaced a
 * hand-written popover carrying its own Zod schema, its own `formatRoleKey`
 * regex turning `decision_maker` into "Decision Maker", and four `form.watch` /
 * `form.setValue` pairs standing in for the controlled fields react-hook-form
 * already provides. The role names now live in the description, so the chips and
 * the dropdown cannot disagree about what a role is called.
 *
 * It moved out of a `<Popover>` and into `AppDialog`. Principle 4 puts work with
 * its own validation and losable state in a dialog or a sheet rather than a
 * popover, and a 288px popover was not a place a record picker fit.
 *
 * The chips render through `renderFieldValue`, so a champion is the same green
 * here as anywhere else the engine paints one, and the primary flag reads
 * "Primary" instead of an unexplained star.
 */
export function ContactRolesCard({ contactId }: ContactRolesCardProps) {
  const layout = useTenantLayout(CONTACT_ROLE_LAYOUT);
  const canManage = useCan("crm:contacts:manage");
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const [addOpen, setAddOpen] = useState(false);

  const { data: roles, isLoading, isError, error, refetch } = useContactRoles(contactId);
  const addRole = useAddContactRole();
  const removeRole = useRemoveContactRole();

  /*
    Both lists are fetched for one picker. Each hook self-gates on its own read
    permission, so a caller who may see deals but not accounts is offered deals
    and nothing else, rather than an empty picker or a 403 on submit.
  */
  const { data: deals = [] } = useDeals({ limit: 100 });
  const { data: orgsData } = useCrmOrganizations({ page: 1, limit: 100 });

  const entityOptions = useMemo<ComboboxOption[]>(
    () => [
      ...deals.map((deal) => ({
        value: packEntityRef("deal", deal.id),
        label: deal.name,
        sublabel: "Deal",
      })),
      ...(orgsData?.organizations ?? []).map((company) => ({
        value: packEntityRef("company", company.id),
        label: company.name,
        sublabel: "Company",
      })),
    ],
    [deals, orgsData],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenAdd = useCallback(() => setAddOpen(true), []);
  const handleCloseAdd = useCallback(() => setAddOpen(false), []);

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      const entity = unpackEntityRef(values.entityId ?? "");
      if (!entity) {
        toast.error("Choose the deal or company this role applies to.");
        return;
      }

      addRole.mutate(
        {
          contactId,
          input: {
            entityType: entity.entityType,
            entityId: entity.entityId,
            roleKey: values.roleKey ?? "",
            // The engine keeps every control's value a string; the flag is
            // converted here, at the boundary, like a date or a tag list.
            isPrimary: values.isPrimary === "true",
          },
        },
        {
          onSuccess: () => {
            toast.success("Role added");
            setAddOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [addRole, contactId],
  );

  const handleRemove = useCallback(
    (roleId: string) => {
      removeRole.mutate(
        { contactId, roleId },
        {
          onSuccess: () => toast.success("Role removed"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [removeRole, contactId],
  );

  const roleField = resolveField(layout, "roleKey");
  const primaryField = resolveField(layout, "isPrimary");

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:contacts:view") === "denied")
    return <NoPermissionState permission="crm:contacts:view" />;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">Buying committee roles</CardTitle>
        {canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 text-xs"
            onClick={handleOpenAdd}
            {...hoverHandlers}
          >
            <PlusIcon ref={iconRef} size={14} />
            Add role
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="px-4 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-gap-field">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load roles"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : !roles || roles.length === 0 ? (
          <EmptyState
            compact
            className="border-0 bg-transparent py-4"
            title="No roles yet"
            description="Record who champions, signs off on or blocks a deal, so the committee is not one person's memory."
            action={canManage ? { label: "Add role", onClick: handleOpenAdd } : undefined}
            actionVariant="outline"
          />
        ) : (
          <ul className="flex flex-wrap gap-gap-field">
            {roles.map((role) => (
              <li key={role.id} className="flex items-center gap-gap-inline">
                {renderFieldValue(roleField, role.roleKey)}
                {role.isPrimary ? renderFieldValue(primaryField, true) : null}
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(role.id)}
                    disabled={removeRole.isPending}
                    aria-label="Remove role"
                  >
                    <X className="size-3" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {canManage ? (
        <AppDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          title="Add a role"
          description="Say who this person is on a deal or account."
        >
          <RecordForm
            // Remounted per open so a cancelled attempt does not come back
            // half-filled the next time the dialog is opened.
            key={String(addOpen)}
            layout={layout}
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCloseAdd}
            isSubmitting={addRole.isPending}
            submitLabel="Add role"
            /*
              One picker for a pointer with two possible kinds. The description
              cannot name the domain — there are two — and it should not have to:
              which records this caller may attach depends on their permissions,
              which is a screen concern. The value carries its own kind and the
              submit handler splits it.
            */
            controls={{
              entityId: (control) => (
                <Combobox
                  options={entityOptions}
                  value={control.value}
                  onChange={control.onChange}
                  disabled={control.disabled}
                  placeholder="Select a deal or company"
                  searchPlaceholder="Search deals and companies"
                  emptyText="Nothing to attach this role to"
                />
              ),
            }}
          />
        </AppDialog>
      ) : null}
    </Card>
  );
}
