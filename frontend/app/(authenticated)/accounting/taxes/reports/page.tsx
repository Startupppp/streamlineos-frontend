"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyChartIllustration,
  EmptyReportIllustration,
} from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { Money, downloadCsv } from "@/features/accounting/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download } from "lucide-react";
import {
  useTaxReportOutput,
  useTaxReportInput,
  useTaxLiabilitySummary,
} from "@/hooks/api/accounting/taxes";
import type { TaxReportLine } from "@/types/accounting/taxes";

const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};
const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const REPORT_COLUMNS: DataTableColumn<TaxReportLine>[] = [
  {
    key: "date",
    header: "Date",
    cell: (row) => row.date,
    sortable: true,
    sortValue: (row) => row.date,
  },
  {
    key: "docNumber",
    header: "Doc No.",
    cell: (row) => row.docNumber,
  },
  {
    key: "partyName",
    header: "Party",
    cell: (row) => row.partyName,
  },
  {
    key: "taxableAmount",
    header: "Taxable Amt",
    cell: (row) => <Money value={parseFloat(row.taxableAmount)} />,
    headerClassName: "text-right",
    className: "text-right",
  },
  {
    key: "rate",
    header: "Rate %",
    cell: (row) => `${row.rate}%`,
    className: "text-right",
    headerClassName: "text-right",
  },
  {
    key: "cgst",
    header: "CGST",
    cell: (row) => <Money value={parseFloat(row.cgst)} />,
    headerClassName: "text-right",
    className: "text-right",
  },
  {
    key: "sgst",
    header: "SGST",
    cell: (row) => <Money value={parseFloat(row.sgst)} />,
    headerClassName: "text-right",
    className: "text-right",
  },
  {
    key: "igst",
    header: "IGST",
    cell: (row) => <Money value={parseFloat(row.igst)} />,
    headerClassName: "text-right",
    className: "text-right",
  },
  {
    key: "total",
    header: "Total Tax",
    cell: (row) => <Money value={parseFloat(row.total)} />,
    headerClassName: "text-right",
    className: "text-right",
  },
];

