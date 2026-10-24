import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignDocument, SignEnvelopeFull } from "@/types/sign";
import { useUploadSignDocument } from "./documents";

jest.mock("@/hooks/api/authorized-mutation", () => {
  const { useMutation } = jest.requireActual("@tanstack/react-query");
  return { useAuthorizedMutation: (_key: string, options: object) => useMutation(options) };
});

const upload = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { upload: (...args: unknown[]) => upload(...args) } }));

const ENVELOPE_ID = 7;
const UPLOADED = { id: 41, envelopeId: ENVELOPE_ID, fileName: "QA-TEST-SIGN-nda.pdf", pageCount: 2 } as SignDocument;

describe("uploading a document shows it in the envelope at once", () => {
  it("adds the uploaded document to the open envelope from the upload response", async () => {
    const client = createAppQueryClient();
    const detailKey = growthAndSignQueryKeys.signEnvelopes.detail(ENVELOPE_ID);
    client.setQueryData(detailKey, { envelope: { id: ENVELOPE_ID }, documents: [], recipients: [], fields: [] } as unknown as SignEnvelopeFull);
    upload.mockResolvedValue(UPLOADED);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUploadSignDocument(ENVELOPE_ID), { wrapper });

    await act(() => result.current.mutateAsync(new File(["%PDF"], "QA-TEST-SIGN-nda.pdf", { type: "application/pdf" })));

    expect(client.getQueryData<SignEnvelopeFull>(detailKey)?.documents.map((d) => d.id)).toEqual([41]);
  });
});
