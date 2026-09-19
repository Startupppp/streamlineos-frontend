import { useForm } from "react-hook-form";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  BuildDirtyStateProvider,
  useBuildHasUnsavedWork,
} from "@/features/build/navigation/build-dirty-state-context";
import { UpdateFormFields, type CreateUpdateInput } from "./update-form-fields";

function DirtyProbe() {
  const hasUnsavedWork = useBuildHasUnsavedWork();
  return <span data-testid="dirty">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function Harness({ isOpen }: { isOpen: boolean }) {
  const form = useForm<CreateUpdateInput>({ defaultValues: { body: "" } });
  return (
    <BuildDirtyStateProvider>
      <DirtyProbe />
      <UpdateFormFields form={form} isOpen={isOpen} />
    </BuildDirtyStateProvider>
  );
}

describe("BSN-04-010 the project Updates composer registers with the shared dirty-state guard", () => {
  it("reports no unsaved work before the author types", () => {
    render(<Harness isOpen />);
    expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
  });

  it("reports unsaved work once the author types, so a scope change prompts instead of discarding the draft", () => {
    render(<Harness isOpen />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Sprint 3 slipped a week." },
    });
    expect(screen.getByTestId("dirty")).toHaveTextContent("dirty");
  });

  it("reports no unsaved work while the dialog is closed even with a dirty field, so a stale draft cannot block navigation forever", () => {
    render(<Harness isOpen={false} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Typed then dismissed." },
    });
    expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
  });
});
