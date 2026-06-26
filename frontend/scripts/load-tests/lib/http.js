import http from "k6/http";
import { check, fail } from "k6";
import { API_PREFIX, SESSION_COOKIE, LOAD_TEST_SECRET } from "./config.js";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const warnedStatuses = {};

function baseHeaders(extra = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": BROWSER_UA,
    ...extra,
  };
  if (LOAD_TEST_SECRET) {
    headers["X-Load-Test-Secret"] = LOAD_TEST_SECRET;
  }
  return headers;
}

export function buildHeaders(extra = {}) {
  if (!SESSION_COOKIE) {
    fail(
      "SESSION_COOKIE is required. Run: pnpm load-test:smoke — or set SESSION_COOKIE manually."
    );
  }

  return {
    headers: {
      ...baseHeaders(),
      Cookie: SESSION_COOKIE,
      ...extra,
    },
    tags: extra.tags || {},
  };
}

export function publicGet(path, tags = {}) {
  const headers = baseHeaders();
  return http.get(`${API_PREFIX}${path}`, { headers, tags });
}

export function apiGet(path, tags = {}) {
  const { headers, tags: mergedTags } = buildHeaders({ tags });
  return http.get(`${API_PREFIX}${path}`, { headers, tags: mergedTags });
}

export function apiPost(path, body, tags = {}) {
  const { headers, tags: mergedTags } = buildHeaders({ tags });
  return http.post(`${API_PREFIX}${path}`, JSON.stringify(body), {
    headers,
    tags: mergedTags,
  });
}

export function assertOk(res, name) {
  const statusOk = res.status >= 200 && res.status < 300;

  if (!statusOk && !warnedStatuses[`${name}:${res.status}`]) {
    warnedStatuses[`${name}:${res.status}`] = true;
    const snippet = (res.body || "").slice(0, 120);
    console.warn(`${name} returned ${res.status}: ${snippet}`);
  }

  check(res, {
    [`${name} status 2xx (got ${res.status})`]: () => statusOk,
    [`${name} json body`]: (r) => {
      if (!statusOk) return true;
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });
}

export function assertSetupOk(res, name) {
  if (res.status < 200 || res.status >= 300) {
    fail(`Setup failed for ${name}: HTTP ${res.status} — ${(res.body || "").slice(0, 200)}`);
  }
}

export function parseJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

export function firstId(list, key = "id") {
  if (!Array.isArray(list) || list.length === 0) return null;
  const item = list[0];
  return item && item[key] != null ? item[key] : null;
}
