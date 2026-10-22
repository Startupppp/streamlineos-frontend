import { render } from "@testing-library/react";
import { publicMediaBrokerUrl } from "@/features/wiki/lib/rewrite-public-media-urls";

const mockPublicGetNoStore = jest.fn();
let capturedContent: unknown;

jest.mock("@/lib/public-fetch", () => ({
  publicGetNoStore: (...args: unknown[]) => mockPublicGetNoStore(...args),
}));

jest.mock("@/features/wiki/components/public-page-content-loader", () => ({
  PublicPageContentLoader: (props: { content: unknown }) => {
    capturedContent = props.content;
    return <div data-testid="public-content" />;
  },
}));

jest.mock(
  "@/features/wiki/components/public-file-download-button",
  () => ({
    PublicFileDownloadButton: () => (
      <button type="button" aria-label="Download file">
        Download
      </button>
    ),
  }),
);

import PublicWikiPage from "@/app/(public)/wiki/[shareToken]/page";

const COVER_KEY = "org-1/kb-media/org-1/cover.webp";
const CONTENT_KEY = "org-1/kb-media/org-1/inline.webp";
const BUCKET_ORIGIN = "https://pub-leak.r2.dev";

interface PublicPageData {
  title: string;
  icon: string | null;
  coverImage: string | null;
  kind: "document" | "spreadsheet" | "file";
  content: Record<string, unknown> | Record<string, unknown>[] | null;
  updatedAt: string | null;
  allowDownload: boolean;
  file: { fileName: string; mimeType: string; byteSize: number } | null;
}

function pageData(overrides: Partial<PublicPageData> = {}): PublicPageData {
  return {
    title: "Handbook",
    icon: null,
    coverImage: null,
    kind: "document",
    content: null,
    updatedAt: null,
    allowDownload: false,
    file: null,
    ...overrides,
  };
}

async function renderRoute(shareToken: string, data: PublicPageData) {
  mockPublicGetNoStore.mockResolvedValue(data);
  const element = await PublicWikiPage({ params: Promise.resolve({ shareToken }) });
  return render(element);
}

function coverBand(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('[aria-hidden="true"].h-40');
}

function coverStyleText(container: HTMLElement): string {
  return coverBand(container)?.getAttribute("style") ?? "";
}

beforeEach(() => {
  mockPublicGetNoStore.mockReset();
  capturedContent = undefined;
});

