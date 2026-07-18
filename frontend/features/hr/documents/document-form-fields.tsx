"use client";

import { useFormContext } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Shield, Globe } from "lucide-react";
import { XIcon, PlusIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Name must contain a letter or number"),
  description: z.string().optional(),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"] as const, {
    error: "Please select a document type",
  }),
  category: z.string().optional(),
  userId: z.string().optional(),
  isPublic: z.boolean(),
  expiryDate: z.date().optional(),
  tags: z.array(z.string()),
});

export type DocumentFormData = z.infer<typeof formSchema>;

function TagRemoveButton({ tag, onClick }: { tag: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      data-tag={tag}
      onClick={onClick}
      aria-label={`Remove tag ${tag}`}
      className="text-muted-foreground hover:text-foreground transition-colors"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={12} />
    </button>
  );
}

interface DocumentFormFieldsProps {
  filteredDocumentTypes: { value: string; label: string }[];
  filteredCategories: string[];
  filteredEmployees: { id: string; firstName: string | null; lastName: string | null }[];
  isAdmin: boolean;
  filesCount: number;
  tags: string[];
  tagInput: string;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddTag: () => void;
  onRemoveTag: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNameChange?: () => void;
}

export function DocumentFormFields({
  filteredDocumentTypes,
  filteredCategories,
  filteredEmployees,
  isAdmin,
  filesCount,
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onTagKeyDown,
  onNameChange,
}: DocumentFormFieldsProps) {
  const form = useFormContext<DocumentFormData>();

  return (
    <div className="space-y-4">
      {filesCount <= 1 && (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Document Name <span className="text-rose-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Employment Contract 2024"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    onNameChange?.();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Type <span className="text-rose-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {filteredDocumentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Category
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {isAdmin && filteredEmployees.length > 0 && (
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Associate with Employee
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                value={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="none">No specific employee</SelectItem>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-[11px]">Leave empty for company-wide documents</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Description
            </FormLabel>
            <FormControl>
              <Textarea placeholder="Brief description of the document..." rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expiryDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Expiry Date
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {field.value ? format(field.value, "PPP") : <span>No expiry date</span>}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription className="text-[11px]">
              Set an expiry date for contracts or certificates
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Tags
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag..."
            value={tagInput}
            onChange={onTagInputChange}
            onKeyDown={onTagKeyDown}
            className="flex-1 h-8"
          />
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            type="button"
            variant="outline"
            size="icon"
            className="w-8 shrink-0"
            onClick={onAddTag}
            disabled={!tagInput.trim()}
            aria-label="Add tag"
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground border border-border"
              >
                {tag}
                <TagRemoveButton tag={tag} onClick={onRemoveTag} />
              </span>
            ))}
          </div>
        )}
      </div>

      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-xl border border-border p-3 bg-muted/20">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                {field.value ? (
                  <div className="w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                    <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                {field.value ? "Public Document" : "Private Document"}
              </FormLabel>
              <FormDescription className="text-[11px] pl-9">
                {field.value
                  ? "All employees can view this document"
                  : "Only admins and the owner can view this"}
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
