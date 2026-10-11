"use client";

import { DatePicker } from "@/components/ui/date-picker";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProjectFormOutput,
  ProjectFormValues,
} from "./project-form-schema";
import { ZONES } from "./project-form-schema";

export function ProjectFormFields({
  form,
}: {
  form: UseFormReturn<ProjectFormValues, unknown, ProjectFormOutput>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="HYD-TOWER-04"
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On hold</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site name</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Aparna Sarovar Tower 4 — Structure"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="zone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery zone</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a zone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ZONES.map((z) => (
                    <SelectItem key={z.value} value={z.value}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Hyderabad"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="siteAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site address</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="Nallagandla, Serilingampally"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="siteContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site contact</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Mahesh Kumar"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="siteContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  inputMode="tel"
                  placeholder="+91 98490 11223"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="startsOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starts on</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                  dateFormat="dd MMM yyyy"
                  clearable
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endsOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target completion</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                  dateFormat="dd MMM yyyy"
                  clearable
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                rows={3}
                placeholder="Slab casting on floors 9–14. Cement and steel drawn weekly."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
