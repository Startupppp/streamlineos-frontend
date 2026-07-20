"use client";

import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
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
import {
  usePersonalDetailsQuery,
  usePersonalInfoMutation,
} from "@/lib/api/hooks/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";
import type { Variants } from "framer-motion";
import {
  ALL_COUNTRIES,
  EMERGENCY_RELATIONSHIPS,
  INDIA_COUNTRY_NAME,
  INDIAN_STATE_NAMES,
  citiesForState,
} from "@/lib/location/address-options";
import {
  personalInfoSchema,
  type PersonalInfoFormValues,
} from "@/lib/location/personal-info-validation";

interface PersonalInfoTabProps {
  onComplete: (values: Record<string, string | undefined>) => void;
  defaultValues?: Record<string, string | undefined>;
}

const staggerVariants = staggerContainer as Variants;
const fadeUpVariants = fadeUp as Variants;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function PersonalInfoTab({
  onComplete,
  defaultValues,
}: PersonalInfoTabProps) {
  const { mutate, isPending } = usePersonalInfoMutation();
  const { data: personalDetails } = usePersonalDetailsQuery();
  const hasHydratedDetails = useRef(false);

  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onChange",
    defaultValues: {
      phone: "",
      gender: undefined,
      dateOfBirth: "",
      addressLine1: "",
      addressCity: "",
      addressState: "",
      addressPostalCode: "",
      emergencyName: "",
      emergencyRelation: undefined,
      emergencyPhone: "",
      ...defaultValues,
      addressCountry: defaultValues?.addressCountry?.trim() || INDIA_COUNTRY_NAME,
    },
  });

  const { errors } = form.formState;
  const selectedCountry = form.watch("addressCountry");
  const effectiveCountry = selectedCountry?.trim() || INDIA_COUNTRY_NAME;
  const showIndianAddress = effectiveCountry === INDIA_COUNTRY_NAME;
  const selectedState = form.watch("addressState");
  const cityOptions = selectedState ? citiesForState(selectedState) : [];

  useEffect(() => {
    if (!personalDetails || hasHydratedDetails.current) return;

    const emergencyRelationship = EMERGENCY_RELATIONSHIPS.find(
      (relationship) => relationship.value === personalDetails.emergencyRelation,
    );

    form.reset({
      ...form.getValues(),
      phone: personalDetails.phone ?? "",
      gender: personalDetails.gender ?? undefined,
      dateOfBirth: personalDetails.dateOfBirth ?? "",
      emergencyName: personalDetails.emergencyName ?? "",
      emergencyRelation: emergencyRelationship?.value,
      emergencyPhone: personalDetails.emergencyPhone ?? "",
    });
    hasHydratedDetails.current = true;
  }, [form, personalDetails]);

  useEffect(() => {
    if (!form.getValues("addressCountry")?.trim()) {
      form.setValue("addressCountry", INDIA_COUNTRY_NAME);
    }
  }, [form]);

  useEffect(() => {
    if (effectiveCountry !== INDIA_COUNTRY_NAME) {
      form.setValue("addressState", "");
      form.setValue("addressCity", "");
      form.setValue("addressPostalCode", "");
    }
  }, [effectiveCountry, form]);

  useEffect(() => {
    const currentCity = form.getValues("addressCity");
    if (currentCity && selectedState && !cityOptions.includes(currentCity)) {
      form.setValue("addressCity", "");
    }
  }, [selectedState, cityOptions, form]);

  function handleClear() {
    form.reset({
      phone: "",
      gender: undefined,
      dateOfBirth: "",
      addressLine1: "",
      addressCity: "",
      addressState: "",
      addressPostalCode: "",
      addressCountry: INDIA_COUNTRY_NAME,
      emergencyName: "",
      emergencyRelation: undefined,
      emergencyPhone: "",
    });
  }

  function handleFormSubmit(values: PersonalInfoFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success("Personal details saved!");
        onComplete(values as Record<string, string | undefined>);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
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
                    maxLength={17}
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                  />
                )}
              />
              <FieldError message={errors.phone?.message} />
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
                    disabledDays={(date) => date > new Date()}
                    placeholder="Select date of birth"
                  />
                )}
              />
              <FieldError message={errors.dateOfBirth?.message} />
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
                    <SelectItem value="OTHER">Other / Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.gender?.message} />
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-3 pt-1">
            <h3 className="text-sm font-semibold text-foreground">
              Home Address{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="addressLine1">Street Address</Label>
              <Input
                id="addressLine1"
                {...form.register("addressLine1")}
                placeholder="House / street / area"
                autoComplete="address-line1"
                aria-invalid={!!errors.addressLine1}
              />
              <FieldError message={errors.addressLine1?.message} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addressCountry">Country</Label>
                <Controller
                  control={form.control}
                  name="addressCountry"
                  render={({ field }) => (
                    <Select
                      value={field.value?.trim() || INDIA_COUNTRY_NAME}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="addressCountry" aria-invalid={!!errors.addressCountry}>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {ALL_COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.addressCountry?.message} />
              </div>

              {showIndianAddress ? (
                <div className="space-y-1.5">
                  <Label htmlFor="addressState">State</Label>
                  <Controller
                    control={form.control}
                    name="addressState"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger id="addressState" aria-invalid={!!errors.addressState}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {INDIAN_STATE_NAMES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.addressState?.message} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground sm:pt-8">
                  State and city dropdowns are available for India. Select India to continue.
                </p>
              )}
            </div>

            {showIndianAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="addressCity">City</Label>
                  <Controller
                    control={form.control}
                    name="addressCity"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={!selectedState}
                      >
                        <SelectTrigger id="addressCity" aria-invalid={!!errors.addressCity}>
                          <SelectValue
                            placeholder={selectedState ? "Select city" : "Select state first"}
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {cityOptions.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.addressCity?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="addressPostalCode">Postal Code</Label>
                  <Input
                    id="addressPostalCode"
                    {...form.register("addressPostalCode")}
                    placeholder="6-digit PIN code"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={6}
                    aria-invalid={!!errors.addressPostalCode}
                  />
                  <FieldError message={errors.addressPostalCode?.message} />
                </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUpVariants} className="space-y-3 pt-1">
            <h3 className="text-sm font-semibold text-foreground">Emergency Contact</h3>
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
                <FieldError message={errors.emergencyName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyRelation">Relationship</Label>
                <Controller
                  control={form.control}
                  name="emergencyRelation"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="emergencyRelation"
                        aria-required="true"
                        aria-invalid={!!errors.emergencyRelation}
                      >
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMERGENCY_RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel.value} value={rel.value}>
                            {rel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.emergencyRelation?.message} />
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
                    maxLength={17}
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    aria-required="true"
                    aria-invalid={!!errors.emergencyPhone}
                  />
                )}
              />
              <FieldError message={errors.emergencyPhone?.message} />
            </div>
          </motion.div>

          <motion.div variants={fadeUpVariants}>
            <FormNavButtons isLoading={isPending} onClear={handleClear} />
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
