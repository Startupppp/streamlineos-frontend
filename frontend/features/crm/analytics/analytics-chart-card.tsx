"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/motion-variants";

async function downloadXLSX(data: object[], filename: string) {
  if (data.length === 0) return;
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Data");
  const first = data[0] as Record<string, unknown>;
  const headers = Object.keys(first);
  ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(h.length + 4, 12) }));
  ws.getRow(1).font = { bold: true };
  for (const row of data) {
    const r = row as Record<string, unknown>;
    ws.addRow(headers.map((h) => r[h] ?? ""));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface AnalyticsChartCardProps {
  title: string;
  data: object[];
  filename: string;
  children: React.ReactNode;
}

export function AnalyticsChartCard({ title, data, filename, children }: AnalyticsChartCardProps) {
  const handleDownload = useCallback(() => downloadXLSX(data, filename), [data, filename]);
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Card className="shadow-sm h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} aria-label="Download">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
