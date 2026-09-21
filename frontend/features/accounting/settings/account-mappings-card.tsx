"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCan } from "@/hooks/api/access";
import {
  useAccountMappings,
  usePostableAccounts,
} from "@/hooks/api/accounting/ledger";
import { useSetAccountSystemTag } from "@/hooks/api/accounting/ledger-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import type { GlSystemTag } from "@/types/accounting/accounting-kernel";
import type { AccountSystemTagMapping } from "@/types/accounting/accounting-kernel-ext";

/**
 * What each role is, in the language of the person mapping it.
 *
 * The tag itself (`grni`, `ap_control`) is the ledger's vocabulary, not an
 * operations manager's. Every row says what will post to the account, because
 * "Inventory asset" alone does not tell anyone whether a scrap belongs there.
 */
const ROLE_COPY: Partial<Record<GlSystemTag, { label: string; what: string }>> =
  {
    inventory: {
      label: "Inventory asset",
      what: "Everything you hold. Receipts debit it; shipments credit it.",
    },
    cogs: {
      label: "Cost of goods sold",
      what: "The cost of what you shipped, recognised when it ships.",
    },
    ap_control: {
      label: "Accounts payable",
      what: "What you owe suppliers. Moved only by bills and payments.",
    },
    ar_control: {
      label: "Accounts receivable",
      what: "What customers owe you. Moved only by invoices and receipts.",
    },
    sales: {
      label: "Sales revenue",
      what: "Revenue from a sales order, at the invoiced total.",
    },
    grni: {
      label: "Goods received not invoiced",
      what: "Goods you have taken in and not yet been billed for.",
    },
    inventory_write_off: {
      label: "Inventory write-off",
      what: "Scrap, quality write-off, recall destruction — stock that left without a sale.",
    },
    inventory_adjustment: {
      label: "Inventory adjustment",
      what: "Count variance both ways. A loss debits it, a gain credits it.",
    },
  };

const UNMAPPED = "__unmapped__";

interface AccountMappingsCardProps {
  /** Off when the org has no book — there is nothing to map into. */
  enabled: boolean;
}

export function AccountMappingsCard({ enabled }: AccountMappingsCardProps) {
  const canManage = useCan("accounting:accounts:manage");
  const mappings = useAccountMappings({ enabled });
  const accounts = usePostableAccounts({ enabled });
  const setTag = useSetAccountSystemTag();

  /*
    Only the roles inventory depends on. The book carries forty-odd roles and a
    screen listing all of them is a screen nobody reads; the ones that break a
    goods receipt are the ones worth asking somebody to check. The rest are set
    from the chart template and edited on the chart itself.
  */
  const rows = useMemo(
    () =>
      (mappings.data ?? []).filter(
        (m) => m.requiredByInventory || m.awaitingInventorySupport,
      ),
    [mappings.data],
  );

  const unmappedRequired = rows.filter(
    (r) => r.requiredByInventory && !r.account,
  ).length;

  function handleSelect(accountId: string, tag: GlSystemTag): void {
    setTag.mutate(
      { accountId, systemTag: tag },
      {
        onSuccess: () =>
          toast.success(`${roleLabel(tag)} now posts to this account`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!enabled) return null;

  return (
    <Card className="py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          Accounts inventory posts to
          {unmappedRequired > 0 ? (
            <Badge variant="destructive" className="h-5 px-2 text-xs">
              {unmappedRequired} not mapped
            </Badge>
          ) : null}
        </CardTitle>
        <p className="text-label text-muted-foreground">
          {unmappedRequired > 0
            ? "A goods receipt or shipment that needs an unmapped account will not go through at all. Map these before your next receipt."
            : "Stock movements resolve accounts by role, so renaming or renumbering your chart never breaks them."}
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {mappings.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-label text-muted-foreground">
            This book has no system roles yet. Re-run the chart of accounts
            setup.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((row) => (
              <MappingRow
                key={row.tag}
                mapping={row}
                canManage={canManage}
                options={(accounts.data ?? []).filter((a) =>
                  row.allowedAccountTypes.includes(a.accountType),
                )}
                isSaving={setTag.isPending}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function roleLabel(tag: GlSystemTag): string {
  return ROLE_COPY[tag]?.label ?? tag;
}

interface MappingRowProps {
  mapping: AccountSystemTagMapping;
  canManage: boolean;
  options: { id: string; code: string; name: string }[];
  isSaving: boolean;
  onSelect: (accountId: string, tag: GlSystemTag) => void;
}

function MappingRow({
  mapping,
  canManage,
  options,
  isSaving,
  onSelect,
}: MappingRowProps) {
  const copy = ROLE_COPY[mapping.tag];

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label font-medium">
            {copy?.label ?? mapping.tag}
          </span>
          {/*
            Said plainly rather than hidden. This role is seeded and correct and
            nothing posts to it yet; presenting it as a gap the operator caused
            would be a lie, and omitting it would hide a mapping they may want to
            move before it starts being used.
          */}
          {mapping.awaitingInventorySupport ? (
            <Badge variant="outline" className="h-5 px-2 text-xs">
              Not used yet
            </Badge>
          ) : null}
          {mapping.requiredByInventory && !mapping.account ? (
            <Badge variant="destructive" className="h-5 px-2 text-xs">
              Required
            </Badge>
          ) : null}
        </div>
        {copy ? (
          <p className="text-micro text-muted-foreground">{copy.what}</p>
        ) : null}
      </div>

      <div className="shrink-0 sm:w-72">
        {canManage ? (
          <Select
            value={mapping.account?.id ?? UNMAPPED}
            disabled={isSaving || options.length === 0}
            onValueChange={(value) => {
              if (value !== UNMAPPED) onSelect(value, mapping.tag);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Not mapped" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {/*
                Present but not choosable. Clearing a role is not the same
                action as moving it — it would leave the book unable to post —
                so this screen only ever moves one, and the placeholder exists
                so an unmapped role has something honest to show.
              */}
              <SelectItem value={UNMAPPED} disabled>
                Not mapped
              </SelectItem>
              {options.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="font-mono">{account.code}</span>{" "}
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : mapping.account ? (
          <p className="text-label">
            <span className="font-mono">{mapping.account.code}</span>{" "}
            {mapping.account.name}
          </p>
        ) : (
          <p className="text-label text-muted-foreground">Not mapped</p>
        )}
      </div>
    </li>
  );
}
