"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePersonalDetails } from "@/server/actions/onboarding-actions";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useOnboardingSubmit } from "@/lib/hooks/use-onboarding-submit";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";
import type { Variants } from "framer-motion";

const MAX_EXPERIENCE_YEARS = 60;

const personalSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]+$/, "Only digits, spaces, parentheses, and hyphens allowed")
    .refine((val) => val.replace(/\D/g, "").length === 10, "Phone number must be exactly 10 digits"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Please select a gender" }),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  experienceYears: z
    .string()
    .min(1, "Experience is required")
    .refine((v) => Number(v) >= 0, "Experience cannot be negative")
    .refine((v) => Number(v) <= MAX_EXPERIENCE_YEARS, `Experience cannot exceed ${MAX_EXPERIENCE_YEARS} years`),
  skills: z.string().min(3, "Add at least one skill").refine((val) => val.includes(","), "Please separate skills with commas (e.g., React, Node.js)"),
});

type PersonalFormValues = z.infer<typeof personalSchema>;

interface PersonalInfoTabProps {
  onComplete: (values: Record<string, string | undefined>) => void;
  defaultValues?: Record<string, string | undefined>;
}

const staggerVariants = staggerContainer as Variants;
const fadeUpVariants = fadeUp as Variants;

export function PersonalInfoTab({ onComplete, defaultValues }: PersonalInfoTabProps) {
  const { isLoading, handleSubmit } = useOnboardingSubmit(updatePersonalDetails, {
    successMessage: "Personal details saved!",
    onSuccess: onComplete,
  });
  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      phone: "",
      gender: undefined,
      dateOfBirth: "",
      experienceYears: "",
      skills: "",
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  return (
    <Card className="shadow-soft border-border">
      <CardContent className="pt-6">
        <motion.div variants={staggerVariants} initial="hidden" animate="visible">
          <motion.div variants={fadeUpVariants} className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">Welcome to Vaivamm!</h2>
            <p className="text-sm text-muted-foreground mt-1">Tell us a bit about yourself to get started.</p>
          </motion.div>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <motion.div variants={fadeUpVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+91 98765 43210"
                  maxLength={10}
                  inputMode="tel"
                  autoComplete="tel"
                  aria-required="true"
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Controller
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <DatePicker
                      id="dateOfBirth"
                      value={field.value}
                      onChange={field.onChange}
                      toDate={new Date()}
                      placeholder="Select date of birth"
                    />
                  )}
                />
                {errors.dateOfBirth && <p role="alert" className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
              </div>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="gender" className="w-full" aria-required="true" aria-invalid={!!errors.gender}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other / Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && <p role="alert" className="text-xs text-destructive">{errors.gender.message}</p>}
              </div>
              <div className="space-y-1.5">
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
                  aria-invalid={!!errors.experienceYears}
                />
                {errors.experienceYears && <p role="alert" className="text-xs text-destructive">{errors.experienceYears.message}</p>}
              </div>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="space-y-1.5">
              <Label htmlFor="skills">Skills <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
              <Input
                id="skills"
                {...form.register("skills")}
                placeholder="React, Node.js, TypeScript..."
                aria-required="true"
                aria-invalid={!!errors.skills}
              />
              {errors.skills && <p role="alert" className="text-xs text-destructive">{errors.skills.message}</p>}
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <FormNavButtons isLoading={isLoading} />
            </motion.div>
          </form>
        </motion.div>
      </CardContent>
    </Card>
  );
}
