import { getSignedFileUrl, viewFile } from "../use-file-url";
import { apiClient } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), download: jest.fn() },
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockGet = apiClient.get as jest.Mock;

const ORG = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ url: "https://signed.example/obj?sig=1" });
});

/**
 * PRD-C103, "authorization recheck before short-lived download URLs" on the
 * client side of the seam.
 *
 * `isLocalUrl` short-circuited on the substring `/uploads/`, and `uploads` is the
 * DEFAULT folder every tenant key is minted into. Any reference the object-key
 * matcher did not recognise — a region-prefixed key `<prefix>/<orgId>/uploads/…`
 * is the live example — was therefore handed back verbatim as a relative path
 * instead of being exchanged at `/storage/download`, so no authorization recheck
 * ever ran for it.
 */
describe("getSignedFileUrl — a tenant object key is always exchanged, never returned verbatim", () => {
  it("exchanges an organisation-prefixed key in the default uploads folder", async () => {
    const key = `${ORG}/uploads/1-report.pdf`;

    await expect(getSignedFileUrl(key)).resolves.toBe("https://signed.example/obj?sig=1");
    expect(mockGet).toHaveBeenCalledWith("/storage/download", { key });
  });

  it("exchanges a region-prefixed key rather than treating it as a local path", async () => {
    const key = `eu/${ORG}/uploads/1-report.pdf`;

    await expect(getSignedFileUrl(key)).resolves.toBe("https://signed.example/obj?sig=1");
    expect(mockGet).toHaveBeenCalledWith("/storage/download", { key });
  });

  it("exchanges a legacy folder key that names no organisation", async () => {
    await expect(getSignedFileUrl("uploads/1-report.pdf")).resolves.toBe(
      "https://signed.example/obj?sig=1",
    );
    expect(mockGet).toHaveBeenCalledWith("/storage/download", {
      key: "uploads/1-report.pdf",
    });
  });

  it("still returns a genuinely local, same-origin asset without a round trip (control)", async () => {
    await expect(getSignedFileUrl("/logo.svg")).resolves.toBe("/logo.svg");
    expect(mockGet).not.toHaveBeenCalled();
  });
});

/**
 * A signed URL opened into a named-less tab without `noopener` leaves
 * `window.opener` live on the new document, so anything the signed host serves
 * can navigate the app's own tab. The sibling helper `viewProtectedFile` already
 * passed the flags; this one did not.
 */
describe("viewFile — opens the signed URL with the opener severed", () => {
  it("passes noopener and noreferrer", async () => {
    const open = jest.fn();
    Object.defineProperty(window, "open", { value: open, writable: true });

    await viewFile(`${ORG}/uploads/1-report.pdf`);

    expect(open).toHaveBeenCalledWith(
      "https://signed.example/obj?sig=1",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
