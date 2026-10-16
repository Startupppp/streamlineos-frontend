import { render, screen } from "@testing-library/react";
import type { PayslipTemplate } from "@/types/payroll";
import { PayslipPreviewSheet } from "./template-preview-sheet";

const mutate = jest.fn();

jest.mock("@/hooks/api/payroll", () => ({
  usePreviewPayslipTemplate: () => ({
    mutate,
    isPending: false,
    isError: false,
    data: { html: "<p>Payslip for <b>Ada</b></p>" },
  }),
}));

const template: PayslipTemplate = {
  id: 1,
  orgId: "org-1",
  name: "Classic",
  layout: "CLASSIC",
  config: { accent: "blue", showEmployerContributions: true, showYtd: true },
  isDefault: true,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

it("renders the backend's payslip HTML in a fully sandboxed frame, with no scripts", () => {
  render(<PayslipPreviewSheet template={template} open onOpenChange={jest.fn()} />);

  // allow-scripts together with allow-same-origin would let the frame lift its
  // own sandbox and run the backend-interpolated HTML as the app.
  expect(screen.getByTitle("Payslip Preview")).toHaveAttribute("sandbox", "");
});

it("requests the preview when the sheet is mounted already open, so the drawer is never left empty", () => {
  mutate.mockClear();
  render(<PayslipPreviewSheet template={template} open onOpenChange={jest.fn()} />);

  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate).toHaveBeenCalledWith({ layout: "CLASSIC", config: template.config });
});

it("sends no preview request while the sheet is closed", () => {
  mutate.mockClear();
  render(<PayslipPreviewSheet template={template} open={false} onOpenChange={jest.fn()} />);

  expect(mutate).not.toHaveBeenCalled();
});
