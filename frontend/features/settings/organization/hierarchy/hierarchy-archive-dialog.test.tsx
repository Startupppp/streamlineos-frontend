import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-client";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";

const noop = () => {};

describe("HierarchyArchiveDialog", () => {
  it("keeps a dependency failure open and shows actionable counts", () => {
    const error = new ApiError(
      "This branch is still in use. Move or update its dependent records before you archive it.",
      409,
      "ORG_UNIT_HAS_DEPENDENCIES",
      {
        dependencies: [
          {
            key: "child_units",
            label: "Active child organization units",
            count: 2,
          },
          {
            key: "worker_assignments",
            label: "Current worker assignments",
            count: 3,
          },
        ],
      },
    );

    render(
      <HierarchyArchiveDialog
        open
        unitName="North"
        unitLabel="branch"
        isPending={false}
        error={error}
        onConfirm={noop}
        onOpenChange={noop}
      />,
    );

    expect(screen.getByText("Cannot archive branch")).toBeInTheDocument();
    expect(
      screen.getByText("Active child organization units"),
    ).toBeInTheDocument();
    expect(screen.getByText("Current worker assignments")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByText(/Move, close, or reassign these records/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("does not auto-close while an archive request is unresolved", () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <HierarchyArchiveDialog
        open
        unitName="North"
        unitLabel="branch"
        isPending={false}
        error={null}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByText("Archive branch?")).toBeInTheDocument();
  });

  it("uses the shared error formatter for a generic server failure", () => {
    render(
      <HierarchyArchiveDialog
        open
        unitName="HR Team"
        unitLabel="team"
        isPending={false}
        error={new ApiError("An unexpected error occurred", 500)}
        onConfirm={noop}
        onOpenChange={noop}
      />,
    );

    expect(
      screen.getByText(
        "Something went wrong on our end. Please try again shortly.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("An unexpected error occurred"),
    ).not.toBeInTheDocument();
  });
});
