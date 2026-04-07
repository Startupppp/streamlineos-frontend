import { buildXlsxBuffer, type SheetDefinition } from "@/lib/export/xlsx-utils";

export async function generateSalesPerformanceExcel(data: {
  period: string;
  salesReps: Array<{
    name: string;
    leadsAssigned: number;
    leadsConverted: number;
    conversionRate: number;
    totalRevenue: number;
    incentivesEarned: number;
  }>;
}): Promise<Buffer> {
  const sheets: SheetDefinition[] = [{
    name: "Sales Performance",
    columns: [
      { header: "Sales Rep", key: "name", width: 20 },
      { header: "Leads Assigned", key: "leadsAssigned", width: 15 },
      { header: "Leads Converted", key: "leadsConverted", width: 15 },
      { header: "Conversion Rate (%)", key: "conversionRate", width: 18 },
      { header: "Total Revenue", key: "totalRevenue", width: 18 },
      { header: "Incentives Earned", key: "incentivesEarned", width: 18 },
    ],
    rows: data.salesReps,
  }];

  return buildXlsxBuffer(sheets);
}

export async function generateCampaignROIExcel(data: {
  campaigns: Array<{
    name: string;
    status: string;
    budget: number;
    spent: number;
    leads: number;
    cpl: number;
    roi: number;
  }>;
}): Promise<Buffer> {
  const sheets: SheetDefinition[] = [{
    name: "Campaign ROI",
    columns: [
      { header: "Campaign", key: "name", width: 25 },
      { header: "Status", key: "status", width: 12 },
      { header: "Budget", key: "budget", width: 15 },
      { header: "Spent", key: "spent", width: 15 },
      { header: "Leads", key: "leads", width: 10 },
      { header: "CPL", key: "cpl", width: 12 },
      { header: "ROI (%)", key: "roi", width: 10 },
    ],
    rows: data.campaigns,
  }];

  return buildXlsxBuffer(sheets);
}

export async function generateIncentiveSummaryExcel(data: {
  incentives: Array<{
    salesRep: string;
    client: string;
    investmentAmount: number;
    rate: number;
    calculated: number;
    approved: number;
    status: string;
  }>;
}): Promise<Buffer> {
  const sheets: SheetDefinition[] = [{
    name: "Incentive Summary",
    columns: [
      { header: "Sales Rep", key: "salesRep", width: 20 },
      { header: "Client", key: "client", width: 20 },
      { header: "Investment", key: "investmentAmount", width: 15 },
      { header: "Rate (%)", key: "rate", width: 10 },
      { header: "Calculated", key: "calculated", width: 15 },
      { header: "Approved", key: "approved", width: 15 },
      { header: "Status", key: "status", width: 12 },
    ],
    rows: data.incentives,
  }];

  return buildXlsxBuffer(sheets);
}
