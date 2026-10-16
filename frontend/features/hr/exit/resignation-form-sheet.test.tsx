import type { ChangeEvent, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const toastError = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: jest.fn() } }));

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: ({ open, children, onSubmit, title }: { open: boolean; children: ReactNode; onSubmit?: () => void; title: ReactNode }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
        <button type="button" onClick={onSubmit}>
          submit
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/storage/file-upload", () => ({ FileUpload: () => null }));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange: (v: string) => void }) => (
    <select aria-label="Reason category" value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
}));

const submitMutate = jest.fn();
jest.mock("@/hooks/api/hr/exit", () => ({
  useSubmitMyResignation: () => ({ mutate: submitMutate, isPending: false }),
}));

import { ResignationFormSheet } from "./resignation-form-sheet";

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Reason category"), { target: { value: "Better salary or benefits" } });
  fireEvent.change(screen.getByPlaceholderText("Please describe your reason for leaving..."), {
    target: { value: "A detailed explanation that is comfortably longer than fifty characters." },
  });
}

beforeEach(() => {
  toastError.mockReset();
  submitMutate.mockReset();
});

describe("QA-2026-10-14 — an employee submits their own resignation", () => {
  it("files through the self-service endpoint without a userId", () => {
    render(<ResignationFormSheet open onOpenChange={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Submit Resignation" })).toBeInTheDocument();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    expect(submitMutate).toHaveBeenCalledTimes(1);
    expect(submitMutate.mock.calls[0][0]).not.toHaveProperty("userId");
  });
});