describe("public wiki share page — no raw object reference reaches the viewer", () => {
  it("renders the page at all, so every negative below is a statement about a live surface", async () => {
    const { getByRole, getByTestId } = await renderRoute("tok-live-1", pageData());

    expect(getByRole("heading", { level: 1 }).textContent).toBe("Handbook");
    expect(getByTestId("public-content")).toBeTruthy();
  });

  it("keeps public branding separate from the article and exposes the update date semantically", async () => {
    const updatedAt = "2026-10-01T12:00:00.000Z";
    const { getByRole, container } = await renderRoute("tok-read-1", pageData({ updatedAt }));

    expect(getByRole("banner")).toHaveTextContent("Knowledge Base");
    expect(getByRole("main")).toContainElement(getByRole("heading", { level: 1 }));
    expect(container.querySelector("time")).toHaveAttribute("dateTime", updatedAt);
    expect(container.querySelector("time")).toHaveTextContent("Last updated Oct 1, 2026");
  });

  it("routes the cover image through the share broker instead of emitting its object key", async () => {
    const { container } = await renderRoute(
      "tok-cover-1",
      pageData({ coverImage: COVER_KEY }),
    );

    expect(coverBand(container)).not.toBeNull();
    expect(coverStyleText(container)).toContain(
      publicMediaBrokerUrl("tok-cover-1", COVER_KEY),
    );
    expect(container.innerHTML).not.toContain(COVER_KEY);
  });

  it("routes a legacy absolute bucket cover through the broker, leaking no bucket origin", async () => {
    const { container } = await renderRoute(
      "tok-cover-2",
      pageData({ coverImage: `${BUCKET_ORIGIN}/${COVER_KEY}` }),
    );

    expect(coverStyleText(container)).toContain(
      publicMediaBrokerUrl("tok-cover-2", COVER_KEY),
    );
    expect(container.innerHTML).not.toContain(BUCKET_ORIGIN);
  });

  it("keeps the cover band for a gradient cover and does not broker it", async () => {
    const { container } = await renderRoute(
      "tok-cover-3",
      pageData({ coverImage: "gradient:ocean" }),
    );

    expect(coverBand(container)).not.toBeNull();
    expect(coverStyleText(container)).not.toContain("/media?key=");
  });

  it("renders no cover band for a cover that resolves to no object key", async () => {
    const { container } = await renderRoute(
      "tok-cover-4",
      pageData({ coverImage: "data:image/png;base64,iVBORw0KGgo=" }),
    );

    expect(coverBand(container)).toBeNull();
    expect(container.innerHTML).not.toContain("base64");
  });

  it("brokers content media without NEXT_PUBLIC_R2_PUBLIC_URL being set", async () => {
    delete process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    await renderRoute(
      "tok-content-1",
      pageData({
        coverImage: null,
        content: [{ type: "img", url: `${BUCKET_ORIGIN}/${CONTENT_KEY}` }],
      }),
    );

    expect(capturedContent).toEqual([
      { type: "img", url: publicMediaBrokerUrl("tok-content-1", CONTENT_KEY) },
    ]);
  });

  it("brokers the bare content key the uploader stores today", async () => {
    await renderRoute(
      "tok-content-2",
      pageData({ content: [{ type: "img", url: CONTENT_KEY }] }),
    );

    expect(capturedContent).toEqual([
      { type: "img", url: publicMediaBrokerUrl("tok-content-2", CONTENT_KEY) },
    ]);
  });

  it("does not serialize legacy media source URLs to the client loader", async () => {
    await renderRoute(
      "tok-content-3",
      pageData({
        content: [
          { type: "image", attrs: { src: `${BUCKET_ORIGIN}/${CONTENT_KEY}` } },
          { type: "video", poster: `${BUCKET_ORIGIN}/${CONTENT_KEY}` },
        ],
      }),
    );

    expect(JSON.stringify(capturedContent)).not.toContain(BUCKET_ORIGIN);
    expect(capturedContent).toEqual([
      {
        type: "image",
        attrs: { src: publicMediaBrokerUrl("tok-content-3", CONTENT_KEY) },
      },
      {
        type: "video",
        poster: publicMediaBrokerUrl("tok-content-3", CONTENT_KEY),
      },
    ]);
  });
});

describe("public wiki share page — file kind rendering", () => {
  it("renders the file name and mime type for a file page, not the content loader", async () => {
    const { getByText, queryByTestId } = await renderRoute(
      "tok-file-1",
      pageData({
        kind: "file",
        allowDownload: false,
        file: { fileName: "report.pdf", mimeType: "application/pdf", byteSize: 204800 },
      }),
    );

    expect(getByText("report.pdf")).toBeTruthy();
    expect(getByText(/application\/pdf/)).toBeTruthy();
    expect(queryByTestId("public-content")).toBeNull();
  });

  it("renders the download button when allowDownload is true", async () => {
    const { getByRole } = await renderRoute(
      "tok-file-2",
      pageData({
        kind: "file",
        allowDownload: true,
        file: { fileName: "report.pdf", mimeType: "application/pdf", byteSize: 204800 },
      }),
    );

    expect(getByRole("button", { name: /download/i })).toBeTruthy();
  });

  it("does not render a download button when allowDownload is false", async () => {
    const { queryByRole } = await renderRoute(
      "tok-file-3",
      pageData({
        kind: "file",
        allowDownload: false,
        file: { fileName: "report.pdf", mimeType: "application/pdf", byteSize: 1024 },
      }),
    );

    expect(queryByRole("button", { name: /download/i })).toBeNull();
  });

  it("renders the content loader for a document page, not the file card", async () => {
    const { getByTestId, queryByText } = await renderRoute(
      "tok-doc-1",
      pageData({ kind: "document" }),
    );

    expect(getByTestId("public-content")).toBeTruthy();
    expect(queryByText(/application\/pdf/)).toBeNull();
  });
});
