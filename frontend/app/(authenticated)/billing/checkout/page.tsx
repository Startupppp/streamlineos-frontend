"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import Script from "next/script";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useBillingPlans,
  useCreateSubscriptionOrder,
  useValidateCoupon,
  useVerifySubscription,
} from "@/hooks/api/subscription";
import type { BillingCycle, SubscriptionPlan } from "@/hooks/api/subscription";
const STEPS = [
  "Select Platform",
  "Apps & Bundles",
  "Seats",
  "AI Credits",
  "Review Pricing",
  "Tax Details",
  "Payment",
  "Confirmation",
] as const;

type StepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface SolutionBundle {
  id: string;
  name: string;
  apps: string[];
  monthlyPrice: number;
  savings: number;
}

const SOLUTION_BUNDLES: SolutionBundle[] = [
  {
    id: "sales",
    name: "Sales Suite",
    apps: ["CRM", "Calendar", "Chat", "AI"],
    monthlyPrice: 59900,
    savings: 15,
  },
  {
    id: "people",
    name: "People Suite",
    apps: ["HRMS", "Leave", "Attendance", "Payroll"],
    monthlyPrice: 79900,
    savings: 20,
  },
  {
    id: "operations",
    name: "Operations Suite",
    apps: ["Inventory", "Purchase", "Warehouse"],
    monthlyPrice: 49900,
    savings: 15,
  },
  {
    id: "finance",
    name: "Finance Suite",
    apps: ["Accounting", "Expenses", "Reports"],
    monthlyPrice: 44900,
    savings: 10,
  },
];

interface AiPack {
  id: string;
  name: string;
  credits: number;
  priceInPaise: number;
}

const AI_PACKS: AiPack[] = [
  { id: "none", name: "No extra credits", credits: 0, priceInPaise: 0 },
  { id: "starter", name: "Starter Pack", credits: 500, priceInPaise: 49900 },
  { id: "growth", name: "Growth Pack", credits: 2000, priceInPaise: 149900 },
  { id: "scale", name: "Scale Pack", credits: 5000, priceInPaise: 299900 },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
];

const SELLER_STATE = "Maharashtra";

const PLAN_DEFAULT_SEATS: Record<SubscriptionPlan, number> = {
  STARTER: 10,
  PROFESSIONAL: 50,
  ENTERPRISE: 500,
};

