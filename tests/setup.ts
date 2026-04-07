import { vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next-auth", () => ({
  default: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  invalidateUserSession: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

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

function createChainableQuery(finalValue: unknown = []): unknown {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "groupBy", "limit", "offset", "innerJoin", "leftJoin", "returning", "values", "set", "on"];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(finalValue).then(resolve);
  (chain as Record<string | symbol, unknown>)[Symbol.toStringTag] = "Promise";
  return chain;
}

vi.mock("@/lib/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: () =>
          new Proxy(
            {},
            {
              get: (_t, prop) => {
                if (prop === "findMany") return vi.fn().mockResolvedValue([]);
                if (prop === "findFirst") return vi.fn().mockResolvedValue(null);
                return vi.fn().mockResolvedValue([]);
              },
            }
          ),
      }
    ),
    select: vi.fn(() => createChainableQuery([])),
    insert: vi.fn(() => createChainableQuery([{ id: 1 }])),
    update: vi.fn(() => createChainableQuery([])),
    delete: vi.fn(() => createChainableQuery([])),
  },
  client: {},
}));
