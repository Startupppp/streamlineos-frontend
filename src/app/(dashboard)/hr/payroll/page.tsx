"use client";

import { useHrPayrolls, useGeneratePayroll } from "@/lib/hooks/trpc-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";
import { PayrollListSkeleton } from "@/components/ui/payroll-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollPage() {
  const { data: payrolls, isLoading } = useHrPayrolls();
  
  const generateMutation = useGeneratePayroll({
    onSuccess: () => {
      toast.success("Payroll generated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate payroll");
    },
  });

  const handleGenerate = () => {
    const currentMonth = format(new Date(), "yyyy-MM");
    generateMutation.mutate({ month: currentMonth });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-56" />
        </div>
        <PayrollListSkeleton />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Payroll</h1>
        <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? "Generating..." : `Generate ${format(new Date(), "MMMM")} Payroll`}
        </Button>
      </div>

      <div className="grid gap-4">
        {payrolls?.map((p) => (
            <Card key={p.id}>
                <CardHeader>
                    <CardTitle>{p.month} - {p.status}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Gross:</span> ₹{p.grossSalary}
                        </div>
                        <div>
                            <span className="text-muted-foreground">Deductions:</span> ₹{p.deductions}
                        </div>
                        <div className="font-bold text-lg text-green-600">
                            Net: ₹{p.netSalary}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
         {payrolls && payrolls.length === 0 && <p className="text-muted-foreground">No payslips generated.</p>}
      </div>
    </div>
  );
}
