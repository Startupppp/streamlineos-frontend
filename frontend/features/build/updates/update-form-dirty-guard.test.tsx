import { useForm } from "react-hook-form";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  DirtyStateProvider,
  useHasUnsavedWork,
} from "@/components/shared/dirty-state-context";
import { UpdateFormFields } from "./update-form-fields";
import type { CreateUpdateInput } from "./updates-schema";

function DirtyProbe() {
  const hasUnsavedWork = useHasUnsavedWork();
  return <span data-testid="dirty">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function Harness({ isOpen }: { isOpen: boolean }) {
  const form = useForm<CreateUpdateInput>({ defaultValues: { body: "" } });
  return (
    <DirtyStateProvider>
      <DirtyProbe />
      <UpdateFormFields form={form} isOpen={isOpen} />
    </DirtyStateProvider>
  );
}

describe("BSN-04-010 the project Updates composer registers with the shared dirty-state guard", () => {
  it("reports no unsaved work before the author types", () => {
    render(<Harness isOpen />);
    expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
  });

  it("reports unsaved work once the author types in the body field, so a scope change prompts instead of discarding the draft", () => {
    render(<Harness isOpen />);
    fireEvent.change(screen.getByRole("textbox", { name: /^update$/i }), {
      target: { value: "Sprint 3 slipped a week." },
    });
    expect(screen.getByTestId("dirty")).toHaveTextContent("dirty");
  });

  it("reports no unsaved work while the dialog is closed even with a dirty field, so a stale draft cannot block navigation forever", () => {
    render(<Harness isOpen={false} />);
    fireEvent.change(screen.getByRole("textbox", { name: /^update$/i }), {
      target: { value: "Typed then dismissed." },
    });
    expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
  });
});
