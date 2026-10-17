import type { Control, FieldPath } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BuildDateTimeField } from "@/features/build/shared/build-datetime-field";
import type { IncidentFormValues } from "./incident-schema";

export function IncidentInputField({
  control,
  name,
  label,
  type,
  placeholder,
}: {
  control: Control<IncidentFormValues>;
  name: FieldPath<IncidentFormValues>;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {type === "datetime-local" ? (
            <BuildDateTimeField
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
              dateLabel={label}
              timeLabel={`${label} time`}
              clearable
            />
          ) : (
            <FormControl>
              <Input {...field} type={type} placeholder={placeholder} />
            </FormControl>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function IncidentTextareaField({
  control,
  name,
  label,
  placeholder,
}: {
  control: Control<IncidentFormValues>;
  name: FieldPath<IncidentFormValues>;
  label: string;
  placeholder: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              className="min-h-[72px] resize-none"
              placeholder={placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
