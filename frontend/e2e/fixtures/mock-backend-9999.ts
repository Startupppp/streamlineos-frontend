import * as http from "http";

export interface MockBackend9999 {
  stop: () => Promise<void>;
}

function makeBackendJwt(orgId: string, userId: string): string {
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "none" })}.${enc({ orgId, sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

function accessBody(scopes: Record<string, string>, modules: Record<string, boolean>): string {
  return JSON.stringify({
    success: true,
    data: {
      membershipId: 1,
      scopes,
      isOrgOwner: true,
      canManageOrganizationMembership: true,
      modules,
      version: 1,
    },
  });
}

export function startMockBackend(
  port: number,
  orgId: string,
  userId: string,
  scopes: Record<string, string>,
  modules: Record<string, boolean>,
): Promise<MockBackend9999> {
  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    if (method === "POST" && url.startsWith("/auth/session-exchange")) {
      const token = makeBackendJwt(orgId, userId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { token } }));
      return;
    }

    if (method === "GET" && url.startsWith("/auth/session-data/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Not found" }));
      return;
    }

    if (method === "GET" && url === "/me/access") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(accessBody(scopes, modules));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Not found" }));
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve({
        stop: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}