const VALID_PLANS: readonly SubscriptionPlan[] = [
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

const EXTRA_SEAT_PRICE = 29900;

interface MarketplaceApp {
  id: number;
  name: string;
  category: string;
  monthlyPrice: number;
}

function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return (VALID_PLANS as readonly string[]).includes(value);
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [plan, setPlan] = useState<SubscriptionPlan>("PROFESSIONAL");
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [extraSeats, setExtraSeats] = useState(0);
  const [selectedAiPack, setSelectedAiPack] = useState("none");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [supplyState, setSupplyState] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const { data: plansData } = useBillingPlans();
  const apps: MarketplaceApp[] = [];
  const createOrder = useCreateSubscriptionOrder();
  const verifySubscription = useVerifySubscription();
  const { data: coupon, isLoading: validatingCoupon } = useValidateCoupon(
    step >= 4 ? couponCode : "",
    plan,
  );

  const plans = plansData?.plans ?? [];
  const selectedPlan = plans.find((p) => p.id === plan);

  const platformPrice = selectedPlan
    ? billingCycle === "annual"
      ? Math.round(selectedPlan.monthlyPrice * 12 * 0.8)
      : selectedPlan.monthlyPrice
    : 0;

  const bundlesTotal = selectedBundles.reduce((sum, id) => {
    const bundle = SOLUTION_BUNDLES.find((b) => b.id === id);
    return sum + (bundle?.monthlyPrice ?? 0);
  }, 0);

  const appsTotal = selectedApps.reduce((sum, id) => {
    const app = apps.find((a) => a.id === id);
    return sum + (app?.monthlyPrice ?? 0);
  }, 0);

  const seatsTotal = extraSeats * EXTRA_SEAT_PRICE;

  const aiPack = AI_PACKS.find((p) => p.id === selectedAiPack);
  const aiTotal = aiPack?.priceInPaise ?? 0;

  const subtotal =
    platformPrice + bundlesTotal + appsTotal + seatsTotal + aiTotal;

  const discountAmount =
    coupon?.valid && coupon.discountAmount !== null ? coupon.discountAmount : 0;

  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  const hasGstin = gstin.trim().length === 15;
  const isIntrastate = hasGstin && supplyState === SELLER_STATE;
  const cgstAmount = isIntrastate
    ? Math.round(subtotalAfterDiscount * 0.09)
    : 0;
  const sgstAmount = isIntrastate
    ? Math.round(subtotalAfterDiscount * 0.09)
    : 0;
  const igstAmount = isIntrastate
    ? 0
    : Math.round(subtotalAfterDiscount * 0.18);
  const taxAmount = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = subtotalAfterDiscount + taxAmount;

  const defaultSeats = PLAN_DEFAULT_SEATS[plan];

  function handleRazorpayLoad() {
    setRazorpayLoaded(true);
  }

  function handlePlanSelectClick(e: React.MouseEvent<HTMLButtonElement>) {
    const planId = e.currentTarget.dataset.planId;
    if (planId && isSubscriptionPlan(planId)) {
      setPlan(planId);
    }
  }

  function handleBundleToggleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const bundleId = e.currentTarget.dataset.bundleId;
    if (!bundleId) return;
    setSelectedBundles((prev) =>
      prev.includes(bundleId)
        ? prev.filter((id) => id !== bundleId)
        : [...prev, bundleId],
    );
  }

  function handleAppToggleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const raw = e.currentTarget.dataset.appId;
    if (!raw) return;
    const appId = parseInt(raw, 10);
    if (isNaN(appId)) return;
    setSelectedApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId],
    );
  }

  function handleExtraSeatsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    setExtraSeats(isNaN(val) || val < 0 ? 0 : val);
  }

  function handleAiPackSelectClick(e: React.MouseEvent<HTMLButtonElement>) {
    const packId = e.currentTarget.dataset.packId;
    if (packId) {
      setSelectedAiPack(packId);
    }
  }

  function handleBillingCycleMonthly() {
    setBillingCycle("monthly");
  }

  function handleBillingCycleAnnual() {
    setBillingCycle("annual");
  }

  function handleCouponChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCouponCode(e.target.value.toUpperCase());
  }

  function handleGstinChange(e: React.ChangeEvent<HTMLInputElement>) {
    setGstin(e.target.value.toUpperCase());
  }

  function handleBusinessNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBusinessName(e.target.value);
  }

  function handleSupplyStateChange(value: string) {
    setSupplyState(value);
  }

  function handleNext() {
    setStep((s) => Math.min(s + 1, 7) as StepIndex);
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0) as StepIndex);
  }

  function handlePay() {
    createOrder.mutate(
      {
        plan,
        billingCycle,
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
            description: `${plan} Plan — ${billingCycle}`,
            handler: (response: RazorpayPaymentResponse) => {
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
                    setStep(7);
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

  function handleGoToDashboard() {
    router.push("/dashboard");
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={handleRazorpayLoad}
      />
      <PageWrapper
        title="Upgrade Plan"
        subtitle="Set up your StreamlineOS subscription"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {step < 7 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {STEPS.slice(0, 7).map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium border shrink-0 ${
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
                    className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}
                  >
                    {s}
                  </span>
                  {i < 6 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-3">
              {plans.map((p) => (
                <button
                  key={p.id}
                  data-plan-id={p.id}
                  onClick={handlePlanSelectClick}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    plan === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{p.name}</p>
                        {p.id === "PROFESSIONAL" && (
                          <Badge variant="default" className="text-xs">
                            Most Popular
                          </Badge>
                        )}
                      </div>
                      {p.maxEmployees !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Up to {p.maxEmployees} employees
                        </p>
                      )}
                      {p.features.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {p.features.slice(0, 4).map((f) => (
                            <li
                              key={f}
                              className="text-xs text-muted-foreground flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Badge
                      variant={plan === p.id ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {formatPrice(p.monthlyPrice)}/mo
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <Tabs defaultValue="bundles">
              <TabsList>
                <TabsTrigger value="bundles">Solution Bundles</TabsTrigger>
                <TabsTrigger value="apps">Individual Apps</TabsTrigger>
              </TabsList>
              <TabsContent value="bundles" className="mt-3 space-y-3">
                {SOLUTION_BUNDLES.map((bundle) => {
                  const isSelected = selectedBundles.includes(bundle.id);
                  return (
                    <button
                      key={bundle.id}
                      data-bundle-id={bundle.id}
                      onClick={handleBundleToggleClick}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center ${
                                isSelected
                                  ? "bg-primary border-primary"
                                  : "border-border"
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <p className="font-semibold text-sm">{bundle.name}</p>
                            <Badge
                              variant="secondary"
                              className="text-xs text-green-600 dark:text-green-400"
                            >
                              Save {bundle.savings}%
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2 ml-6">
                            {bundle.apps.map((app) => (
                              <span
                                key={app}
                                className="text-xs bg-muted px-1.5 py-0.5 rounded"
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-semibold shrink-0">
                          {formatPrice(bundle.monthlyPrice)}/mo
                        </span>
                      </div>
                    </button>
                  );
                })}
              </TabsContent>
              <TabsContent value="apps" className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {apps.map((app) => {
                    const isSelected = selectedApps.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        data-app-id={String(app.id)}
                        onClick={handleAppToggleClick}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`h-4 w-4 rounded border shrink-0 mt-0.5 flex items-center justify-center ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {app.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {app.category}
                            </p>
                          </div>
                          <span className="text-xs font-semibold shrink-0">
                            {formatPrice(app.monthlyPrice)}/mo
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Default seats included
                </p>
                <p className="text-3xl font-bold mt-1">{defaultSeats}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPlan?.name ?? plan} plan · Add more as you grow.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra-seats">Additional seats</Label>
                <Input
                  id="extra-seats"
                  type="number"
                  min={0}
                  value={extraSeats}
                  onChange={handleExtraSeatsChange}
                  className="w-36"
                />
                <p className="text-xs text-muted-foreground">
                  ₹299/seat/month
                </p>
                {extraSeats > 0 && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Extra seats cost ({extraSeats} × ₹299)
                      </span>
                      <span className="font-medium">
                        {formatPrice(seatsTotal)}/mo
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {AI_PACKS.map((pack) => {
                const isSelected = selectedAiPack === pack.id;
                return (
                  <button
                    key={pack.id}
                    data-pack-id={pack.id}
                    onClick={handleAiPackSelectClick}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full border shrink-0 flex items-center justify-center ${
                            isSelected ? "border-primary" : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{pack.name}</p>
                          {pack.credits > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {pack.credits.toLocaleString("en-IN")} AI
                              credits/mo
                            </p>
                          )}
                        </div>
                      </div>
                      {pack.priceInPaise > 0 ? (
                        <span className="text-sm font-semibold shrink-0">
                          {formatPrice(pack.priceInPaise)}/mo
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground shrink-0">
                          Free
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={billingCycle === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={handleBillingCycleMonthly}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === "annual" ? "default" : "outline"}
                  size="sm"
                  onClick={handleBillingCycleAnnual}
                >
                  Annual (Save 20%)
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-2.5 text-sm">
                <p className="font-semibold mb-1">Order Summary</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {selectedPlan?.name ?? plan} ({billingCycle})
                  </span>
                  <span>{formatPrice(platformPrice)}</span>
                </div>
                {selectedBundles.map((id) => {
                  const bundle = SOLUTION_BUNDLES.find((b) => b.id === id);
                  if (!bundle) return null;
                  return (
                    <div key={id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {bundle.name}
                      </span>
                      <span>{formatPrice(bundle.monthlyPrice)}</span>
                    </div>
                  );
                })}
                {selectedApps.map((id) => {
                  const app = apps.find((a) => a.id === id);
                  if (!app) return null;
                  return (
                    <div key={id} className="flex justify-between">
                      <span className="text-muted-foreground">{app.name}</span>
                      <span>{formatPrice(app.monthlyPrice)}</span>
                    </div>
                  );
                })}
                {extraSeats > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Extra seats ({extraSeats})
                    </span>
                    <span>{formatPrice(seatsTotal)}</span>
                  </div>
                )}
                {aiPack && aiPack.priceInPaise > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{aiPack.name}</span>
                    <span>{formatPrice(aiPack.priceInPaise)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Coupon ({couponCode})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2.5 flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotalAfterDiscount)}</span>
                </div>
              </div>

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
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ {coupon.message}
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">{coupon.message}</p>
                  ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN (optional)</Label>
                <Input
                  id="gstin"
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  value={gstin}
                  onChange={handleGstinChange}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  15-character GST identification number
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business-name">Business Name (optional)</Label>
                <Input
                  id="business-name"
                  placeholder="Your registered business name"
                  value={businessName}
                  onChange={handleBusinessNameChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supply-state">State</Label>
                <Select
                  value={supplyState}
                  onValueChange={handleSupplyStateChange}
                >
                  <SelectTrigger id="supply-state">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 space-y-2.5 text-sm">
                <p className="font-semibold mb-1">Estimated Tax</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotalAfterDiscount)}</span>
                </div>
                {isIntrastate ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST 9%</span>
                      <span>{formatPrice(cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST 9%</span>
                      <span>{formatPrice(sgstAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGST 18%</span>
                    <span>{formatPrice(igstAmount)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2.5 flex justify-between font-semibold">
                  <span>Total incl. tax</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4 space-y-2.5 text-sm">
                <p className="font-semibold mb-1">Order Summary</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {selectedPlan?.name ?? plan} ({billingCycle})
                  </span>
                  <span>{formatPrice(platformPrice)}</span>
                </div>
                {bundlesTotal + appsTotal + seatsTotal + aiTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Add-ons</span>
                    <span>
                      {formatPrice(
                        bundlesTotal + appsTotal + seatsTotal + aiTotal,
                      )}
                    </span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
                <div className="border-t border-border pt-2.5 flex justify-between font-semibold text-base">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  256-bit SSL Encrypted
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  PCI DSS Compliant
                </span>
                <span className="flex items-center gap-1">
                  <RefreshCcw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Cancel Anytime
                </span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePay}
                disabled={
                  !razorpayLoaded ||
                  createOrder.isPending ||
                  verifySubscription.isPending
                }
              >
                {createOrder.isPending || verifySubscription.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Pay {formatPrice(grandTotal)}
              </Button>
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col items-center text-center py-12 space-y-6">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Payment Successful!</h2>
                <p className="text-sm text-muted-foreground">
                  Your {selectedPlan?.name ?? plan} plan is now active
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2 text-left">
                <p className="text-sm font-medium mb-1">What&apos;s next</p>
                <Link
                  href="/setup"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">Set up your workspace</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/users"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">Invite your team</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">Explore integrations</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
              <Button onClick={handleGoToDashboard}>Go to Dashboard</Button>
            </div>
          )}

          {step < 7 && (
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < 6 && (
                <Button onClick={handleNext}>
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  );
}
