"use client";

import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/api-client";
import { useCreateCareerPath } from "@/hooks/api/hr/career";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const levelSchema = z.object({
  title: z.string().min(1, "Title is required"),
  skills: z.string(),
  requirements: z.string(),
});

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  levels: z.array(levelSchema).min(1, "Add at least one level"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreatePathSheet({ open, onOpenChange }: Props) {
  const createCareerPath = useCreateCareerPath();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      department: "",
      levels: [{ title: "", skills: "", requirements: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "levels",
  });

  const handleSubmit = useCallback(
    (data: FormValues) => {
      const levels = data.levels.map((l, idx) => ({
        title: l.title,
        level: idx + 1,
        skills: l.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        requirements: l.requirements
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }));

      createCareerPath.mutate(
        {
          name: data.name,
          description: data.description || undefined,
          department: data.department || undefined,
          levels,
        },
        {
          onSuccess: () => {
            toast.success("Career path created");
            form.reset();
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createCareerPath, form, onOpenChange],
  );

  function handleAddLevel() {
    append({ title: "", skills: "", requirements: "" });
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Career Path"
      description="Define a structured growth path for employees"
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel="Create Path"
      isPending={createCareerPath.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Engineering Track" className="h-9 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Description{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Briefly describe this career path..."
                    className="resize-none text-sm h-20"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Department{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Engineering" className="h-9 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Career Levels
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddLevel} type="button">
                <Plus className="h-3.5 w-3.5" />
                Add Level
              </Button>
            </div>

            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <FormField
                      control={form.control}
                      name={`levels.${idx}.title`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Level title" className="h-8 text-sm" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(idx)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name={`levels.${idx}.skills`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">
                        Skills
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Leadership, SQL" className="h-8 text-sm" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`levels.${idx}.requirements`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">
                        Requirements
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 3+ years exp" className="h-8 text-sm" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            {form.formState.errors.levels?.root && (
              <p className="text-xs text-destructive">{form.formState.errors.levels.root.message}</p>
            )}
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
