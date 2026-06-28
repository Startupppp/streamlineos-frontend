"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FileSpreadsheet, FileText, Download, Loader2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

const REPORTS = [
  {
    id: "sales-performance",
    title: "Sales Performance Report",
    description: "Monthly sales rep performance with leads, conversions, and revenue",
    formats: ["xlsx", "pdf"],
    icon: FileSpreadsheet,
  },
  {
    id: "campaign-roi",
    title: "Campaign ROI Report",
    description: "Campaign budget vs spend, leads generated, and cost per lead",
    formats: ["xlsx"],
    icon: FileSpreadsheet,
  },
  {
    id: "incentive-summary",
    title: "Incentive Summary",
    description: "All incentives with status, amounts, and approval details",
    formats: ["xlsx"],
    icon: FileSpreadsheet,
  },
  {
    id: "target-achievement",
    title: "Target Achievement Report",
    description: "Target vs actual performance with visual progress indicators",
    formats: ["pdf"],
    icon: FileText,
  },
];

interface ReportCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  formats: string[];
  downloading: string | null;
  onDownload: (reportId: string, format: string) => void;
}

function ReportCard({ id, title, description, icon: Icon, formats, downloading, onDownload }: ReportCardProps) {
  const handleXlsx = useCallback(() => onDownload(id, "xlsx"), [id, onDownload]);
  const handlePdf = useCallback(() => onDownload(id, "pdf"), [id, onDownload]);
  const handlerMap = useMemo<Record<string, () => void>>(
    () => ({ xlsx: handleXlsx, pdf: handlePdf }),
    [handleXlsx, handlePdf],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex gap-2">
          {formats.map(format => (
            <Button
              key={format}
              size="sm"
              variant="outline"
              disabled={downloading === `${id}-${format}`}
              onClick={handlerMap[format]}
            >
              {downloading === `${id}-${format}` ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1" />
              )}
              {format.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = useCallback(async (reportId: string, format: string) => {
    setDownloading(`${reportId}-${format}`);
    try {
      if (format === "xlsx") {
        const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
        if (reportId === "sales-performance") {
          await downloadXlsx("sales-performance.xlsx", [{
            name: "Sales Performance",
            columns: [
              { header: "Sales Rep", key: "name", width: 20 },
              { header: "Leads Assigned", key: "leadsAssigned", width: 15 },
              { header: "Leads Converted", key: "leadsConverted", width: 15 },
              { header: "Conversion Rate (%)", key: "conversionRate", width: 18 },
              { header: "Revenue", key: "totalRevenue", width: 18 },
            ],
            rows: [{ name: "Sample", leadsAssigned: 0, leadsConverted: 0, conversionRate: 0, totalRevenue: 0 }],
          }]);
        } else if (reportId === "campaign-roi") {
          await downloadXlsx("campaign-roi.xlsx", [{
            name: "Campaign ROI",
            columns: [
              { header: "Campaign", key: "name", width: 25 },
              { header: "Status", key: "status", width: 12 },
              { header: "Budget", key: "budget", width: 15 },
              { header: "Spent", key: "spent", width: 15 },
              { header: "Leads", key: "leads", width: 10 },
            ],
            rows: [],
          }]);
        } else if (reportId === "incentive-summary") {
          await downloadXlsx("incentive-summary.xlsx", [{
            name: "Incentives",
            columns: [
              { header: "Sales Rep", key: "salesRep", width: 20 },
              { header: "Client", key: "client", width: 20 },
              { header: "Investment", key: "investment", width: 15 },
              { header: "Status", key: "status", width: 12 },
            ],
            rows: [],
          }]);
        }
        toast.success("Report downloaded");
      } else if (format === "pdf") {
        toast.info("PDF report generation — connect to live data for actual reports");
      }
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(null);
    }
  }, []);

  return (
    <PageWrapper
      title="Report Center"
      subtitle="Generate and download Excel and PDF reports"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map(report => (
          <ReportCard
            key={report.id}
            {...report}
            downloading={downloading}
            onDownload={handleDownload}
          />
        ))}
      </div>
    </PageWrapper>
  );
}
