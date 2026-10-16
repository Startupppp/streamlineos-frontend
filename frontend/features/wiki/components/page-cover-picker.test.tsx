import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageCoverPickerDialog } from "./page-cover-picker";

const mockUpload = jest.fn();

jest.mock("@/features/wiki/lib/upload-kb-media", () => ({
  uploadKbMedia: (...args: unknown[]) => mockUpload(...args),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  mockUpload.mockReset();
});

it("holds one cover choice while an image upload is pending", async () => {
  let resolveUpload: (value: { key: string }) => void = () => undefined;
  mockUpload.mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));
  const onCoverChange = jest.fn();
  const onOpenChange = jest.fn();
  const user = userEvent.setup();
  const view = render(
    <PageCoverPickerDialog open pageId={7} onCoverChange={onCoverChange} onOpenChange={onOpenChange} />,
  );
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  fireEvent.change(input!, { target: { files: [new File(["image"], "cover.png", { type: "image/png" })] } });

  const gradient = screen.getByRole("button", { name: "ocean gradient" });
  expect(gradient).toBeDisabled();
  await user.click(gradient);
  expect(onCoverChange).not.toHaveBeenCalled();
  expect(onOpenChange).not.toHaveBeenCalled();

  await act(async () => resolveUpload({ key: "kb/cover.png" }));
  expect(onCoverChange).toHaveBeenCalledTimes(1);
  expect(onCoverChange).toHaveBeenCalledWith("kb/cover.png");
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("ignores an old upload after the picker is externally closed and reopened", async () => {
  let resolveUpload: (value: { key: string }) => void = () => undefined;
  mockUpload.mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));
  const onCoverChange = jest.fn();
  const onOpenChange = jest.fn();
  const user = userEvent.setup();
  const props = { pageId: 7, onCoverChange, onOpenChange };
  const view = render(<PageCoverPickerDialog {...props} open />);
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  fireEvent.change(input!, { target: { files: [new File(["image"], "old.png", { type: "image/png" })] } });

  view.rerender(<PageCoverPickerDialog {...props} open={false} />);
  view.rerender(<PageCoverPickerDialog {...props} open />);
  await user.click(screen.getByRole("button", { name: "ocean gradient" }));
  await act(async () => resolveUpload({ key: "kb/old.png" }));

  expect(onCoverChange).toHaveBeenCalledTimes(1);
  expect(onCoverChange).toHaveBeenCalledWith("gradient:ocean");
});
