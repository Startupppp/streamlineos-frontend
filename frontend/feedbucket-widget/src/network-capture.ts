const MAX_ENTRIES = 30;
const MAX_URL_LENGTH = 2048;

export interface NetworkLogEntry {
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  startedAt: string;
  type: "xhr" | "fetch";
  ok: boolean;
  error?: string;
}

const buffer: NetworkLogEntry[] = [];
let patched = false;
let apiBase = "";

function push(entry: NetworkLogEntry): void {
  if (buffer.length >= MAX_ENTRIES) {
    buffer.shift();
  }
  buffer.push(entry);
}

function isSelfRequest(url: string): boolean {
  if (!apiBase) return false;
  return url.startsWith(apiBase);
}

function truncateUrl(url: string): string {
  return url.length > MAX_URL_LENGTH ? url.slice(0, MAX_URL_LENGTH) : url;
}

function scrubSensitiveHeaders(headers: Headers | Record<string, string> | undefined): void {
}

function patchXhr(): void {
  const OrigXHR = window.XMLHttpRequest;

  class PatchedXHR extends OrigXHR {
    private _method = "";
    private _url = "";
    private _startedAt = 0;

    open(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      this._method = method.toUpperCase();
      this._url = truncateUrl(String(url));
      this._startedAt = 0;
      if (async === undefined) {
        super.open(method, url);
      } else {
        super.open(method, url, async, username, password);
      }
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      this._startedAt = Date.now();
      const startedAt = new Date().toISOString();
      const method = this._method;
      const url = this._url;

      if (!isSelfRequest(url)) {
        this.addEventListener("readystatechange", () => {
          if (this.readyState !== 4) return;
          const durationMs = Date.now() - this._startedAt;
          push({
            method,
            url,
            status: this.status,
            statusText: this.statusText,
            durationMs,
            startedAt,
            type: "xhr",
            ok: this.status >= 200 && this.status < 300,
          });
        });

        this.addEventListener("error", () => {
          push({
            method,
            url,
            status: 0,
            statusText: "",
            durationMs: Date.now() - this._startedAt,
            startedAt,
            type: "xhr",
            ok: false,
            error: "network error",
          });
        });

        this.addEventListener("abort", () => {
          push({
            method,
            url,
            status: 0,
            statusText: "",
            durationMs: Date.now() - this._startedAt,
            startedAt,
            type: "xhr",
            ok: false,
            error: "aborted",
          });
        });
      }

      super.send(body);
    }
  }

  window.XMLHttpRequest = PatchedXHR as unknown as typeof XMLHttpRequest;
}

function patchFetch(): void {
  const origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? (typeof input === "object" && "method" in input ? (input as Request).method : undefined) ?? "GET").toUpperCase();
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    const url = truncateUrl(rawUrl);
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    if (isSelfRequest(url)) {
      return origFetch(input, init);
    }

    try {
      const response = await origFetch(input, init);
      push({
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - t0,
        startedAt,
        type: "fetch",
        ok: response.ok,
      });
      return response;
    } catch (err) {
      push({
        method,
        url,
        status: 0,
        statusText: "",
        durationMs: Date.now() - t0,
        startedAt,
        type: "fetch",
        ok: false,
        error: err instanceof Error ? err.message : "network error",
      });
      throw err;
    }
  };
}

export function initNetworkCapture(widgetApiBase: string): void {
  if (patched) return;
  patched = true;
  apiBase = widgetApiBase;
  patchXhr();
  patchFetch();
}

export function getNetworkLogs(): NetworkLogEntry[] {
  return buffer.slice();
}
