"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TimesheetPayrollError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Payroll Error"
      fallbackMessage="Failed to load payroll data. Please try again."
    />
  );
}
