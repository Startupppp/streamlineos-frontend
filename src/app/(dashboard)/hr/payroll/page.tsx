import { generatePayroll, getPayrolls } from "@/app/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default async function PayrollPage() {
  const payrolls = await getPayrolls();
  
  // Actions wrapper for button
  async function generateAction() {
      "use server";
      const currentMonth = format(new Date(), "yyyy-MM");
      await generatePayroll(currentMonth);
  }

  return (
    <div className="p-8 space-y-8">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Payroll</h1>
        <form action={generateAction}>
            <Button>Generate {format(new Date(), "MMMM")} Payroll</Button>
        </form>
      </div>

      <div className="grid gap-4">
        {payrolls.map((p: any) => (
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
         {payrolls.length === 0 && <p className="text-muted-foreground">No payslips generated.</p>}
      </div>
    </div>
  );
}
