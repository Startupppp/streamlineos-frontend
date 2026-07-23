"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validation/hr";
import { format } from "date-fns";
import { Check, Lightbulb } from "lucide-react";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface Department {
  id: string;
  name: string;
}

interface StepReviewProps {
  form: UseFormReturn<FormValues>;
  allDepartmentOptions: (Department & { isCommon?: boolean })[];
}

export function StepReview({ form, allDepartmentOptions }: StepReviewProps) {
  const { getValues } = form;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">Ready to Onboard?</h2>
        <p className="text-sm text-muted-foreground">Review the details below before submitting.</p>
      </div>

      <div className="bg-muted/30 rounded-lg p-5 space-y-3 border text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{getValues("firstName")} {getValues("lastName")}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{getValues("email")}</span></div>
          <div><span className="text-muted-foreground">Role:</span> <span className="font-medium">{getValues("designation")}</span></div>
          <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{allDepartmentOptions?.find(d => d.id === getValues("departmentId"))?.name}</span></div>
          <div><span className="text-muted-foreground">Joining:</span> <span className="font-medium">{format(getValues("joiningDate"), "PPP")}</span></div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 rounded-lg flex gap-3 text-sm text-amber-800 dark:text-amber-200">
        <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
        <p>By clicking submit, the employee account will be created, and they will be added to the onboarding workflow automatically.</p>
      </div>
    </div>
  );
}
