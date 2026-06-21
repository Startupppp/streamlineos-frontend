"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface PayslipUser {
  firstName?: string | null;
  lastName?: string | null;
}

interface PayslipForPdf {
  month: string;
  user?: PayslipUser | null;
}

/**
 * Encapsulates the html2canvas + jsPDF download flow for a payslip preview.
 * The hook returns a `download(ref, payslip)` callback that handles toast UX,
 * unsupported color-space stripping, and multi-page layout.
 */
export function usePayslipPdf() {
  const download = useCallback(
    async (
      payslipRef: React.RefObject<HTMLDivElement | null>,
      payslip: PayslipForPdf,
    ) => {
      if (!payslipRef.current) return;

      toast.loading("Generating PDF…", { id: "pdf-download" });

      try {
        const html2canvas = (await import("html2canvas")).default;
        const jsPDF = (await import("jspdf")).default;

        const unsupportedColorPattern = /lab\(|oklch\(|oklab\(|lch\(/;
        const convertLabColors = (element: HTMLElement) => {
          const allElements = element.querySelectorAll("*");
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = window.getComputedStyle(htmlEl);
            const { color, backgroundColor, borderColor } = computedStyle;
            if (color && unsupportedColorPattern.test(color)) {
              htmlEl.style.color = "#1f2937";
            }
            if (backgroundColor && unsupportedColorPattern.test(backgroundColor)) {
              htmlEl.style.backgroundColor = "transparent";
            }
            if (borderColor && unsupportedColorPattern.test(borderColor)) {
              htmlEl.style.borderColor = "#e5e7eb";
            }
          });
          const rootStyle = window.getComputedStyle(element);
          if (rootStyle.color && unsupportedColorPattern.test(rootStyle.color)) {
            element.style.color = "#1f2937";
          }
          if (
            rootStyle.backgroundColor &&
            unsupportedColorPattern.test(rootStyle.backgroundColor)
          ) {
            element.style.backgroundColor = "#ffffff";
          }
        };

        const canvas = await html2canvas(payslipRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
          foreignObjectRendering: false,
          onclone: (_clonedDoc, clonedElement) => {
            clonedElement.style.transform = "none";
            convertLabColors(clonedElement);
            const watermark = clonedElement.querySelector("[data-watermark]");
            if (watermark instanceof HTMLElement) {
              watermark.style.display = "none";
            }
          },
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true,
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const employeeName = `${payslip.user?.firstName || ""}_${payslip.user?.lastName || ""}`.replace(
          /\s+/g,
          "_",
        );
        const monthYear = format(parseISO(payslip.month + "-01"), "MMM_yyyy");
        const fileName = `Payslip_${employeeName}_${monthYear}.pdf`;

        pdf.save(fileName);
        toast.success("Payslip downloaded successfully!", { id: "pdf-download" });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to generate PDF: ${errorMessage}`, {
          id: "pdf-download",
        });
      }
    },
    [],
  );

  return { download };
}
