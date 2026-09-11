import { resolveShellVariant } from "./shell-variant";

function makeHeaders(record: Record<string, string>): Pick<Headers, "get"> {
  return { get: (key: string) => record[key.toLowerCase()] ?? null };
}

describe("resolveShellVariant", () => {
  describe("Sec-CH-UA-Mobile client hint (preferred)", () => {
    it("returns 'mobile' for ?1", () => {
      expect(
        resolveShellVariant(makeHeaders({ "sec-ch-ua-mobile": "?1" })),
      ).toBe("mobile");
    });

    it("returns 'desktop' for ?0", () => {
      expect(
        resolveShellVariant(makeHeaders({ "sec-ch-ua-mobile": "?0" })),
      ).toBe("desktop");
    });

    it("client hint overrides a mobile UA — ?0 wins even when UA looks like a phone", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "sec-ch-ua-mobile": "?0",
            "user-agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
          }),
        ),
      ).toBe("desktop");
    });

    it("client hint overrides a desktop UA — ?1 wins even when UA looks like a desktop", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "sec-ch-ua-mobile": "?1",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          }),
        ),
      ).toBe("mobile");
    });
  });

  describe("User-Agent fallback (no client hint present)", () => {
    it("returns 'mobile' for an iPhone UA", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "user-agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
          }),
        ),
      ).toBe("mobile");
    });

    it("returns 'mobile' for an Android phone UA", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "user-agent":
              "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          }),
        ),
      ).toBe("mobile");
    });

    it("returns 'mobile' for an iPod UA", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "user-agent":
              "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/19A346",
          }),
        ),
      ).toBe("mobile");
    });

    it("returns 'desktop' for an iPad UA (excluded from the phone pattern)", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "user-agent":
              "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          }),
        ),
      ).toBe("desktop");
    });

    it("returns 'desktop' for a Windows Chrome UA", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
          }),
        ),
      ).toBe("desktop");
    });

    it("returns 'desktop' for a macOS Safari UA", () => {
      expect(
        resolveShellVariant(
          makeHeaders({
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
          }),
        ),
      ).toBe("desktop");
    });
  });

  describe("defaults", () => {
    it("returns 'desktop' when no headers are present", () => {
      expect(resolveShellVariant(makeHeaders({}))).toBe("desktop");
    });
  });
});
