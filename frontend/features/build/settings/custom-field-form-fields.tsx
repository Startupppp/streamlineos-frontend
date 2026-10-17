import type { UseFormReturn } from "react-hook-form";
import type { CustomFieldFormValues } from "./custom-fields-schema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldType } from "@/types/projects/tasks";

const FIELD_TYPES: Array<{ value: CustomFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "currency", label: "Currency" },
  { value: "user", label: "User" },
];

interface CustomFieldFormFieldsProps {
  form: UseFormReturn<CustomFieldFormValues>;
}

export function CustomFieldFormFields({ form }: CustomFieldFormFieldsProps) {
  const currentFieldType = form.watch("fieldType");

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="fieldName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Field Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Story Points" className="text-sm" autoFocus />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fieldType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      </div>
      {(currentFieldType === "select" || currentFieldType === "multi_select") && (
        <FormField
          control={form.control}
          name="options"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Options (comma-separated)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Option 1, Option 2, Option 3" className="text-sm" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
