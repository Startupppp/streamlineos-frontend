"use client";

import { useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { Check, Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateTestTransaction,
  useVerifyTestTransaction,
  useTestTransactions,
} from "@/hooks/api/payments";

const RAZORPAY_STEPS = ["order created", "checkout opened", "payment returned", "signature verified"] as const;
// Stripe has no client signature: the backend charges Stripe's test card and reads the result back.
const STRIPE_STEPS = ["payment intent created", "test card charged", "confirmed by Stripe"] as const;

export function TestPaymentTab({ providerKey }: { providerKey: string }) {
  const [amount, setAmount] = useState("499.00");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [timelineStep, setTimelineStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const isStripe = providerKey === "stripe";
  const currency = isStripe ? "USD" : "INR";
  const timelineSteps = isStripe ? STRIPE_STEPS : RAZORPAY_STEPS;

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAmount(e.target.value);
  }

  function handleRazorpayLoad() {
    setRazorpayLoaded(true);
  }

  const canRunTest = useCan("payments:test:run");
  const createTransaction = useCreateTestTransaction(providerKey);
  const verifyTransaction = useVerifyTestTransaction(providerKey);
  const {
    data: transactions,
    isError: historyFailed,
    error: historyError,
    refetch: refetchHistory,
  } = useTestTransactions(providerKey);

  function handleRetryHistory() {
    void refetchHistory();
  }

  function verify(id: number, providerPaymentId: string, signature?: string) {
    verifyTransaction.mutate(
      { id, providerPaymentId, signature },
      {
        onSuccess: (verified) => {
          if (verified.signatureVerified) {
            setTimelineStep(timelineSteps.length);
            toast.success("Test payment verified");
          } else {
            setFailed(true);
            toast.error(isStripe ? "Stripe did not confirm the test payment" : "Signature verification failed");
          }
        },
        onError: (err) => {
          setFailed(true);
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  function runTestPayment() {
    setFailed(false);
    setTimelineStep(0);
    createTransaction.mutate(
      { amount, currency },
      {
        onSuccess: (transaction) => {
          setTimelineStep(1);
          if (isStripe) {
            if (!transaction.providerOrderId) {
              setFailed(true);
              toast.error("Stripe did not return a payment intent");
              return;
            }
            setTimelineStep(2);
            verify(transaction.id, transaction.providerOrderId);
            return;
          }
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
              verify(transaction.id, response.razorpay_payment_id, response.razorpay_signature);
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
      {isStripe ? null : <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={handleRazorpayLoad} />}

      <p className="text-label text-muted-foreground">
        Runs a real order against your test credentials — no money moves. Use this to prove the
        integration works before activating live payments.
      </p>

      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="test-amount" className="text-label">Amount ({currency})</Label>
          <Input
            id="test-amount"
            value={amount}
            onChange={handleAmountChange}
            className="text-sm w-32"
          />
        </div>
        {canRunTest ? (
          <Button
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={runTestPayment}
            disabled={createTransaction.isPending || verifyTransaction.isPending}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Run test payment
          </Button>
        ) : null}
      </div>

      {(createTransaction.isPending || timelineStep > 0) && (
        <ol className="space-y-1.5">
          {timelineSteps.map((label, i) => {
            const stepIndex = i + 1;
            const done = timelineStep >= stepIndex;
            const active = timelineStep === stepIndex - 1 && !failed;
            return (
              <li key={label} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "h-4 w-4 rounded-full flex items-center justify-center shrink-0",
                    done ? "bg-status-success-fill" : active ? "bg-primary/10" : "bg-muted",
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

      {historyFailed && (
        <ErrorState
          compact
          title="Failed to load recent test payments"
          description={getErrorMessage(historyError)}
          onRetry={handleRetryHistory}
        />
      )}

      {!historyFailed && transactions && transactions.length > 0 && (
        <div>
          <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Recent test payments
          </p>
          <ul className="space-y-1">
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t.currency} {t.amount}
                </span>
                <span className={t.status === "succeeded" ? "text-status-success-ink" : t.status === "failed" ? "text-status-danger-ink" : ""}>
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
