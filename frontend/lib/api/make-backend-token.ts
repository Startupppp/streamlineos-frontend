import type { Session } from "next-auth";
import { mintBackendJwt } from "./mint-backend-jwt";

export async function makeBackendToken(
  session: Session,
): Promise<string | null> {
  return mintBackendJwt(session);
}
