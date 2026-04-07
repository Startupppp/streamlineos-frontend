"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useCreateSalaryStructure } from "../../lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { createSalaryStructureInputSchema } from "../../lib/validations/hr";

type SalaryStructureForm = z.infer<typeof createSalaryStructureInputSchema>;

interface SalaryStructureFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function SalaryStructureForm({
  userId,
  onSuccess,
}: SalaryStructureFormProps) {
  const createSalary = useCreateSalaryStructure({
    onSuccess: () => {
      toast.success("Salary structure created");
      onSuccess?.();
      reset();
    },
    onError: () => {
      toast.error("Failed to create salary structure");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalaryStructureForm>({
    resolver: zodResolver(createSalaryStructureInputSchema),
    defaultValues: {
      userId,
      hraPercentage: 40,
      allowances: 0,
      deductions: 0,
      effectiveFrom: new Date(),
    },
  });

  const onSubmit = (data: SalaryStructureForm) => {
    createSalary.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Salary Structure</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Basic Salary</Label>
            <Input
              type="number"
              step="0.01"
              {...register("basicSalary", { valueAsNumber: true })}
            />
            {errors.basicSalary && (
              <p className="text-sm text-red-500">
                {errors.basicSalary.message}
              </p>
            )}
          </div>
          <div>
            <Label>HRA Percentage</Label>
            <Input
              type="number"
              step="0.1"
              {...register("hraPercentage", { valueAsNumber: true })}
            />
            {errors.hraPercentage && (
              <p className="text-sm text-red-500">
                {errors.hraPercentage.message}
              </p>
            )}
          </div>
          <div>
            <Label>Allowances</Label>
            <Input
              type="number"
              step="0.01"
              {...register("allowances", { valueAsNumber: true })}
            />
            {errors.allowances && (
              <p className="text-sm text-red-500">
                {errors.allowances.message}
              </p>
            )}
          </div>
          <div>
            <Label>Deductions</Label>
            <Input
              type="number"
              step="0.01"
              {...register("deductions", { valueAsNumber: true })}
            />
            {errors.deductions && (
              <p className="text-sm text-red-500">
                {errors.deductions.message}
              </p>
            )}
          </div>
          <div>
            <Label>Effective From</Label>
            <Input
              type="date"
              {...register("effectiveFrom", { valueAsDate: true })}
            />
            {errors.effectiveFrom && (
              <p className="text-sm text-red-500">
                {errors.effectiveFrom.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={createSalary.isPending}>
            {createSalary.isPending ? "Creating..." : "Create"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
