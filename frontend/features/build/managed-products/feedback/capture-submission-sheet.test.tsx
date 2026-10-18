"use client";

import { render, screen } from "@testing-library/react";
import { CaptureSubmissionSheet } from "./capture-submission-sheet";

const mockUseModuleEnabled = jest.fn();
const mockCaptureMutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useModuleEnabled: (key: string) => mockUseModuleEnabled(key),
}));

jest.mock("@/hooks/api/feedbucket/use-feedbucket-submissions", () => ({
  useCaptureSubmission: () => ({ mutate: mockCaptureMutate, isPending: false }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: jest.fn() }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let capturedOpen: boolean | undefined;
jest.mock("@/components/shared", () => ({
  EntityFormSheet: ({ open, children }: { open: boolean; children: (form: unknown) => unknown }) => {
    capturedOpen = open;
    return open ? <div data-testid="sheet-open">{children({ control: {} })}</div> : null;
  },
}));

jest.mock("@/components/ui/form", () => ({
  FormControl: ({ children }: { children: unknown }) => children,
  FormField: ({ render: r }: { render: (p: { field: object }) => unknown }) => r({ field: {} }),
  FormItem: ({ children }: { children: unknown }) => children,
  FormLabel: ({ children }: { children: unknown }) => children,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/input", () => ({ Input: () => <input /> }));
jest.mock("@/components/ui/textarea", () => ({ Textarea: () => <textarea /> }));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: unknown }) => children,
  SelectContent: ({ children }: { children: unknown }) => children,
  SelectItem: ({ children, value }: { children: unknown; value: string }) => <option value={value}>{String(children)}</option>,
  SelectTrigger: ({ children }: { children: unknown }) => children,
  SelectValue: () => null,
}));

beforeEach(() => {
  capturedOpen = undefined;
  mockUseModuleEnabled.mockClear();
  mockCaptureMutate.mockClear();
});

describe("CaptureSubmissionSheet — module gate", () => {
  it("passes open=true to EntityFormSheet when feedbucket module is enabled", () => {
    mockUseModuleEnabled.mockReturnValue(true);
    render(
      <CaptureSubmissionSheet managedProductId={1} open={true} onOpenChange={jest.fn()} />,
    );
    expect(capturedOpen).toBe(true);
    expect(screen.getByTestId("sheet-open")).toBeInTheDocument();
    expect(mockUseModuleEnabled).toHaveBeenCalledWith("build");
  });

  it("blocks the sheet (passes open=false) when feedbucket module is disabled, preventing the form from rendering when the module is off", () => {
    mockUseModuleEnabled.mockReturnValue(false);
    render(
      <CaptureSubmissionSheet managedProductId={1} open={true} onOpenChange={jest.fn()} />,
    );
    expect(capturedOpen).toBe(false);
    expect(screen.queryByTestId("sheet-open")).toBeNull();
  });

  it("passes open=false through unchanged when already closed and module is enabled", () => {
    mockUseModuleEnabled.mockReturnValue(true);
    render(
      <CaptureSubmissionSheet managedProductId={1} open={false} onOpenChange={jest.fn()} />,
    );
    expect(capturedOpen).toBe(false);
  });
});
