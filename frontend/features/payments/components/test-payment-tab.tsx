"use client";

import { useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Check, Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateTestTransaction,
  useVerifyTestTransaction,
  useTestTransactions,
} from "@/hooks/api/payments";

const TIMELINE_STEPS = ["order created", "checkout opened", "payment returned", "signature verified"] as const;

export function TestPaymentTab({ providerKey }: { providerKey: string }) {
  const [amount, setAmount] = useState("499.00");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [timelineStep, setTimelineStep] = useState(0);
  const [failed, setFailed] = useState(false);

  const createTransaction = useCreateTestTransaction(providerKey);
  const verifyTransaction = useVerifyTestTransaction(providerKey);
  const { data: transactions } = useTestTransactions(providerKey);

  function runTestPayment() {
    setFailed(false);
    setTimelineStep(0);
    createTransaction.mutate(
      { amount, currency: "INR" },
      {
        onSuccess: (transaction) => {
          setTimelineStep(1);
          if (!razorpayLoaded || !transaction.providerOrderId || !transaction.keyId) {
            toast.error("Razorpay Checkout hasn't loaded yet — try again in a moment");
            return;
          }
          setTimelineStep(2);
          const rz = new window.Razorpay({
            key: transaction.keyId,
            order_id: transaction.providerOrderId,
            amount: Number(transaction.amount) * 100,
            currency: transaction.currency,
            name: "StreamlineOS test payment",
            description: "Payment setup test — not a real charge in test mode",
            handler: (response: RazorpayPaymentResponse) => {
              setTimelineStep(3);
              verifyTransaction.mutate(
                {
                  id: transaction.id,
                  providerPaymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                },
                {
                  onSuccess: (verified) => {
                    if (verified.signatureVerified) {
                      setTimelineStep(4);
                      toast.success("Test payment verified!");
                    } else {
                      setFailed(true);
                      toast.error("Signature verification failed");
                    }
                  },
                  onError: (err) => {
                    setFailed(true);
                    toast.error(getErrorMessage(err));
                  },
                },
              );
            },
          });
          rz.open();
        },
        onError: (err) => {
          setFailed(true);
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />

      <p className="text-[13px] text-muted-foreground">
        Runs a real order against your test credentials — no money moves. Use this to prove the
        integration works before activating live payments.
      </p>

      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="test-amount" className="text-[13px]">Amount (INR)</Label>
          <Input
            id="test-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-sm w-32"
          />
        </div>
        <Button
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={runTestPayment}
          disabled={createTransaction.isPending || verifyTransaction.isPending}
        >
          <PlayCircle className="h-3.5 w-3.5" /> Run test payment
        </Button>
      </div>

      {(createTransaction.isPending || timelineStep > 0) && (
        <ol className="space-y-1.5">
          {TIMELINE_STEPS.map((label, i) => {
            const stepIndex = i + 1;
            const done = timelineStep >= stepIndex;
            const active = timelineStep === stepIndex - 1 && !failed;
            return (
              <li key={label} className="flex items-center gap-2 text-[12px]">
                <span
                  className={cn(
                    "h-4 w-4 rounded-full flex items-center justify-center shrink-0",
                    done ? "bg-emerald-500" : active ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  {done ? (
                    <Check className="h-2.5 w-2.5 text-white" />
                  ) : active ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                  ) : null}
                </span>
                <span className={cn(done ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {transactions && transactions.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Recent test payments
          </p>
          <ul className="space-y-1">
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between text-[12px] text-muted-foreground">
                <span>
                  {t.currency} {t.amount}
                </span>
                <span className={t.status === "succeeded" ? "text-emerald-600 dark:text-emerald-400" : t.status === "failed" ? "text-rose-600 dark:text-rose-400" : ""}>
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
