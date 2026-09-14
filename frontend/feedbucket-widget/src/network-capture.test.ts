describe("network capture cannot break the host application", () => {
  const originalFetch = window.fetch;

  afterEach(() => {
    window.fetch = originalFetch;
    jest.resetModules();
  });

  it("resolves with the response when the request cannot be described, because reading a throwing url getter must not turn a call the app made successfully into a rejection", async () => {
    const response = { ok: true, status: 200, statusText: "OK" } as unknown as Response;
    const orig = jest.fn().mockResolvedValue(response);
    window.fetch = orig as unknown as typeof window.fetch;

    const { initNetworkCapture } = await import("./network-capture");
    initNetworkCapture("https://widget.example");

    const undescribable = {
      method: "GET",
      get url(): string {
        throw new Error("url is not readable");
      },
    };

    await expect(
      window.fetch(undescribable as unknown as Request),
    ).resolves.toBe(response);
    expect(orig).toHaveBeenCalledTimes(1);
  });

  it("still rejects with the original error when the underlying request genuinely fails, so capture never converts a failure into a success", async () => {
    const failure = new TypeError("Failed to fetch");
    const orig = jest.fn().mockRejectedValue(failure);
    window.fetch = orig as unknown as typeof window.fetch;

    const { initNetworkCapture } = await import("./network-capture");
    initNetworkCapture("https://widget.example");

    await expect(window.fetch("https://api.example/me/access")).rejects.toBe(failure);
  });
});
