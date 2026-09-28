import {
  publicMediaBrokerUrl,
  publicMediaFileKey,
  rewritePublicCoverImage,
  rewritePublicMediaUrls,
} from "./rewrite-public-media-urls";

describe("rewritePublicMediaUrls", () => {
  const shareToken = "tok-abc-123";
  const objectKey = "org-1/kb-media/org-1/abc.png";
  const brokered = publicMediaBrokerUrl(shareToken, objectKey);

  it("brokers the bare object key the uploader actually stores on an image node", () => {
    const content = { type: "img", url: objectKey };
    const result = rewritePublicMediaUrls(content, shareToken) as Record<string, unknown>;
    expect(result.url).toBe(brokered);
  });

  it("brokers a legacy absolute bucket url without being told the bucket base", () => {
    const content = { type: "img", url: `https://pub.r2.example.com/${objectKey}` };
    const result = rewritePublicMediaUrls(content, shareToken) as Record<string, unknown>;
    expect(result.url).toBe(brokered);
  });

  it("brokers video, audio and file nodes, the other three sources the public renderer emits", () => {
    const content = [
      { type: "video", url: "org-1/kb-media/org-1/clip.mp4" },
      { type: "audio", url: "org-1/kb-media/org-1/take.mp3" },
      { type: "file", url: "org-1/kb-media/org-1/report.pdf" },
    ];
    const result = rewritePublicMediaUrls(content, shareToken) as Array<{ url: string }>;
    expect(result.map((n) => n.url)).toEqual([
      publicMediaBrokerUrl(shareToken, "org-1/kb-media/org-1/clip.mp4"),
      publicMediaBrokerUrl(shareToken, "org-1/kb-media/org-1/take.mp3"),
      publicMediaBrokerUrl(shareToken, "org-1/kb-media/org-1/report.pdf"),
    ]);
  });

  it("leaves a hyperlink url alone so anchors are not brokered into a 404", () => {
    const content = { type: "a", url: "https://other.example.com/page" };
    const result = rewritePublicMediaUrls(content, shareToken) as Record<string, unknown>;
    expect(result.url).toBe("https://other.example.com/page");
  });

  it("leaves a link-preview url alone even when a media node is its sibling", () => {
    const content = [
      { type: "link_preview", url: "https://other.example.com/article" },
      { type: "img", url: objectKey },
    ];
    const result = rewritePublicMediaUrls(content, shareToken) as Array<{ url: string }>;
    expect(result[0].url).toBe("https://other.example.com/article");
    expect(result[1].url).toBe(brokered);
  });

  it("brokers a url nested in the attrs of a media node and keeps its siblings", () => {
    const content = {
      type: "image",
      attrs: { url: "org-2/kb-media/org-2/photo.jpg", alt: "photo" },
    };
    const result = rewritePublicMediaUrls(content, shareToken) as {
      attrs: { url: string; alt: string };
    };
    expect(result.attrs.url).toBe(
      publicMediaBrokerUrl(shareToken, "org-2/kb-media/org-2/photo.jpg"),
    );
    expect(result.attrs.alt).toBe("photo");
  });

  it("does not let a media node's type leak into a link in its children", () => {
    const content = {
      type: "img",
      url: objectKey,
      children: [{ type: "a", url: "https://other.example.com/caption" }],
    };
    const result = rewritePublicMediaUrls(content, shareToken) as {
      url: string;
      children: Array<{ url: string }>;
    };
    expect(result.url).toBe(brokered);
    expect(result.children[0].url).toBe("https://other.example.com/caption");
  });

  it("leaves inline data bytes alone because they name no stored object", () => {
    const inline = "data:image/png;base64,iVBORw0KGgo=";
    const content = { type: "img", url: inline };
    const result = rewritePublicMediaUrls(content, shareToken) as Record<string, unknown>;
    expect(result.url).toBe(inline);
  });

  it("returns null unchanged", () => {
    expect(rewritePublicMediaUrls(null, shareToken)).toBeNull();
  });
});

describe("publicMediaFileKey", () => {
  it("reads the object key off an absolute bucket url, decoding the path", () => {
    expect(
      publicMediaFileKey("https://pub.r2.example.com/org-1/kb-media/org-1/a%20b.png"),
    ).toBe("org-1/kb-media/org-1/a b.png");
  });

  it("drops the query and fragment a signed url would carry", () => {
    expect(
      publicMediaFileKey(
        "https://pub.r2.example.com/org-1/kb-media/org-1/a.png?sig=zzz#frag",
      ),
    ).toBe("org-1/kb-media/org-1/a.png");
  });

  it("returns the value itself for the bare key shape the uploader writes", () => {
    expect(publicMediaFileKey("org-1/kb-media/org-1/a.png")).toBe(
      "org-1/kb-media/org-1/a.png",
    );
  });

  it("returns null only for shapes that carry their own bytes", () => {
    expect(publicMediaFileKey("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
    expect(publicMediaFileKey("blob:https://app.example.com/1-2-3")).toBeNull();
    expect(publicMediaFileKey("   ")).toBeNull();
  });
});

describe("rewritePublicCoverImage", () => {
  const shareToken = "tok-cover-1";

  it("brokers the stored cover key so revoking the share revokes the cover", () => {
    expect(rewritePublicCoverImage("org-1/kb-media/org-1/cover.webp", shareToken)).toBe(
      publicMediaBrokerUrl(shareToken, "org-1/kb-media/org-1/cover.webp"),
    );
  });

  it("cuts the #y framing fragment the way the backend cuts it before brokering", () => {
    expect(
      rewritePublicCoverImage("org-1/kb-media/org-1/cover.webp#y=32", shareToken),
    ).toBe(publicMediaBrokerUrl(shareToken, "org-1/kb-media/org-1/cover.webp"));
  });

  it("brokers a legacy absolute bucket cover instead of emitting the object url", () => {
    const result = rewritePublicCoverImage(
      "https://pub.r2.example.com/org-1/kb-media/org-1/cover.webp",
      shareToken,
    );
    expect(result).toBe(
      publicMediaBrokerUrl(shareToken, "org-1/kb-media/org-1/cover.webp"),
    );
    expect(result).not.toContain("pub.r2.example.com");
  });

  it("passes a gradient cover through untouched", () => {
    expect(rewritePublicCoverImage("gradient:ocean", shareToken)).toBe("gradient:ocean");
  });

  it("drops a cover that resolves to no object key rather than rendering it raw", () => {
    expect(rewritePublicCoverImage("data:image/png;base64,iVBORw0KGgo=", shareToken)).toBeNull();
    expect(rewritePublicCoverImage("", shareToken)).toBeNull();
    expect(rewritePublicCoverImage(null, shareToken)).toBeNull();
  });
});
