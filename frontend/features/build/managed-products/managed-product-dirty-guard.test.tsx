import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  BuildDirtyStateProvider,
  useBuildHasUnsavedWork,
} from "@/features/build/navigation/build-dirty-state-context";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";

jest.mock("@/components/shared", () => ({
  FormSheetChrome: ({
    open,
    children,
    footer,
  }: {
    open: boolean;
    children: React.ReactNode;
    footer: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
  }) => open ? <div>{children}{footer}</div> : null,
  MemberPicker: ({ onChange }: { onChange: (v: string | null) => void; value?: string; mode?: string; allowUnassigned?: boolean; placeholder?: string }) => (
    <button type="button" onClick={() => onChange("user-1")} data-testid="member-picker">
      Select owner
    </button>
  ),
}));

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useBuildHasUnsavedWork();
  return <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function renderCreateHarness() {
  return render(
    <BuildDirtyStateProvider>
      <HasUnsavedWorkProbe />
      <ManagedProductFormSheet
        open
        onOpenChange={jest.fn()}
        mode="create"
        onSubmitCreate={jest.fn()}
      />
    </BuildDirtyStateProvider>,
  );
}

describe("managed product form sheet dirty guard (BSN-04-010, BSN-04-013)", () => {
  test("clean form when sheet is first opened reports clean state", () => {
    renderCreateHarness();
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("entering a product name registers the form as dirty so scope-change guard fires", async () => {
    renderCreateHarness();

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Product name"), {
        target: { value: "New Product" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty"),
    );
  });

  test("typed product name is preserved after editing (content is not cleared on dirty registration)", async () => {
    renderCreateHarness();

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Product name"), {
        target: { value: "Important product" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty"),
    );

    expect(
      (screen.getByPlaceholderText("Product name") as HTMLInputElement).value,
    ).toBe("Important product");
  });

  test("closed sheet does not register as dirty even if form was previously dirty", () => {
    render(
      <BuildDirtyStateProvider>
        <HasUnsavedWorkProbe />
        <ManagedProductFormSheet
          open={false}
          onOpenChange={jest.fn()}
          mode="create"
          onSubmitCreate={jest.fn()}
        />
      </BuildDirtyStateProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });
});
