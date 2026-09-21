"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  PARTY_TAX_MANAGE,
  useAddPartyTaxRegistration,
  useRemovePartyTaxRegistration,
} from "@/hooks/api/accounting/parties";
import type { PartyTaxRegistration } from "@/types/accounting/accounting-ar";
import {
  TAX_REGIME_OPTIONS,
  partyTaxRegistrationSchema,
  toTaxRegistrationInput,
  type PartyTaxRegistrationValues,
} from "./party-tax-registration-schema";

interface PartyTaxRegistrationsCardProps {
  partyId: string;
  countryCode: string;
  registrations: PartyTaxRegistration[];
}

export function PartyTaxRegistrationsCard({
  partyId,
  countryCode,
  registrations,
}: PartyTaxRegistrationsCardProps) {
  const canManage = useCan(PARTY_TAX_MANAGE);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] =
    useState<PartyTaxRegistration | null>(null);
  const addRegistration = useAddPartyTaxRegistration();
  const removeRegistration = useRemovePartyTaxRegistration();

  function handleAdd(values: PartyTaxRegistrationValues): void {
    addRegistration.mutate(
      { partyId, input: toTaxRegistrationInput(values) },
      {
        onSuccess: () => {
          toast.success("Tax number saved");
          setAddOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleRemove(): void {
    if (!pendingRemoval) return;
    removeRegistration.mutate(
      { partyId, registrationId: pendingRemoval.id },
      {
        onSuccess: () => {
          toast.success("Tax number removed");
          setPendingRemoval(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Tax numbers</CardTitle>
          <CardDescription>
            Their GST or VAT number decides the tax we charge on every invoice.
          </CardDescription>
        </div>
        {canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            Add
          </AnimatedIconButton>
        ) : null}
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tax number on file. Invoices will fall back to the default rate
            for their country.
          </p>
        ) : (
          <ul className="space-y-2">
            {registrations.map((registration) => (
              <li
                key={registration.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-label font-medium">
                    {registration.number}
                  </p>
                  <p className="text-dense text-muted-foreground">
                    {registration.regime}
                    {registration.region ? ` · ${registration.region}` : ""}
                    {` · ${registration.countryCode}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {registration.isPrimary ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-2 py-0.5 text-micro"
                    >
                      Primary
                    </Badge>
                  ) : null}
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Remove ${registration.number}`}
                      onClick={() => setPendingRemoval(registration)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <EntityFormDialog<PartyTaxRegistrationValues>
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add a tax number"
        description="We read the place of supply from an Indian GSTIN automatically."
        resolver={zodResolver(partyTaxRegistrationSchema)}
        defaultValues={{
          regime: "GST_IN",
          number: "",
          region: "",
          countryCode: countryCode || "IN",
          isPrimary: registrations.length === 0,
        }}
        onSubmit={handleAdd}
        isSubmitting={addRegistration.isPending}
        submitLabel="Save tax number"
        resetOnOpen
      >
        {(form) => (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="regime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {TAX_REGIME_OPTIONS.map((option) => (
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
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="29AABCU9603R1ZM"
                      className="uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={2}
                        placeholder="IN"
                        className="uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State code</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={16} placeholder="29" />
                    </FormControl>
                    <FormDescription>
                      Leave blank to read it from the number.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-border/70 px-3 py-2">
                  <FormLabel>Use this one by default</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}
      </EntityFormDialog>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title="Remove this tax number?"
        description="Invoices already issued keep the number they were issued with. New invoices will use the next one on file."
        confirmLabel="Remove"
        destructive
        isPending={removeRegistration.isPending}
        onConfirm={handleRemove}
      />
    </Card>
  );
}
