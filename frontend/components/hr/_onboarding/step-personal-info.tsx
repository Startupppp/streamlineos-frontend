"use client";

import { useRef, useCallback, useMemo } from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepPersonalInfoProps {
  form: UseFormReturn<FormValues>;
}

export function StepPersonalInfo({ form }: StepPersonalInfoProps) {
  const checkedEmailRef = useRef<string>("");
  // eslint-disable-next-line react-hooks/purity
  const minDob = useMemo(() => new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000), []);

  const handleEmailBlur = useCallback(async () => {
    const email = form.getValues("email")?.toLowerCase().trim();
    if (!email || email === checkedEmailRef.current) return;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) return;
    try {
      const res = await apiClient.get<{ exists: boolean }>(`/hr/employees/check-email?email=${encodeURIComponent(email)}`);
      checkedEmailRef.current = email;
      if (res.exists) {
        form.setError("email", { type: "manual", message: "Email already registered" });
      }
    } catch {
    }
  }, [form]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input placeholder="John" {...field} onChange={(e) => {
                if (/^[A-Za-z\s]*$/.test(e.target.value)) field.onChange(e.target.value);
              }} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input placeholder="Doe" {...field} onChange={(e) => {
                if (/^[A-Za-z\s]*$/.test(e.target.value)) field.onChange(e.target.value);
              }} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => {
          function handleBlur() {
            field.onBlur();
            void handleEmailBlur();
          }
          return (
            <FormItem>
              <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  {...field}
                  onBlur={handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <PhoneInput defaultCountry="IN" placeholder="Enter phone number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                onChange={(v) => field.onChange(v ? new Date(v) : null)}
                toDate={minDob}
                placeholder="Select DOB"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="sm:col-span-2">
        <FormField
          control={form.control}
          name="whatsappSameAsPhone"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="text-sm font-normal cursor-pointer">WhatsApp same as phone</FormLabel>
            </FormItem>
          )}
        />
      </div>
      {!form.watch("whatsappSameAsPhone") && (
        <FormField
          control={form.control}
          name="whatsappNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Number</FormLabel>
              <FormControl>
                <PhoneInput defaultCountry="IN" placeholder="WhatsApp number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Initial Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Leave blank for invite link" {...field} />
            </FormControl>
            <FormDescription className="text-xs">Optional. Employee will set their own if left blank.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
