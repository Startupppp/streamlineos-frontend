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

import PublicWikiPage from "@/app/(public)/wiki/[shareToken]/page";

const COVER_KEY = "org-1/kb-media/org-1/cover.webp";
const CONTENT_KEY = "org-1/kb-media/org-1/inline.webp";
const BUCKET_ORIGIN = "https://pub-leak.r2.dev";

interface PublicPageData {
  title: string;
  icon: string | null;
  coverImage: string | null;
  content: Record<string, unknown> | Record<string, unknown>[] | null;
  updatedAt: string | null;
}

function pageData(overrides: Partial<PublicPageData> = {}): PublicPageData {
  return {
    title: "Handbook",
    icon: null,
    coverImage: null,
    content: null,
    updatedAt: null,
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
});
