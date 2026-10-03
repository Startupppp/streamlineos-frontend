import { Wallet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PayNotSetUpNotice() {
  return (
    <Alert data-testid="pay-not-set-up">
      <Wallet />
      <AlertTitle>Pay isn&apos;t set up for you yet</AlertTitle>
      <AlertDescription>
        You aren&apos;t in a payroll cycle because no salary has been assigned
        to you. Ask your admin or HR to open Payroll → Employees and add your
        salary. Your payslips will appear here after the first run is released.
      </AlertDescription>
    </Alert>
  );
}
