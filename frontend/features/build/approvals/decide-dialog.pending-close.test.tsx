import React from "react";
import { render, act } from "@testing-library/react";

let capturedDialogOnOpenChange: ((v: boolean) => void) | undefined;
let pending = false;
jest.mock("@/hooks/api/build/approvals", () => ({
  useApproval: () => ({ data: undefined, error: null, ownerStamp: null, refetch: jest.fn() }),
  useDecideApproval: () => ({ isPending: pending, mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => () => ({ values: { decision: "approved", decisionComment: "" } }),
}));

jest.mock("./approvals-schema", () => ({
  decideApprovalSchema: { safeParse: () => ({ success: true, data: {} }) },
}));

jest.mock("react-hook-form", () => {
  const actual = jest.requireActual("react-hook-form");
  return {
    ...actual,
    useForm: () => ({
      handleSubmit: (fn: (...args: unknown[]) => void) => (e?: { preventDefault?: () => void }) => {
        e?.preventDefault?.();
        fn({ decision: "approved", decisionComment: "" });
      },
      control: {},
      reset: jest.fn(),
      formState: { errors: {} },
      register: () => ({}),
      getValues: () => ({}),
    }),
    FormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) => {
    capturedDialogOnOpenChange = onOpenChange;
    return open ? <div data-testid="dialog">{children}</div> : null;
  },
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: () => <span />,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: () => <span />,
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormField: ({ render: renderFn }: { render: (args: unknown) => React.ReactNode }) =>
    renderFn({ field: { value: "", onChange: jest.fn() } }) as React.ReactElement,
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <option>{children}</option>,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children }: { children?: React.ReactNode }) => (
    <button type="submit">{children}</button>
  ),
}));

import { DecideDialog } from "./decide-dialog";

describe("DecideDialog — pending-close guard", () => {
  beforeEach(() => {
    capturedDialogOnOpenChange = undefined;
    pending = false;
    jest.clearAllMocks();
  });

  it("blocks dialog close via backdrop/Escape while isPending=true", () => {
    pending = true;
    const onOpenChange = jest.fn();
    render(
      <DecideDialog
        open
        projectId={1}
        approvalId={1}
        revision={1}
        onOpenChange={onOpenChange}
      />,
    );

    act(() => {
      capturedDialogOnOpenChange?.(false);
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("allows dialog close when isPending=false", () => {
    const onOpenChange = jest.fn();
    render(
      <DecideDialog
        open
        projectId={1}
        approvalId={1}
        revision={1}
        onOpenChange={onOpenChange}
      />,
    );

    act(() => {
      capturedDialogOnOpenChange?.(false);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
