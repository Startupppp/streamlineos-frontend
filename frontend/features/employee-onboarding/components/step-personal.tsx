"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isSupportedCountry } from "react-phone-number-input";
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
import { toast } from "sonner";
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
import { WizardSectionHeading } from "@/components/wizard-shell";
import { countryNameToCode } from "../lib/onboarding-requirements-schema";
import {
  EMPTY_PERSONAL_DRAFT,
  personalDraftToFormDefaults,
  type PersonalDraft,
} from "../lib/wizard-draft-schema";
import { FieldError } from "./field-error";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepPersonalProps = {
  onComplete: (values: PersonalDraft) => void;
  onDraftChange?: (values: PersonalDraft) => void;
  onClear?: () => void;
  defaultValues?: PersonalDraft;
};

function toPersonalDraft(values: PersonalInfoFormValues): PersonalDraft {
  return {
    phone: values.phone ?? "",
    gender: values.gender ?? "",
    dateOfBirth: values.dateOfBirth ?? "",
    addressLine1: values.addressLine1 ?? "",
    addressCity: values.addressCity ?? "",
    addressState: values.addressState ?? "",
    addressPostalCode: values.addressPostalCode ?? "",
    addressCountry: values.addressCountry ?? INDIA_COUNTRY_NAME,
    emergencyName: values.emergencyName ?? "",
    emergencyRelation: values.emergencyRelation ?? "",
    emergencyPhone: values.emergencyPhone ?? "",
  };
}

export function StepPersonal({
  onComplete,
  onDraftChange,
  onClear,
  defaultValues,
}: StepPersonalProps) {
  const formDefaults = personalDraftToFormDefaults(
    defaultValues ?? EMPTY_PERSONAL_DRAFT,
  );

  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onChange",
    defaultValues: {
      phone: formDefaults.phone,
      gender: formDefaults.gender,
      dateOfBirth: formDefaults.dateOfBirth,
      addressLine1: formDefaults.addressLine1,
      addressCity: formDefaults.addressCity,
      addressState: formDefaults.addressState,
      addressPostalCode: formDefaults.addressPostalCode,
      addressCountry: formDefaults.addressCountry,
      emergencyName: formDefaults.emergencyName,
      emergencyRelation: formDefaults.emergencyRelation || undefined,
      emergencyPhone: formDefaults.emergencyPhone,
    },
  });

  const { errors } = form.formState;
  const selectedCountry = form.watch("addressCountry");
  const effectiveCountry = selectedCountry?.trim() || INDIA_COUNTRY_NAME;
  const showIndianAddress = effectiveCountry === INDIA_COUNTRY_NAME;
  const phoneCountryCode = countryNameToCode(effectiveCountry);
  const phoneCountry = isSupportedCountry(phoneCountryCode)
    ? phoneCountryCode
    : "IN";
  const selectedState = form.watch("addressState");
  const cityOptions = useMemo(
    () => (selectedState ? citiesForState(selectedState) : []),
    [selectedState],
  );

  useEffect(() => {
    if (!onDraftChange) return;
    const subscription = form.watch((values) => {
      onDraftChange({
        phone: values.phone ?? "",
        gender: values.gender ?? "",
        dateOfBirth: values.dateOfBirth ?? "",
        addressLine1: values.addressLine1 ?? "",
        addressCity: values.addressCity ?? "",
        addressState: values.addressState ?? "",
        addressPostalCode: values.addressPostalCode ?? "",
        addressCountry: values.addressCountry ?? INDIA_COUNTRY_NAME,
        emergencyName: values.emergencyName ?? "",
        emergencyRelation: values.emergencyRelation ?? "",
        emergencyPhone: values.emergencyPhone ?? "",
      });
    });
    return () => subscription.unsubscribe();
  }, [form, onDraftChange]);

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
    onClear?.();
  }

  function handleFormSubmit(values: PersonalInfoFormValues) {
    toast.success("Personal details saved");
    onComplete(toPersonalDraft(values));
  }

  function handleNextClick() {
    void form.handleSubmit(handleFormSubmit)();
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleFormSubmit)}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
    >
      <StepBody
        footer={
          <NavButtons
            onNext={handleNextClick}
            nextType="submit"
            nextLabel="Save & continue"
            clearLabel="Clear"
            onClear={handleClear}
          />
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  key={phoneCountry}
                  id="phone"
                  defaultCountry={phoneCountry}
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
            <Label htmlFor="dateOfBirth">Date of birth</Label>
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
          <div className="space-y-1.5 sm:col-span-1">
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
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">
                      Other / Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.gender?.message} />
          </div>
        </div>

        <section className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="addressLine1">Street address</Label>
            <Input
              id="addressLine1"
              {...form.register("addressLine1")}
              placeholder="House / street / area"
              autoComplete="address-line1"
              aria-invalid={!!errors.addressLine1}
            />
            <FieldError message={errors.addressLine1?.message} />
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                    <SelectTrigger
                      id="addressCountry"
                      aria-invalid={!!errors.addressCountry}
                    >
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 min-w-[var(--radix-select-trigger-width)]">
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
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="addressState"
                        aria-invalid={!!errors.addressState}
                      >
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 min-w-[var(--radix-select-trigger-width)]">
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
                State and city dropdowns are available for India.
              </p>
            )}
          </div>

          {showIndianAddress ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                      <SelectTrigger
                        id="addressCity"
                        aria-invalid={!!errors.addressCity}
                      >
                        <SelectValue
                          placeholder={
                            selectedState
                              ? "Select city"
                              : "Select state first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 min-w-[var(--radix-select-trigger-width)]">
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
                <Label htmlFor="addressPostalCode">Postal code</Label>
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
          ) : null}
        </section>

        <section className="space-y-3">
          <WizardSectionHeading>Emergency contact</WizardSectionHeading>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyName">Full name</Label>
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
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
            <Label htmlFor="emergencyPhone">Emergency phone</Label>
            <Controller
              control={form.control}
              name="emergencyPhone"
              render={({ field }) => (
                <PhoneInput
                  key={phoneCountry}
                  id="emergencyPhone"
                  defaultCountry={phoneCountry}
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
        </section>
      </StepBody>
    </form>
  );
}
