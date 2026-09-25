import { rewritePublicMediaUrls } from "./rewrite-public-media-urls";

describe("rewritePublicMediaUrls", () => {
  const shareToken = "tok-abc-123";
  const r2Base = "https://pub.r2.example.com";

  it("rewrites a top-level url property that starts with the R2 base to a broker url", () => {
    const content = { type: "image", url: "https://pub.r2.example.com/org1/abc.png" };
    const result = rewritePublicMediaUrls(content, shareToken, r2Base) as Record<string, unknown>;
    expect(result.url).toBe(
      `/public/wiki/${shareToken}/media?key=${encodeURIComponent("org1/abc.png")}`,
    );
  });

  it("leaves a url that does not start with the R2 base unchanged", () => {
    const content = { type: "link", url: "https://other.example.com/page" };
    const result = rewritePublicMediaUrls(content, shareToken, r2Base) as Record<string, unknown>;
    expect(result.url).toBe("https://other.example.com/page");
  });

  it("rewrites urls inside a nested attrs object", () => {
    const content = {
      type: "image",
      attrs: { url: "https://pub.r2.example.com/org2/photo.jpg", alt: "photo" },
    };
    const result = rewritePublicMediaUrls(content, shareToken, r2Base) as {
      attrs: { url: string; alt: string };
    };
    expect(result.attrs.url).toBe(
      `/public/wiki/${shareToken}/media?key=${encodeURIComponent("org2/photo.jpg")}`,
    );
    expect(result.attrs.alt).toBe("photo");
  });

  it("rewrites urls inside arrays of nodes", () => {
    const content = [
      { type: "paragraph", content: [] },
      { type: "image", url: "https://pub.r2.example.com/k/file.jpg" },
    ];
    const result = rewritePublicMediaUrls(content, shareToken, r2Base) as Array<{
      type: string;
      url?: string;
    }>;
    expect(result[1].url).toBe(
      `/public/wiki/${shareToken}/media?key=${encodeURIComponent("k/file.jpg")}`,
    );
  });

  it("returns null unchanged", () => {
    expect(rewritePublicMediaUrls(null, shareToken, r2Base)).toBeNull();
  });

  it("handles an empty r2Base string by never rewriting any url", () => {
    const content = { type: "image", url: "https://pub.r2.example.com/org1/abc.png" };
    const result = rewritePublicMediaUrls(content, shareToken, "") as Record<string, unknown>;
    expect(result.url).toBe("https://pub.r2.example.com/org1/abc.png");
  });
});
