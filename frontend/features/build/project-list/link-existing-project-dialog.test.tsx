import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

const mockUseProjects = jest.fn();
const mockMutate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args), error: (...args: unknown[]) => mockToastError(...args) },
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));
jest.mock("@/hooks/api/build/use-link-project-managed-product", () => ({
  useLinkProjectManagedProduct: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => value,
}));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: ({ options, value, onChange, onSearchChange, footer, emptyText }: {
    options: { value: string; label: string; sublabel?: string }[];
    value: string;
    onChange: (value: string) => void;
    onSearchChange: (value: string) => void;
    footer?: React.ReactNode;
    emptyText: string;
  }) => <div>
    <button type="button" role="combobox" aria-label="Select an existing project" aria-controls="project-options" aria-expanded="true">{value || "Select a project"}</button>
    <input aria-label="Search by project name or key" onChange={(event) => onSearchChange(event.target.value)} />
    {options.length === 0 ? <p>{emptyText}</p> : options.map((option) => (
      <button key={option.value} type="button" onClick={() => { onChange(option.value); onSearchChange(""); }}>{option.sublabel} {option.label}</button>
    ))}
    {footer}
  </div>,
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { LinkExistingProjectDialog } from "./link-existing-project-dialog";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProjects.mockReturnValue({
    data: {
      data: [
        { id: 11, key: "FREE", name: "Unlinked project", managedProductId: null },
        { id: 12, key: "TAKEN", name: "Other product project", managedProductId: 4 },
      ],
      hasMore: false,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
});

it("searches existing projects and links only an unassigned project", () => {
  const onOpenChange = jest.fn();
  render(<LinkExistingProjectDialog managedProductId={39} open onOpenChange={onOpenChange} />);
  expect(screen.getByRole("button", { name: /FREE Unlinked project/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Other product project/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Search by project name or key" }), { target: { value: "FREE" } });
  expect(mockUseProjects).toHaveBeenLastCalledWith({ limit: 50, search: "FREE" }, { enabled: true });
  fireEvent.click(screen.getByRole("button", { name: /FREE Unlinked project/ }));
  fireEvent.click(screen.getByRole("button", { name: "Link project" }));
  expect(mockMutate).toHaveBeenCalledWith(
    { project: expect.objectContaining({ id: 11 }), managedProductId: 39 },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
  act(() => mockMutate.mock.calls[0][1].onSuccess());
  expect(mockToastSuccess).toHaveBeenCalledWith("Unlinked project linked to this product");
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("keeps the dialog open when the link request fails", () => {
  const onOpenChange = jest.fn();
  render(<LinkExistingProjectDialog managedProductId={39} open onOpenChange={onOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: /FREE Unlinked project/ }));
  fireEvent.click(screen.getByRole("button", { name: "Link project" }));
  act(() => mockMutate.mock.calls[0][1].onError(new Error("Project access denied")));
  expect(mockToastError).toHaveBeenCalledWith("Project access denied");
  expect(onOpenChange).not.toHaveBeenCalled();
});

it("keeps a searched selection linkable when the default first page does not contain it", () => {
  mockUseProjects.mockImplementation(({ search }: { search?: string }) => ({
    data: {
      data: search === "REMOTE" ? [{ id: 99, key: "REMOTE", name: "Remote project", managedProductId: null }] : [],
      hasMore: true,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }));
  render(<LinkExistingProjectDialog managedProductId={39} open onOpenChange={jest.fn()} />);

  fireEvent.change(screen.getByRole("textbox", { name: "Search by project name or key" }), { target: { value: "REMOTE" } });
  fireEvent.click(screen.getByRole("button", { name: /REMOTE Remote project/ }));
  fireEvent.click(screen.getByRole("button", { name: "Link project" }));

  expect(mockMutate).toHaveBeenCalledWith(
    { project: expect.objectContaining({ id: 99 }), managedProductId: 39 },
    expect.any(Object),
  );
});

it("shows a retry path when candidate projects cannot load", () => {
  const refetch = jest.fn();
  mockUseProjects.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
  render(<LinkExistingProjectDialog managedProductId={39} open onOpenChange={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
