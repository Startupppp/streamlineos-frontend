import SignEnvelopeBuilderPage from "./page";

const redirect = jest.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const notFound = jest.fn(() => {
  throw new Error("not-found");
});

jest.mock("next/navigation", () => ({
  redirect: (path: string) => redirect(path),
  notFound: () => notFound(),
}));
jest.mock("@/lib/rbac/require-permission", () => ({ requireModulePermission: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/features/sign", () => ({ EnvelopeBuilder: () => null }));

function open(envelopeId: string) {
  return SignEnvelopeBuilderPage({ params: Promise.resolve({ envelopeId }) });
}

describe("the envelope builder route only opens a real envelope id", () => {
  beforeEach(() => notFound.mockClear());

  it("sends /sign/envelopes/new to the new envelope dialog instead of loading envelope NaN", async () => {
    await expect(open("new")).rejects.toThrow("redirect:/sign/envelopes?create=1");
  });

  it.each(["abc", "0", "-3", "1.5", "12abc"])("shows not found for %s rather than asking the API for it", async (id) => {
    await expect(open(id)).rejects.toThrow("not-found");
  });

  it("opens the builder for a numeric id", async () => {
    await expect(open("42")).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });
});
