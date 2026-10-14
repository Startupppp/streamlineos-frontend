import type { ChangeEvent, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const toastError = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: jest.fn() } }));

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "owner-1" } } }) }));

const pickerExclusions: Array<string[] | undefined> = [];
jest.mock("@/features/hr/shared/employee-picker", () => ({
  EmployeePicker: ({ onChange, excludeUserIds }: { onChange: (id: string) => void; excludeUserIds?: string[] }) => {
    pickerExclusions.push(excludeUserIds);
    return (
      <button type="button" onClick={() => onChange("emp-7")}>
        pick employee
      </button>
    );
  },
}));

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

const recordMutate = jest.fn();
const submitMutate = jest.fn();
jest.mock("@/hooks/api/hr/exit", () => ({
  useRecordResignation: () => ({ mutate: recordMutate, isPending: false }),
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
  recordMutate.mockReset();
  submitMutate.mockReset();
  pickerExclusions.length = 0;
});

describe("QA-2026-10-14 — HR records a resignation for a chosen employee", () => {
  it("asks whom the resignation is for and refuses to submit until an employee is chosen", () => {
    render(<ResignationFormSheet open onOpenChange={jest.fn()} mode="record" />);
    expect(screen.getByRole("heading", { name: "Record Resignation" })).toBeInTheDocument();
    expect(pickerExclusions.at(-1)).toEqual(["owner-1"]);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    expect(toastError).toHaveBeenCalledWith("Select the employee who is resigning");
    expect(recordMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "pick employee" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    expect(recordMutate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "emp-7", reasonCategory: "Better salary or benefits" }),
      expect.any(Object),
    );
    expect(submitMutate).not.toHaveBeenCalled();
  });
});

describe("QA-2026-10-14 — an employee submits their own resignation", () => {
  it("shows no employee picker and files through the self-service endpoint without a userId", () => {
    render(<ResignationFormSheet open onOpenChange={jest.fn()} mode="self" />);
    expect(screen.queryByRole("button", { name: "pick employee" })).not.toBeInTheDocument();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    expect(submitMutate).toHaveBeenCalledTimes(1);
    expect(submitMutate.mock.calls[0][0]).not.toHaveProperty("userId");
    expect(recordMutate).not.toHaveBeenCalled();
  });
});