interface ReportTableProps {
  data: TaxReportLine[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle: string;
}

function ReportTable({
  data,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
}: ReportTableProps) {
  if (isError) {
    return <ErrorState onRetry={onRetry} compact />;
  }
  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  return (
    <DataTable
      data={data}
      columns={REPORT_COLUMNS}
      getRowKey={(row) => row.id}
      pagination={{ pageSize: 50 }}
      emptyState={
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title={emptyTitle}
          description="Adjust your date range or rate filter and try again."
          compact
        />
      }
    />
  );
}

interface LiabilitySectionProps {
  from: string;
  to: string;
}

function LiabilitySection({ from, to }: LiabilitySectionProps) {
  const { data, isLoading, isError, refetch } = useTaxLiabilitySummary(from, to);

  function handleRetryLiability() {
    void refetch();
  }

  if (isError) {
    return <ErrorState onRetry={handleRetryLiability} compact />;
  }
  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  const rows = data?.rows ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyChartIllustration />}
        title="No liability data"
        description="No tax transactions found for the selected period."
      />
    );
  }

  const chartData = rows.map((r) => ({
    month: r.month,
    output: parseFloat(r.outputTax),
    input: parseFloat(r.inputTax),
    net: parseFloat(r.netLiability),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={rows}
            columns={[
              {
                key: "month",
                header: "Month",
                cell: (r) => r.month,
                sortable: true,
                sortValue: (r) => r.month,
              },
              {
                key: "outputTax",
                header: "Output Tax",
                cell: (r) => <Money value={parseFloat(r.outputTax)} />,
                className: "text-right",
                headerClassName: "text-right",
              },
              {
                key: "inputTax",
                header: "Input Tax",
                cell: (r) => <Money value={parseFloat(r.inputTax)} />,
                className: "text-right",
                headerClassName: "text-right",
              },
              {
                key: "netLiability",
                header: "Net Liability",
                cell: (r) => <Money value={parseFloat(r.netLiability)} />,
                className: "text-right",
                headerClassName: "text-right",
              },
            ]}
            getRowKey={(r) => r.month}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cumulative Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} width={72} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="output"
                name="Output"
                stroke="hsl(var(--chart-1, #3b82f6))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="input"
                name="Input"
                stroke="hsl(var(--chart-2, #22c55e))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="hsl(var(--chart-3, #f59e0b))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TaxReportsPage() {
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [rate, setRate] = useState("");
  const [activeTab, setActiveTab] = useState("output");

  const outputParams = { from, to, ...(rate ? { rate } : {}) };
  const inputParams = { from, to, ...(rate ? { rate } : {}) };

  const outputQuery = useTaxReportOutput(outputParams);
  const inputQuery = useTaxReportInput(inputParams);

  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value),
    [],
  );
  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value),
    [],
  );
  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRate(e.target.value),
    [],
  );

  const handleExportOutput = useCallback(() => {
    const params: Record<string, string> = { format: "csv", from, to };
    if (rate) params.rate = rate;
    void downloadCsv("/accounting/taxes/report/output", params, `tax-output-${from}-${to}.csv`);
  }, [from, to, rate]);

  const handleExportInput = useCallback(() => {
    const params: Record<string, string> = { format: "csv", from, to };
    if (rate) params.rate = rate;
    void downloadCsv("/accounting/taxes/report/input", params, `tax-input-${from}-${to}.csv`);
  }, [from, to, rate]);

  const handleRetryOutput = useCallback(() => {
    void outputQuery.refetch();
  }, [outputQuery]);

  const handleRetryInput = useCallback(() => {
    void inputQuery.refetch();
  }, [inputQuery]);

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-from" className="text-xs">
          From
        </Label>
        <Input
          id="filter-from"
          type="date"
          value={from}
          onChange={handleFromChange}
          className="h-8 w-36 text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-to" className="text-xs">
          To
        </Label>
        <Input
          id="filter-to"
          type="date"
          value={to}
          onChange={handleToChange}
          className="h-8 w-36 text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-rate" className="text-xs">
          Rate %
        </Label>
        <Input
          id="filter-rate"
          type="number"
          value={rate}
          onChange={handleRateChange}
          placeholder="All rates"
          className="h-8 w-28 text-xs"
        />
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Tax Reports"
      subtitle="Output, input, and net liability across a date range."
      backHref="/accounting/taxes"
      filters={filters}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 pb-2">
          <TabsList className="h-8">
            <TabsTrigger value="output" className="text-xs px-3 h-8">
              Output
            </TabsTrigger>
            <TabsTrigger value="input" className="text-xs px-3 h-8">
              Input
            </TabsTrigger>
            <TabsTrigger value="liability" className="text-xs px-3 h-8">
              Liability
            </TabsTrigger>
          </TabsList>

          {activeTab === "output" && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportOutput}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
          {activeTab === "input" && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportInput}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4">
          <TabsContent value="output" className="mt-0">
            <ReportTable
              data={outputQuery.data?.items ?? []}
              isLoading={outputQuery.isLoading}
              isError={outputQuery.isError}
              onRetry={handleRetryOutput}
              emptyTitle="No output tax records"
            />
          </TabsContent>

          <TabsContent value="input" className="mt-0">
            <ReportTable
              data={inputQuery.data?.items ?? []}
              isLoading={inputQuery.isLoading}
              isError={inputQuery.isError}
              onRetry={handleRetryInput}
              emptyTitle="No input tax records"
            />
          </TabsContent>

          <TabsContent value="liability" className="mt-0">
            <LiabilitySection from={from} to={to} />
          </TabsContent>
        </div>
      </Tabs>
    </PageWrapper>
  );
}
