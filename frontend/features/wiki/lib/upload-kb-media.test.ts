import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";

const upload = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: { upload: (...args: unknown[]) => upload(...args) },
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

import { uploadKbMedia } from "./upload-kb-media";

function makeFile(name: string, lastModified = 1_700_000_000_000): File {
  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, {
    type: "image/png",
    lastModified,
  });
  Object.defineProperty(file, "size", { value: 4 });
  return file;
}

function keySentOnCall(index: number): string {
  const config = upload.mock.calls[index]?.[3] as
    | { headers?: Record<string, string> }
    | undefined;
  const key = config?.headers?.[IDEMPOTENCY_HEADER];
  if (typeof key !== "string" || key.length === 0)
    throw new Error(`call ${index} sent no ${IDEMPOTENCY_HEADER}`);
  return key;
}

describe("uploadKbMedia — idempotency key identifies the upload, not the attempt", () => {
  beforeEach(() => {
    upload.mockReset();
  });

  it("sends an Idempotency-Key at all — POST /kb/media is @Idempotent and 400s without one", async () => {
    upload.mockResolvedValue({ key: "k", name: "a.png" });

    await uploadKbMedia(makeFile("a.png"), 12);

    expect(keySentOnCall(0)).toEqual(expect.any(String));
  });

  it("reuses the SAME key when the same file is retried after a failure", async () => {
    upload.mockRejectedValueOnce(new Error("network timeout"));
    upload.mockResolvedValueOnce({ key: "k", name: "a.png" });
    const file = makeFile("a.png");

    await expect(uploadKbMedia(file, 12)).rejects.toThrow("network timeout");
    await uploadKbMedia(file, 12);

    expect(upload).toHaveBeenCalledTimes(2);
    expect(keySentOnCall(1)).toBe(keySentOnCall(0));
  });

  it("mints a NEW key once the upload has succeeded, so a deliberate re-upload is a new operation", async () => {
    upload.mockResolvedValue({ key: "k", name: "a.png" });
    const file = makeFile("a.png");

    await uploadKbMedia(file, 12);
    await uploadKbMedia(file, 12);

    expect(keySentOnCall(1)).not.toBe(keySentOnCall(0));
  });

  it("gives a different file its own key, so one upload cannot replay another's response", async () => {
    upload.mockRejectedValue(new Error("network timeout"));

    await expect(uploadKbMedia(makeFile("a.png"), 12)).rejects.toThrow();
    await expect(uploadKbMedia(makeFile("b.png"), 12)).rejects.toThrow();

    expect(keySentOnCall(1)).not.toBe(keySentOnCall(0));
  });

  it("keys the same file per page — an attachment on another page is another operation", async () => {
    upload.mockRejectedValue(new Error("network timeout"));
    const file = makeFile("a.png");

    await expect(uploadKbMedia(file, 12)).rejects.toThrow();
    await expect(uploadKbMedia(file, 13)).rejects.toThrow();

    expect(keySentOnCall(1)).not.toBe(keySentOnCall(0));
  });
});
