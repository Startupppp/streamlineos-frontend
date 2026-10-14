"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import {
  useCalendarBookingPaymentPolicy,
  useCalendarBookingPayments,
  useReconcileCalendarBookingPayment,
  useSaveCalendarBookingPaymentPolicy,
} from "@/hooks/api/calendar/booking-payments";
import {
  bookingPaymentPolicyInputSchema,
  type BookingPaymentPolicy,
  type BookingPaymentPolicyInput,
} from "@/hooks/api/calendar/booking-payments-schema";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import { getErrorMessage } from "@/lib/get-error-message";

function formatMinor(amountMinor: number, currency: string): string {
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
    return formatter.format(amountMinor / 10 ** formatter.resolvedOptions().maximumFractionDigits);
  } catch {
    return `${amountMinor} minor units ${currency}`;
  }
}

function initialPolicy(current: BookingPaymentPolicy | null): BookingPaymentPolicyInput {
  return current ? {
    expectedVersion: current.version,
    status: current.status,
    providerKey: current.providerKey,
    environment: current.environment,
    amountMinor: current.amountMinor,
    currency: current.currency,
    refundableUntilMinutesBeforeStart: current.refundableUntilMinutesBeforeStart,
    lateCancellationRefundPercent: current.lateCancellationRefundPercent,
  } : {
    expectedVersion: null,
    status: "disabled",
    providerKey: "razorpay",
    environment: "test",
    amountMinor: 2500,
    currency: "INR",
    refundableUntilMinutesBeforeStart: 60,
    lateCancellationRefundPercent: 0,
  };
}

