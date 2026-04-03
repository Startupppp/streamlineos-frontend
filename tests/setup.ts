import { vi } from "vitest";

// Mock server-only module — Next.js server-only packages throw when imported
// outside of a Next.js server context (e.g., in Vitest's node environment).
vi.mock("server-only", () => ({}));

// Mock Redis — prevents real network calls in tests.
// Individual tests can override these mocks with vi.mocked(...).mockResolvedValue(...)
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    ping: vi.fn(),
  },
  isRedisEnabled: vi.fn(() => true),
  redisHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
}));

// Mock DB — prevents real DB connections in unit/integration tests.
// The mock is intentionally shallow; tests that need specific return values
// should use vi.mocked(db.query.xxx.findMany).mockResolvedValue([...]) etc.
vi.mock("@/lib/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: () =>
          new Proxy(
            {},
            {
              get: () => ({
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue(null),
              }),
            }
          ),
      }
    ),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  },
  client: {},
}));
