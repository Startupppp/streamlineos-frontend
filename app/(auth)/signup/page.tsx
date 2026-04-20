"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  companyName: z.string().min(1, "Company name is required"),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof signupSchema>;

const PLANS = [
  { id: "STARTER", name: "Starter", price: "999", features: ["Up to 10 users", "CRM + Lead Pipeline", "Basic HR"] },
  { id: "PROFESSIONAL", name: "Professional", price: "2,499", features: ["Up to 50 users", "Full CRM + AI", "HR + Recruitment", "Projects"] },
  { id: "ENTERPRISE", name: "Enterprise", price: "4,999", features: ["Unlimited users", "Everything in Pro", "Custom integrations", "Priority support"] },
];

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState("STARTER");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", companyName: "", phone: "" },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/signup", { ...data, plan: selectedPlan });
      toast.success("Account created! Signing you in...");

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = "/dashboard";
      } else {
        toast.error("Account created but auto-login failed. Please sign in manually.");
        window.location.href = "/signin";
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-1">
          {step === 1 ? "Choose a plan that fits your team" : "Enter your details to get started"}
        </p>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="grid gap-3">
            {PLANS.map((plan) => (
              <Label key={plan.id} htmlFor={plan.id} className="cursor-pointer">
                <Card className={`transition-all ${selectedPlan === plan.id ? "ring-2 ring-gold border-gold" : "hover:border-gold/50"}`}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        <span className="text-lg font-bold text-gold">INR {plan.price}</span>
                        <span className="text-xs text-muted-foreground">/month</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </RadioGroup>

          <p className="text-xs text-center text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>

          <Button onClick={() => setStep(2)} className="w-full">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input {...form.register("firstName")} placeholder="John" />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label>Last Name</Label>
              <Input {...form.register("lastName")} placeholder="Doe" />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Company Name</Label>
            <Input {...form.register("companyName")} placeholder="Acme Corp" />
            {form.formState.errors.companyName && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.companyName.message}</p>
            )}
          </div>

          <div>
            <Label>Work Email</Label>
            <Input {...form.register("email")} type="email" placeholder="john@company.com" />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label>Phone (optional)</Label>
            <Input {...form.register("phone")} placeholder="+91 98765 43210" />
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                {...form.register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              8+ chars, uppercase, lowercase, number, special character
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isSubmitting ? "Creating..." : "Start Free Trial"}
            </Button>
          </div>
        </form>
      )}

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="text-gold hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
