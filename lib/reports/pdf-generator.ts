/**
 * PDF report generation utilities.
 * Uses jsPDF for server-side/client-side PDF generation.
 */
export async function generateSalesPerformancePDF(data: {
  period: string;
  salesReps: Array<{
    name: string;
    leadsAssigned: number;
    leadsConverted: number;
    conversionRate: number;
    totalRevenue: number;
  }>;
}): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(15, 43, 127); // Dark blue
  doc.text("Vaivamm Capital", 14, 20);
  doc.setFontSize(14);
  doc.text("Sales Performance Report", 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${data.period}`, 14, 38);

  // Table
  let y = 50;
  const headers = ["Sales Rep", "Assigned", "Converted", "Rate %", "Revenue"];
  const colWidths = [50, 25, 25, 25, 40];

  // Header row
  doc.setFillColor(189, 136, 44); // Gold
  doc.rect(14, y - 5, 180, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  let x = 16;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });

  // Data rows
  y += 10;
  doc.setTextColor(0);
  for (const rep of data.salesReps) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    x = 16;
    doc.text(rep.name, x, y); x += colWidths[0];
    doc.text(String(rep.leadsAssigned), x, y); x += colWidths[1];
    doc.text(String(rep.leadsConverted), x, y); x += colWidths[2];
    doc.text(`${rep.conversionRate.toFixed(1)}%`, x, y); x += colWidths[3];
    doc.text(`₹${rep.totalRevenue.toLocaleString("en-IN")}`, x, y);
    y += 7;
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}

export async function generateTargetAchievementPDF(data: {
  period: string;
  targets: Array<{
    name: string;
    metric: string;
    target: number;
    achieved: number;
    percentage: number;
  }>;
}): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(15, 43, 127);
  doc.text("Vaivamm Capital", 14, 20);
  doc.setFontSize(14);
  doc.text("Target Achievement Report", 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${data.period}`, 14, 38);

  let y = 50;
  doc.setTextColor(0);
  for (const t of data.targets) {
    if (y > 260) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.text(`${t.name} — ${t.metric}`, 14, y);
    y += 6;

    // Progress bar
    const barWidth = 150;
    const progress = Math.min(t.percentage, 100);
    doc.setFillColor(230, 230, 230);
    doc.rect(14, y, barWidth, 6, "F");
    doc.setFillColor(progress >= 100 ? 34 : 189, progress >= 100 ? 197 : 136, progress >= 100 ? 94 : 44);
    doc.rect(14, y, barWidth * (progress / 100), 6, "F");

    doc.setFontSize(9);
    doc.text(`${t.achieved} / ${t.target} (${t.percentage.toFixed(0)}%)`, 170, y + 5);
    y += 14;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
