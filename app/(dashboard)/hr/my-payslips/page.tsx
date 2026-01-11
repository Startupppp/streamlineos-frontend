"use client";

import { useState, useRef } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { format, parseISO } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import Image from "next/image";

export default function MyPayslipsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const payslipRef = useRef<HTMLDivElement>(null);

  const { data: payslips, isLoading } = api.hr.getEmployeePayslips.useQuery({});

  const selectedPayslip = payslips?.find((p) => p.month === selectedMonth);

  const availableMonths = payslips?.map((p) => ({
    value: p.month,
    label: format(parseISO(p.month + "-01"), "MMMM yyyy"),
  })) || [];

  const handleDownload = async () => {
    if (!payslipRef.current || !selectedPayslip) return;

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(payslipRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const link = document.createElement("a");
    link.download = `payslip-${selectedMonth}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Payslips"
        description="View and download your salary slips"
        actions={
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {!selectedMonth ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Select a month to view your payslip</p>
          </CardContent>
        </Card>
      ) : selectedPayslip ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Payslip
            </Button>
          </div>

          <div
            ref={payslipRef}
            className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto border"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            <div className="flex items-center justify-between border-b pb-6 mb-6">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo.svg"
                  alt="Vaivamm Capital"
                  width={50}
                  height={50}
                  className="object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">VAIVAMM CAPITAL</h1>
                  <p className="text-sm text-gray-500">Technology Solutions</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-semibold text-gray-900">SALARY SLIP</h2>
                <p className="text-sm text-gray-500">
                  {format(parseISO(selectedPayslip.month + "-01"), "MMMM yyyy")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Employee ID:</span>
                  <span className="font-medium">VC2501</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pay Period:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedPayslip.month + "-01"), "MMM yyyy")}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Date:</span>
                  <span className="font-medium">
                    {selectedPayslip.createdAt
                      ? format(new Date(selectedPayslip.createdAt), "dd MMM yyyy")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Mode:</span>
                  <span className="font-medium">Bank Transfer</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">
                  Earnings
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Basic Pay</span>
                    <span className="font-medium">
                      ₹{parseFloat(selectedPayslip.basicSalary || "0").toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">HRA</span>
                    <span className="font-medium">
                      ₹{parseFloat(selectedPayslip.hra || "0").toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Special Allowance</span>
                    <span className="font-medium">
                      ₹{parseFloat(selectedPayslip.allowances || "0").toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Gross Earnings</span>
                    <span>
                      ₹{parseFloat(selectedPayslip.grossSalary || "0").toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">
                  Deductions
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Professional Tax</span>
                    <span className="font-medium text-red-600">
                      ₹{parseFloat(selectedPayslip.deductions || "0").toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-red-600">
                      ₹{parseFloat(selectedPayslip.deductions || "0").toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Net Salary</span>
                <span className="text-2xl font-bold text-emerald-600">
                  ₹{parseFloat(selectedPayslip.netSalary || "0").toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-4">
              <p>This is a computer-generated document. No signature required.</p>
              <p className="mt-1">Generated on {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No payslip found for this month</p>
          </CardContent>
        </Card>
      )}

      {payslips && payslips.length > 0 && !selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payslips.slice(0, 6).map((payslip) => (
                <div
                  key={payslip.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedMonth(payslip.month)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(parseISO(payslip.month + "-01"), "MMMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {payslip.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ₹{parseFloat(payslip.netSalary || "0").toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Net Salary</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

