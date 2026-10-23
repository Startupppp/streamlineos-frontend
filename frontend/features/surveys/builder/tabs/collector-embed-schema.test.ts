import { allowedOriginsSchema, embedSnippetFor, parseAllowedOrigins } from "./collector-embed-schema";

describe("allowed sites for an embed link", () => {
  it("accepts https origins separated by commas, spaces or new lines, dropping a trailing slash", () => {
    const raw = "https://a.example, https://b.example/\nhttps://c.example";
    expect(allowedOriginsSchema.safeParse({ allowedOrigins: raw }).success).toBe(true);
    expect(parseAllowedOrigins(raw)).toEqual(["https://a.example", "https://b.example", "https://c.example"]);
  });

  it("accepts an empty list, which keeps the survey unframeable", () => {
    expect(allowedOriginsSchema.safeParse({ allowedOrigins: "" }).success).toBe(true);
    expect(parseAllowedOrigins("")).toEqual([]);
  });

  it.each(["http://a.example", "https://a.example/path", "*", "https://*.a.example", "a.example"])("rejects %s", (origin) => {
    expect(allowedOriginsSchema.safeParse({ allowedOrigins: origin }).success).toBe(false);
  });

  it("builds an iframe that opens the survey in embed mode", () => {
    expect(embedSnippetFor("https://app.example", "tok")).toContain('src="https://app.example/s/tok?embed=1"');
  });
});
