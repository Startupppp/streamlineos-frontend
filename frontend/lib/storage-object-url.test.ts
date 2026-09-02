import {
  isStorageObjectKey,
  resolveImageUrl,
  storageKeyFromUrl,
  storageObjectUrl,
} from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const ORG = "3f2a9c14-5b7e-4d81-9a02-6c8e1f4b7d33";
const KEY = `${ORG}/uploads/9b1c2d3e-4f50-4a61-8b72-0c9d8e7f6a5b-report.pdf`;
const KB_KEY = `kb-media/${ORG}/cover.webp`;

describe("isStorageObjectKey", () => {
  it("recognises the organisation-scoped key shape the backend mints", () => {
    expect(isStorageObjectKey(KEY)).toBe(true);
  });

  it("recognises the organisation-namespaced folder shape", () => {
    expect(isStorageObjectKey(KB_KEY)).toBe(true);
  });

  it("recognises the same key with a leading slash", () => {
    expect(isStorageObjectKey(`/${KEY}`)).toBe(true);
  });

  it("does not claim a same-origin public asset path", () => {
    expect(isStorageObjectKey("/illustrations/empty-inbox.svg")).toBe(false);
    expect(isStorageObjectKey("/avatars/default.png")).toBe(false);
  });
});

describe("resolveImageUrl", () => {
  it("routes an object key through the authorized image route", () => {
    expect(resolveImageUrl(KEY)).toBe(
      `${API}/storage/image?key=${encodeURIComponent(KEY)}`,
    );
  });

  it("routes a leading-slash key instead of serving it as a same-origin path", () => {
    expect(resolveImageUrl(`/${KEY}`)).toBe(
      `${API}/storage/image?key=${encodeURIComponent(KEY)}`,
    );
  });

  it("routes a legacy folder-first key", () => {
    expect(resolveImageUrl("uploads/1712-logo.png")).toBe(
      `${API}/storage/image?key=${encodeURIComponent("uploads/1712-logo.png")}`,
    );
  });

  it("leaves an absolute, data and blob source untouched", () => {
    expect(resolveImageUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(resolveImageUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(resolveImageUrl("blob:http://localhost:1000/abc")).toBe("blob:http://localhost:1000/abc");
  });

  it("leaves a same-origin public asset path untouched", () => {
    expect(resolveImageUrl("/illustrations/empty-inbox.svg")).toBe("/illustrations/empty-inbox.svg");
  });

  it("is undefined for empty input", () => {
    expect(resolveImageUrl(null)).toBeUndefined();
    expect(resolveImageUrl(undefined)).toBeUndefined();
    expect(resolveImageUrl("")).toBeUndefined();
  });

  it("never emits a raw key as the src", () => {
    for (const value of [KEY, `/${KEY}`, KB_KEY]) {
      expect(resolveImageUrl(value)).not.toBe(value);
      expect(resolveImageUrl(value)).toContain("/storage/image?key=");
    }
  });
});

describe("storageKeyFromUrl", () => {
  it("inverts storageObjectUrl so a resolved src is never persisted", () => {
    expect(storageKeyFromUrl(storageObjectUrl(KEY))).toBe(KEY);
    expect(storageKeyFromUrl(storageObjectUrl(KB_KEY))).toBe(KB_KEY);
  });

  it("is a no-op for a value that is already a key or a foreign URL", () => {
    expect(storageKeyFromUrl(KEY)).toBe(KEY);
    expect(storageKeyFromUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });

  it("survives the resolve round trip idempotently", () => {
    const once = resolveImageUrl(KEY) ?? "";
    expect(resolveImageUrl(storageKeyFromUrl(once))).toBe(once);
  });
});
