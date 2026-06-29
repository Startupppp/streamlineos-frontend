"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { CompanyProfileData } from "@/features/workspace-onboarding/types";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Japan",
  "China",
  "India",
  "Singapore",
  "United Arab Emirates",
  "Saudi Arabia",
  "Brazil",
  "Mexico",
  "South Africa",
  "Nigeria",
  "Kenya",
];

const TEAM_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];

const CURRENCIES = ["USD", "EUR", "INR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];

const profileSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  teamSize: z.string().min(1, "Team size is required"),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface CompanyProfileStepProps {
  onNext: (data: CompanyProfileData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-0.5">{message}</p>;
}

export function CompanyProfileStep({ onNext, onBack, isLoading }: CompanyProfileStepProps) {
  const updateOrgSettings = useUpdateOrgSettings();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      teamSize: "",
      country: "",
      timezone: "UTC",
      currency: "USD",
    },
  });

  const timezone = watch("timezone");
  const currency = watch("currency");
  const teamSize = watch("teamSize");
  const country = watch("country");

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateOrgSettings.mutateAsync({
        name: values.name,
        timezone: values.timezone,
        currency: values.currency,
        companySize: values.teamSize,
        country: values.country,
      });
      onNext(values);
    } catch {
      toast.error("Failed to save company profile. Please try again.");
    }
  }

  const isBusy = isLoading ?? updateOrgSettings.isPending;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Tell us about your company</h2>
        <p className="text-sm text-muted-foreground">
          This helps us configure your workspace correctly.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Organization Name *</Label>
          <Input
            id="name"
            placeholder="Acme Corp"
            {...register("name")}
            aria-invalid={Boolean(errors.name)}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="teamSize">Team Size</Label>
            <Select
              value={teamSize}
              onValueChange={(v) => setValue("teamSize", v, { shouldValidate: true })}
            >
              <SelectTrigger id="teamSize" aria-invalid={Boolean(errors.teamSize)}>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.teamSize?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Select
              value={country}
              onValueChange={(v) => setValue("country", v, { shouldValidate: true })}
            >
              <SelectTrigger id="country" aria-invalid={Boolean(errors.country)}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.country?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={timezone}
              onValueChange={(v) => setValue("timezone", v, { shouldValidate: true })}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button type="submit" disabled={isBusy} className="flex-1">
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-1 order-last" />
            )}
            {isBusy ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
