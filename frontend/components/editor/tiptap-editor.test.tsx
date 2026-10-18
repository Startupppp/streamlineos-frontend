import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TiptapEditor } from "./tiptap-editor";

const upload = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: { upload: (...args: unknown[]) => upload(...args) },
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

function pngFile(): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "pasted.png", { type: "image/png" });
}

async function insertImage() {
  const input = await screen.findByLabelText("Insert image");
  fireEvent.change(input, { target: { files: [pngFile()] } });
  await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
  const [path, formData]: unknown[] = upload.mock.calls[0] ?? [];
  return { path, folder: formData instanceof FormData ? formData.get("folder") : null };
}

describe("TiptapEditor image upload folder", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue({ key: "org/x/pasted.png" });
  });

  it("writes to the shared editor-images folder by default, so HR, mail and portal editors need no Build permission", async () => {
    render(<TiptapEditor content="" output="html" />);

    const { path, folder } = await insertImage();

    expect(path).toBe("/storage/upload");
    expect(folder).toBe("editor-images");
  });

  it("writes Build ticket images to the folder the server gates on ticket write permission", async () => {
    render(<TiptapEditor content="" output="html" imageFolder="build-ticket-images" />);

    const { folder } = await insertImage();

    expect(folder).toBe("build-ticket-images");
  });
});
