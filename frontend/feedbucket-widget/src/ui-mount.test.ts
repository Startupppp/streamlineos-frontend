const mockFeedbucketWidget = jest.fn();

jest.mock("./ui", () => ({
  FeedbucketWidget: function (...args: unknown[]) {
    mockFeedbucketWidget(...args);
  },
}));

jest.mock("./screenshot", () => ({
  warmScreenshotCache: jest.fn(),
}));

import { mountWidget } from "./ui-mount";

const API_BASE = "https://api.example.com";
const EMBED_KEY = "fb_test123";

function mockFetch(status: number, body?: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body ?? {}),
  });
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("mounts the widget when the config endpoint returns aiAssistEnabled true", async () => {
  mockFetch(200, { success: true, data: { aiAssistEnabled: true } });

  mountWidget(document.createElement("div"), API_BASE, EMBED_KEY);
  await flushAsync();

  expect(mockFeedbucketWidget).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    API_BASE,
    EMBED_KEY,
    true,
  );
});

it("mounts the widget with aiAssistEnabled false when the config endpoint returns false", async () => {
  mockFetch(200, { success: true, data: { aiAssistEnabled: false } });

  mountWidget(document.createElement("div"), API_BASE, EMBED_KEY);
  await flushAsync();

  expect(mockFeedbucketWidget).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    API_BASE,
    EMBED_KEY,
    false,
  );
});

it("does not mount the widget when the config endpoint returns 404 so a stale embed key never fires repeated requests", async () => {
  mockFetch(404);

  mountWidget(document.createElement("div"), API_BASE, EMBED_KEY);
  await flushAsync();

  expect(mockFeedbucketWidget).not.toHaveBeenCalled();
});

it("mounts the widget with aiAssistEnabled false for non-404 error responses", async () => {
  mockFetch(500);

  mountWidget(document.createElement("div"), API_BASE, EMBED_KEY);
  await flushAsync();

  expect(mockFeedbucketWidget).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    API_BASE,
    EMBED_KEY,
    false,
  );
});
