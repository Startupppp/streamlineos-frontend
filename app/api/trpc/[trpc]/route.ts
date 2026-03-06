import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../../../server/api/root";
import { createTRPCContext } from "../../../../server/api/trpc";
import { logger } from "../../../../lib/logger";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: ({ path, error }) => {
      logger.error(`tRPC error on ${path ?? "unknown"}`, {
        code: error.code,
        message: error.message,
      });
    },
  });

export { handler as GET, handler as POST };
