"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateKbSpace } from "@/hooks/api/kb";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

const createSpaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer"),
  audience: z.enum(["internal", "public", "mixed"]),
  icon: z.string().trim().max(60, "Icon name must be 60 characters or fewer"),
});

type CreateSpaceFormValues = z.infer<typeof createSpaceSchema>;

const DEFAULT_VALUES: CreateSpaceFormValues = {
  name: "",
  description: "",
  audience: "internal",
  icon: "",
};

const AUDIENCE_OPTIONS: {
  value: CreateSpaceFormValues["audience"];
  label: string;
  hint: string;
}[] = [
  { value: "internal", label: "Internal", hint: "Only your team" },
  { value: "public", label: "Public", hint: "Help center visitors" },
  { value: "mixed", label: "Mixed", hint: "Internal and public" },
];

interface CreateSpaceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSpaceSheet({ open, onOpenChange }: CreateSpaceSheetProps) {
  const createSpace = useCreateKbSpace();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSpaceFormValues>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleCreate(values: CreateSpaceFormValues) {
    createSpace.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        audience: values.audience,
        icon: values.icon || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Space created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }

  const onSubmit = handleSubmit(handleCreate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-[480px]">
        <SheetHeader className="px-6 pt-5 pb-3 border-b border-border/60 shrink-0 text-left gap-1">
          <SheetTitle className="text-base font-semibold">New space</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Group related articles and control who can read them.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <form
            id="create-space-form"
            onSubmit={onSubmit}
            className="px-6 py-4 space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="space-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="space-name"
                placeholder="e.g. Engineering Handbook"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="space-description">Description</Label>
              <Textarea
                id="space-description"
                rows={3}
                placeholder="What belongs in this space?"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="space-audience">Audience</Label>
              <Controller
                control={control}
                name="audience"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="space-audience" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} — {option.hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="space-icon">Icon</Label>
              <Input
                id="space-icon"
                placeholder="Optional lucide icon name"
                aria-invalid={!!errors.icon}
                {...register("icon")}
              />
              {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="px-6 py-3 border-t border-border/60 shrink-0 flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createSpace.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-space-form" disabled={createSpace.isPending}>
            {createSpace.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {createSpace.isPending ? "Creating…" : "Create space"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
