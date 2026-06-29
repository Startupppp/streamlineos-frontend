"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import Script from "next/script";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useBillingPlans,
  useCreateSubscriptionOrder,
  useValidateCoupon,
  useVerifySubscription,
} from "@/hooks/api/subscription";
import type { BillingCycle, SubscriptionPlan } from "@/hooks/api/subscription";

const STEPS = ["Plan", "Billing Cycle", "Coupon", "Review & Pay"] as const;
type StepIndex = 0 | 1 | 2 | 3;

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [plan, setPlan] = useState<SubscriptionPlan>("PROFESSIONAL");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const { data: plansData } = useBillingPlans();
  const createOrder = useCreateSubscriptionOrder();
  const verifySubscription = useVerifySubscription();
  const { data: coupon, isLoading: validatingCoupon } = useValidateCoupon(
    step >= 2 ? couponCode : "",
    plan,
  );

  const plans = plansData?.plans ?? [];
  const selectedPlan = plans.find((p) => p.id === plan);
  const basePrice = selectedPlan
    ? cycle === "annual"
      ? Math.round(selectedPlan.monthlyPrice * 12 * 0.8)
      : selectedPlan.monthlyPrice
    : 0;
  const discountAmount =
    coupon?.valid && coupon.discountAmount !== null ? coupon.discountAmount : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  function handleNext() {
    setStep((s) => Math.min(s + 1, 3) as StepIndex);
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0) as StepIndex);
  }

  function handleRazorpayLoad() {
    setRazorpayLoaded(true);
  }

  function handlePlanSelect(planId: SubscriptionPlan) {
    setPlan(planId);
  }

  function handleCycleSelect(c: BillingCycle) {
    setCycle(c);
  }

  function handleCouponChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCouponCode(e.target.value.toUpperCase());
  }

  function handlePay() {
    createOrder.mutate(
      {
        plan,
        billingCycle: cycle,
        couponId:
          coupon?.valid && coupon.couponId !== null
            ? coupon.couponId
            : undefined,
      },
      {
        onSuccess: (order) => {
          const rz = new window.Razorpay({
            key: order.keyId ?? "",
            order_id: order.orderId,
            amount: order.amount,
            currency: "INR",
            name: "StreamlineOS",
            description: `${plan} Plan — ${cycle}`,
            handler: (response: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              verifySubscription.mutate(
                {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  plan,
                },
                {
                  onSuccess: () => {
                    toast.success("Subscription activated!");
                    router.push("/settings/subscription");
                  },
                },
              );
            },
          });
          rz.open();
        },
      },
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={handleRazorpayLoad}
      />
      <PageWrapper
        title="Upgrade Plan"
        subtitle="Choose the right plan for your team"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium border ${
                    i < step
                      ? "bg-primary text-primary-foreground border-primary"
                      : i === step
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlanSelect(p.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    plan === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      {p.maxEmployees !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Up to {p.maxEmployees} employees
                        </p>
                      )}
                    </div>
                    <Badge variant={plan === p.id ? "default" : "secondary"}>
                      ₹{(p.monthlyPrice / 100).toLocaleString("en-IN")}/mo
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {(["monthly", "annual"] as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => handleCycleSelect(c)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    cycle === c
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm capitalize">{c}</p>
                      {c === "annual" && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Save 20% vs monthly
                        </p>
                      )}
                    </div>
                    {selectedPlan && (
                      <span className="text-sm font-medium">
                        ₹
                        {(
                          (c === "annual"
                            ? Math.round(selectedPlan.monthlyPrice * 12 * 0.8)
                            : selectedPlan.monthlyPrice) / 100
                        ).toLocaleString("en-IN")}
                        <span className="text-xs text-muted-foreground">
                          {c === "annual" ? "/yr" : "/mo"}
                        </span>
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="coupon">Coupon Code (optional)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="coupon"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={handleCouponChange}
                    className="flex-1"
                  />
                  {validatingCoupon && (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  )}
                </div>
                {coupon &&
                  (coupon.valid ? (
                    <p className="text-xs text-green-600">
                      ✓ {coupon.message}
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">{coupon.message}</p>
                  ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-sm">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {selectedPlan?.name} — {cycle}
                  </span>
                  <span>₹{(basePrice / 100).toLocaleString("en-IN")}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon ({couponCode})</span>
                    <span>
                      -₹{(discountAmount / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{(finalPrice / 100).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handlePay}
                disabled={
                  !razorpayLoaded ||
                  createOrder.isPending ||
                  verifySubscription.isPending
                }
              >
                {createOrder.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1.5" />
                )}
                Pay ₹{(finalPrice / 100).toLocaleString("en-IN")}
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
