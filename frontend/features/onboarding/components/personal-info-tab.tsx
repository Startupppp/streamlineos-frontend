"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { toast } from "sonner";
import { usePersonalInfoMutation } from "@/lib/api/hooks/onboarding";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";
import type { Variants } from "framer-motion";

const personalSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => isValidPhoneNumber(val), "Invalid phone number"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    error: "Please select a gender",
  }),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  addressLine1: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPostalCode: z.string().optional(),
  addressCountry: z.string().optional(),
  emergencyName: z.string().min(2, "Emergency contact name is required"),
  emergencyRelation: z.string().min(2, "Relationship is required"),
  emergencyPhone: z
    .string()
    .min(1, "Emergency contact phone is required")
    .refine((val) => isValidPhoneNumber(val), "Invalid phone number"),
});

type PersonalFormValues = z.infer<typeof personalSchema>;

interface PersonalInfoTabProps {
  onComplete: (values: Record<string, string | undefined>) => void;
  defaultValues?: Record<string, string | undefined>;
}

const staggerVariants = staggerContainer as Variants;
const fadeUpVariants = fadeUp as Variants;

export function PersonalInfoTab({
  onComplete,
  defaultValues,
}: PersonalInfoTabProps) {
  const { mutate, isPending } = usePersonalInfoMutation();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      phone: "",
      gender: undefined,
      dateOfBirth: "",
      addressLine1: "",
      addressCity: "",
      addressState: "",
      addressPostalCode: "",
      addressCountry: "",
      emergencyName: "",
      emergencyRelation: "",
      emergencyPhone: "",
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  function handleFormSubmit(values: PersonalFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success("Personal details saved!");
        onComplete(values as Record<string, string | undefined>);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to save personal details");
      },
    });
  }

  return (
    <div>
      <motion.div variants={staggerVariants} initial="hidden" animate="visible">
        <motion.div variants={fadeUpVariants} className="mb-5">
          <h2 className="text-xl font-semibold text-foreground">
            Welcome to StreamlineOS!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us a bit about yourself to get started.
          </p>
        </motion.div>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
          <motion.div
            variants={fadeUpVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                  />
                )}
              />
              {errors.phone && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
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
              {errors.dateOfBirth && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            className="space-y-1.5 sm:max-w-[calc(50%-0.5rem)]"
          >
            <Label htmlFor="gender">Gender</Label>
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="gender"
                    className="w-full"
                    aria-required="true"
                    aria-invalid={!!errors.gender}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">
                      Other / Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gender && (
              <p role="alert" className="text-xs text-destructive">
                {errors.gender.message}
              </p>
            )}
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-3 pt-1">
            <h3 className="text-sm font-semibold text-foreground">
              Home Address{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="addressLine1">Street Address</Label>
              <Input
                id="addressLine1"
                {...form.register("addressLine1")}
                placeholder="House / street"
                autoComplete="address-line1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  {...form.register("addressCity")}
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addressState">State</Label>
                <Input
                  id="addressState"
                  {...form.register("addressState")}
                  placeholder="State"
                  autoComplete="address-level1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addressPostalCode">Postal Code</Label>
                <Input
                  id="addressPostalCode"
                  {...form.register("addressPostalCode")}
                  placeholder="000000"
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addressCountry">Country</Label>
                <Input
                  id="addressCountry"
                  {...form.register("addressCountry")}
                  placeholder="Country"
                  autoComplete="country-name"
                />
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-3 pt-1">
            <h3 className="text-sm font-semibold text-foreground">
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyName">Full Name</Label>
                <Input
                  id="emergencyName"
                  {...form.register("emergencyName")}
                  placeholder="Contact name"
                  aria-required="true"
                  aria-invalid={!!errors.emergencyName}
                />
                {errors.emergencyName && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.emergencyName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyRelation">Relationship</Label>
                <Input
                  id="emergencyRelation"
                  {...form.register("emergencyRelation")}
                  placeholder="e.g. Parent, Spouse"
                  aria-required="true"
                  aria-invalid={!!errors.emergencyRelation}
                />
                {errors.emergencyRelation && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.emergencyRelation.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5 sm:max-w-[calc(50%-0.5rem)]">
              <Label htmlFor="emergencyPhone">Phone Number</Label>
              <Controller
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <PhoneInput
                    id="emergencyPhone"
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    aria-required="true"
                    aria-invalid={!!errors.emergencyPhone}
                  />
                )}
              />
              {errors.emergencyPhone && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.emergencyPhone.message}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeUpVariants}>
            <FormNavButtons isLoading={isPending} />
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