function PaymentPolicyEditor({ rule, current }: { rule: CalendarBookingRule; current: BookingPaymentPolicy | null }) {
  const canWrite = useCan("calendar:write");
  const save = useSaveCalendarBookingPaymentPolicy(rule.id);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<BookingPaymentPolicyInput>({ resolver: zodResolver(bookingPaymentPolicyInputSchema), defaultValues: initialPolicy(current) });
  const currency = form.watch("currency").toUpperCase();
  const amountMinor = form.watch("amountMinor");

  async function submit(input: BookingPaymentPolicyInput) {
    try {
      await save.mutateAsync(input);
      setError(null);
      toast.success("Payment policy saved");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <form className="space-y-3 rounded-md border p-3" onSubmit={form.handleSubmit(submit)}>
    <div><h4 className="font-medium">Payment policy</h4><p className="text-sm text-muted-foreground">{current ? `Version ${current.version}` : "No payment policy yet"}</p></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <fieldset disabled={!canWrite || save.isPending} className="space-y-3 disabled:opacity-70">
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="payment-policy-status">Status</Label><select id="payment-policy-status" className="w-full rounded-md border bg-background p-2 text-sm" {...form.register("status")}><option value="disabled">Disabled</option><option value="active">Active</option></select></div><div className="space-y-1"><Label htmlFor="payment-policy-environment">Environment</Label><select id="payment-policy-environment" className="w-full rounded-md border bg-background p-2 text-sm" {...form.register("environment")}><option value="test">Test</option><option value="live">Live</option></select></div></div>
      <div className="space-y-1"><Label htmlFor="payment-policy-provider">Payment provider</Label><Input id="payment-policy-provider" maxLength={60} {...form.register("providerKey")} />{form.formState.errors.providerKey ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.providerKey.message}</p> : null}</div>
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="payment-policy-amount">Amount in minor units</Label><Input id="payment-policy-amount" type="number" min={1} max={1_000_000_000} {...form.register("amountMinor", { valueAsNumber: true })} /></div><div className="space-y-1"><Label htmlFor="payment-policy-currency">Currency</Label><Input id="payment-policy-currency" maxLength={3} {...form.register("currency")} /></div></div>
      {Number.isFinite(amountMinor) && /^[A-Z]{3}$/.test(currency) ? <p className="text-sm text-muted-foreground">Displayed price: {formatMinor(amountMinor, currency)}</p> : null}
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="payment-policy-refund-window">Full refund until minutes before start</Label><Input id="payment-policy-refund-window" type="number" min={0} max={525600} {...form.register("refundableUntilMinutesBeforeStart", { valueAsNumber: true })} /></div><div className="space-y-1"><Label htmlFor="payment-policy-late-refund">Late refund percent</Label><Input id="payment-policy-late-refund" type="number" min={0} max={100} {...form.register("lateCancellationRefundPercent", { valueAsNumber: true })} /></div></div>
      {Object.keys(form.formState.errors).length ? <p role="alert" className="text-sm text-destructive">Review the payment policy values.</p> : null}
      <Button type="submit">Save payment policy</Button>
    </fieldset>
  </form>;
}

export function CalendarBookingPaymentsPanel({ rule, onBack }: { rule: CalendarBookingRule; onBack: () => void }) {
  const policy = useCalendarBookingPaymentPolicy(rule.id);
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);
  const payments = useCalendarBookingPayments(rule.id, cursor);
  const reconcile = useReconcileCalendarBookingPayment(rule.id, cursor);
  const canWrite = useCan("calendar:write");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reconcilePayment(sagaId: string) {
    if (!window.confirm("Recheck this payment and run its configured repair action?")) return;
    setBusyId(sagaId);
    try {
      await reconcile.mutateAsync(sagaId);
      setError(null);
      toast.success("Payment reconciliation completed");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return <div className="space-y-4"><Button variant="outline" onClick={onBack}>Back to booking pages</Button><div><h3 className="font-medium">Paid appointments</h3><p className="text-sm text-muted-foreground">{rule.title}</p></div>
    {error ? <p role="alert" className="rounded-md border border-destructive p-2 text-sm text-destructive">{error}</p> : null}
    {policy.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to payment policy.</p> : policy.access.unavailable || policy.isError ? <ErrorState title="Payment policy unavailable" error={policy.error} onRetry={() => void policy.refetch()} /> : policy.access.pending || policy.isPending ? <p role="status">Loading payment policy…</p> : <PaymentPolicyEditor key={`${rule.id}:${policy.data?.version ?? 0}`} rule={rule} current={policy.data ?? null} />}
    <div className="space-y-2"><h4 className="font-medium">Payment and booking states</h4>{payments.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to payment records.</p> : payments.access.unavailable || payments.isError ? <ErrorState title="Payments unavailable" error={payments.error} onRetry={() => void payments.refetch()} /> : payments.access.pending || payments.isPending ? <p role="status">Loading payments…</p> : payments.data?.items.length ? <div className="space-y-2">{payments.data.items.map((payment) => <div key={payment.sagaId} className="space-y-2 rounded-md border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{formatMinor(payment.amountMinor, payment.currency)}</span><span>Payment {payment.paymentState.replaceAll("_", " ")}</span></div><p>Booking {payment.bookingState} · Repair {payment.repairState.replaceAll("_", " ")}</p><p className="break-all text-xs text-muted-foreground">Payment {payment.sagaId}{payment.bookingId ? ` · Booking ${payment.bookingId}` : ""}</p>{payment.refundedAmountMinor ? <p>Refunded {formatMinor(payment.refundedAmountMinor, payment.currency)}</p> : null}{payment.repairState !== "none" && payment.repairState !== "resolved" && canWrite ? <Button size="sm" variant="outline" disabled={busyId === payment.sagaId} onClick={() => void reconcilePayment(payment.sagaId)}>Reconcile</Button> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No paid appointments for this booking page.</p>}<div className="flex gap-2">{previousCursors.length ? <Button variant="outline" onClick={() => { setCursor(previousCursors.at(-1) ?? null); setPreviousCursors(previousCursors.slice(0, -1)); }}>Newer</Button> : null}{payments.data?.nextCursor ? <Button variant="outline" onClick={() => { setPreviousCursors([...previousCursors, cursor]); setCursor(payments.data.nextCursor); }}>Older</Button> : null}</div></div>
  </div>;
}
