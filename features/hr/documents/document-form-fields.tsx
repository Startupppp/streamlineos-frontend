"use client";

import { useFormContext } from "react-hook-form";
import * as z from "zod";
import {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_NAME_MAX,
} from "@/lib/validations/hr-documents";
import { format } from "date-fns";
import { CalendarIcon, X, Tags, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const formSchema = z.object({
  name: z.string().max(DOCUMENT_NAME_MAX, `Name must be at most ${DOCUMENT_NAME_MAX} characters`),
  description: z
    .string()
    .max(DOCUMENT_DESCRIPTION_MAX, `Description must be at most ${DOCUMENT_DESCRIPTION_MAX} characters`)
    .optional(),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]),
  category: z.string().optional(),
  userId: z.string().optional(),
  isPublic: z.boolean(),
  expiryDate: z.date().optional(),
  tags: z.array(z.string()),
});

export type DocumentFormData = z.infer<typeof formSchema>;

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
}: DocumentFormFieldsProps) {
  const form = useFormContext<DocumentFormData>();

  return (
    <div className="grid grid-cols-2 gap-5">
      {filesCount <= 1 && (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Document Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Employment Contract 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Document Type *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
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
            <FormLabel>Folder / category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
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

      {isAdmin && filteredEmployees.length > 0 && (
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Associate with Employee</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger className="min-w-0">
                    <SelectValue placeholder="Select employee (optional)" className="truncate" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No specific employee</SelectItem>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Leave empty for company-wide documents</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Brief description of the document..."
                rows={3}
                maxLength={DOCUMENT_DESCRIPTION_MAX}
                {...field}
              />
            </FormControl>
            <p className="text-[10px] text-muted-foreground text-right">
              {(field.value?.length ?? 0)}/{DOCUMENT_DESCRIPTION_MAX}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expiryDate"
        render={({ field }) => (
          <FormItem className="flex flex-col col-span-2">
            <FormLabel>Expiry Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? format(field.value, "PPP") : <span>No expiry date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
            <FormDescription>Set an expiry date for documents like contracts or certificates</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="col-span-2 space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <div className="flex gap-3">
          <Input
            placeholder="Add tag..."
            value={tagInput}
            onChange={onTagInputChange}
            onKeyDown={onTagKeyDown}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddTag}
            disabled={!tagInput.trim()}
            aria-label="Add tag"
          >
            <Tags className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="pl-2.5 pr-1.5 py-1 flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  data-tag={tag}
                  onClick={onRemoveTag}
                  aria-label={`Remove tag ${tag}`}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-4 bg-muted/30">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2 text-sm font-medium">
                {field.value ? (
                  <Globe className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Shield className="h-4 w-4 text-amber-600" />
                )}
                {field.value ? "Public Document" : "Private Document"}
              </FormLabel>
              <FormDescription className="text-xs">
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
