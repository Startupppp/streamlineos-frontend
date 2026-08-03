"use client";

import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { planningEndPickerProps } from "@/lib/date-constraints";
import type { TravelFormValues } from "./travel-schema";

interface TravelRequestFormProps {
  form: UseFormReturn<TravelFormValues>;
  onFlightRequiredChange: (v: boolean) => void;
  onHotelRequiredChange: (v: boolean) => void;
  onAdvanceRequiredChange: (v: boolean) => void;
}

export function TravelRequestForm({
  form,
  onFlightRequiredChange,
  onHotelRequiredChange,
  onAdvanceRequiredChange,
}: TravelRequestFormProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="purpose">
          Purpose <span className="text-destructive">*</span>
        </Label>
        <Input
          id="purpose"
          placeholder="Conference, client visit, training..."
          {...form.register("purpose")}
        />
        {form.formState.errors.purpose && (
          <p className="text-xs text-destructive">{form.formState.errors.purpose.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="destination">
          Destination <span className="text-destructive">*</span>
        </Label>
        <Input
          id="destination"
          placeholder="City, Country"
          {...form.register("destination")}
        />
        {form.formState.errors.destination && (
          <p className="text-xs text-destructive">{form.formState.errors.destination.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="departureDate">
            Departure <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="departureDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker
                id="departureDate"
                value={field.value ?? ""}
                onChange={(value) => {
                  field.onChange(value);
                  const currentReturn = form.getValues("returnDate");
                  if (currentReturn && value && currentReturn < value) {
                    form.setValue("returnDate", "", { shouldValidate: true });
                  }
                  void form.trigger(["departureDate", "returnDate"]);
                }}
                placeholder="Pick a date"
                className="text-sm"
                disablePast
              />
            )}
          />
          {form.formState.errors.departureDate && (
            <p className="text-xs text-destructive">
              {form.formState.errors.departureDate.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="returnDate">
            Return <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="returnDate"
            control={form.control}
            render={({ field }) => {
              const departure = form.watch("departureDate");
              const returnBounds = planningEndPickerProps({
                startDate: departure,
                mode: "onOrAfter",
              });
              return (
                <DatePicker
                  id="returnDate"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                  className="text-sm"
                  fromDate={returnBounds.fromDate}
                  fromYear={returnBounds.fromYear}
                  toYear={returnBounds.toYear}
                />
              );
            }}
          />
          {form.formState.errors.returnDate && (
            <p className="text-xs text-destructive">
              {form.formState.errors.returnDate.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <Label htmlFor="flightRequired" className="cursor-pointer">
            Flight required
          </Label>
          <Switch
            id="flightRequired"
            checked={form.watch("flightRequired")}
            onCheckedChange={onFlightRequiredChange}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <Label htmlFor="hotelRequired" className="cursor-pointer">
            Hotel required
          </Label>
          <Switch
            id="hotelRequired"
            checked={form.watch("hotelRequired")}
            onCheckedChange={onHotelRequiredChange}
          />
        </div>
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="advanceRequired" className="cursor-pointer">
            Advance required
          </Label>
          <Switch
            id="advanceRequired"
            checked={form.watch("advanceRequired")}
            onCheckedChange={onAdvanceRequiredChange}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
        <Input
          id="estimatedCost"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          {...form.register("estimatedCost")}
        />
        {form.formState.errors.estimatedCost && (
          <p className="text-xs text-destructive">
            {form.formState.errors.estimatedCost.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="perDiem">Per Diem (₹/day)</Label>
        <Input
          id="perDiem"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          {...form.register("perDiem")}
        />
        {form.formState.errors.perDiem && (
          <p className="text-xs text-destructive">{form.formState.errors.perDiem.message}</p>
        )}
      </div>
    </>
  );
}
