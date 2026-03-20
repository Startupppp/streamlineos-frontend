"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updatePersonalDetails } from "@/server/actions/onboarding-actions";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useOnboardingSubmit } from "@/lib/hooks/use-onboarding-submit";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";

const MAX_EXPERIENCE_YEARS = 60;

const personalSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]+$/, "Only digits, spaces, parentheses, and hyphens allowed")
    .refine((val) => val.replace(/\D/g, "").length === 10, "Phone number must be exactly 10 digits"),
  skills: z.string().min(3, "Add at least one skill").refine((val) => val.includes(","), "Please separate skills with commas (e.g., React, Node.js)"),
  experienceYears: z
    .string()
    .min(1, "Experience is required")
    .refine((v) => Number(v) >= 0, "Experience cannot be negative")
    .refine((v) => Number(v) <= MAX_EXPERIENCE_YEARS, `Experience cannot exceed ${MAX_EXPERIENCE_YEARS} years`),
});

type PersonalFormValues = z.infer<typeof personalSchema>;

interface PersonalInfoTabProps {
  onComplete: (values: Record<string, string | undefined>) => void;
  defaultValues?: Record<string, string | undefined>;
}

export function PersonalInfoTab({ onComplete, defaultValues }: PersonalInfoTabProps) {
  const { isLoading, handleSubmit } = useOnboardingSubmit(updatePersonalDetails, {
    successMessage: "Personal details saved!",
    onSuccess: onComplete,
  });
  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: { phone: "", skills: "", experienceYears: "", ...defaultValues },
  });

  return (
    <Card className="shadow-noir border-border">
      <CardContent className="pt-6">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Welcome to Vaivamm!</h2>
            <p className="text-sm text-muted-foreground mt-1">Tell us a bit about your professional background.</p>
          </motion.div>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+91 98765 43210"
                  maxLength={10}
                  inputMode="tel"
                  autoComplete="tel"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.phone}
                  aria-describedby={form.formState.errors.phone ? "phone-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary"
                />
                {form.formState.errors.phone && (
                  <p id="phone-error" role="alert" className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  {...form.register("experienceYears")}
                  type="number"
                  step="0.1"
                  min="0"
                  max={MAX_EXPERIENCE_YEARS}
                  inputMode="decimal"
                  placeholder="e.g. 2.5"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.experienceYears}
                  aria-describedby={form.formState.errors.experienceYears ? "experience-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary"
                />
                {form.formState.errors.experienceYears && (
                  <p id="experience-error" role="alert" className="text-sm text-destructive">{form.formState.errors.experienceYears.message}</p>
                )}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                {...form.register("skills")}
                placeholder="React, Node.js, TypeScript..."
                aria-required="true"
                aria-invalid={!!form.formState.errors.skills}
                aria-describedby={form.formState.errors.skills ? "skills-error" : undefined}
                className="text-base sm:text-sm focus-visible:ring-primary"
              />
              {form.formState.errors.skills && (
                <p id="skills-error" role="alert" className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
              )}
            </motion.div>
            <motion.div variants={fadeUp}>
              <FormNavButtons isLoading={isLoading} />
            </motion.div>
          </form>
        </motion.div>
      </CardContent>
    </Card>
  );
}
