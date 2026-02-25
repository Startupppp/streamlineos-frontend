"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updatePersonalDetails } from "@/server/actions/onboarding-actions";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

const personalSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  skills: z.string().min(3, "Add at least one skill"),
  experienceYears: z.string().min(1, "Experience is required"),
});

interface PersonalInfoTabProps {
  onComplete: () => void;
}

export function PersonalInfoTab({ onComplete }: PersonalInfoTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof personalSchema>>({
    resolver: zodResolver(personalSchema),
  });

  const onSubmit = async (values: z.infer<typeof personalSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => formData.append(k, v));
    const res = await updatePersonalDetails(formData);
    setIsLoading(false);
    if (res.success) {
      toast.success("Personal details saved!");
      onComplete();
    } else {
      toast.error(res.error || "Something went wrong");
    }
  };

  return (
    <Card className="shadow-noir border-border">
      <CardContent className="pt-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Welcome to Vaivamm!</h2>
          <p className="text-sm text-muted-foreground mt-1">Tell us a bit about your professional background.</p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input {...form.register("phone")} placeholder="+91 98765 43210" className="focus-visible:ring-primary" />
              {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input {...form.register("experienceYears")} type="number" step="0.1" placeholder="e.g. 2.5" className="focus-visible:ring-primary" />
              {form.formState.errors.experienceYears && <p className="text-sm text-destructive">{form.formState.errors.experienceYears.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Skills (Comma separated)</Label>
            <Input {...form.register("skills")} placeholder="React, Node.js, TypeScript..." className="focus-visible:ring-primary" />
            {form.formState.errors.skills && <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
