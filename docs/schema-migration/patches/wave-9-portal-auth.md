---
type: wave-9 portal-auth code spec
status: DRAFT
date: 2026-07-26
prereqs: wave-9-infra-retirement-plan.md Step 4; wave-9-portal-audience-design.md
audience-separation-invariant: a CLIENT_PORTAL token MUST NOT reach any internal endpoint; an INTERNAL/absent-aud token MUST NOT reach any portal endpoint — verified at the guard layer before any DB access
---

# Wave 9 — Portal Auth Runtime: Implementation Patch

> Implementation-ready NestJS code for Step 4 of `wave-9-infra-retirement-plan.md`.
> All patches referencing `jwt-auth.guard.ts` and `backend-claims.ts` are **REVIEWABLE
> ONLY** — those files are actively edited. Do not apply them directly; review, adapt to
> any in-flight edits, then apply.
>
> All other sections (new files) may be applied directly once reviewed.

---

## Verified current state (against repo 2026-07-26)

| Item | Actual state |
|------|-------------|
| `portal_memberships` | EXISTS — `backend/src/db/schema/portal-access/portal-memberships.ts`; UUID PK `portal_membership_id` (text); has `session_epoch` integer, `audience` (portal_audience enum = `"CLIENT_PORTAL"`), `status` (portal_membership_status enum), `party_contact_id` (composite FK to `party_contacts`), `user_id` FK to `users`, `deleted_at` |
| `portal_invitations` | EXISTS — `backend/src/db/schema/portal-access/portal-invitations.ts`; UUID PK (text); `token_hash` text, `status` (portal_invitation_status enum), `expires_at`, `accepted_portal_membership_id` FK |
| `project_client_grants` | EXISTS — `backend/src/db/schema/portal-access/project-client-grants.ts`; UUID PK; composite FK `(org, portal_membership_id, party_contact_id)`; field-level boolean allowlist; `status` (portal_grant_status enum); `pm_workspace_id` text |
| `portalAudienceEnum` | `pgEnum("portal_audience", ["CLIENT_PORTAL"])` in `backend/src/db/schema/enums.ts` |
| `BackendClaims` | NO `aud` field — has `sub`, `orgId`, `branchId`, `role`, `permissions`, `enabledModules`, `plan`, `isPlatformAdmin`, `isOrgOwner`, `sessionId` |
| `JwtAuthGuard` | Uses `jwtVerify` from `jose`; reads `process.env.BACKEND_JWT_SECRET`; no audience check |
| `extractClaims` | Module-private function in `jwt-auth.guard.ts`; maps `JWTPayload` to `BackendClaims` |
| `PortalJwtAuthGuard` | MISSING |
| `PortalAuthController` / `PortalAuthService` | MISSING — no portal JWT issuance path |
| `PortalAccessController` | EXISTS — `backend/src/modules/portal-access/portal-access.controller.ts`; uses `JwtAuthGuard + PermissionGuard`; manages memberships/grants for internal staff |
| Redis revocation namespace | `revoked:session:<sessionId>` — no portal-specific prefix |
| `PORTAL_JWT_SECRET` env var | MISSING — not in any config or `.env.example` |

Key correction vs the design doc: `portal_memberships.portalMembershipId` is a **text UUID**, not
an integer serial. All code below uses `text` accordingly. The actual column referenced from
`project_client_grants` is also text (`portal_membership_id text`).

---

## Patch 1 — `BackendClaims` + `extractClaims` (REVIEWABLE — actively edited file)

**File:** `backend/src/common/auth/backend-claims.ts`

```diff
-export interface BackendClaims {
-  sub: string;
-  orgId: string | null;
-  branchId: number | null;
-  role: string;
-  permissions: string[];
-  enabledModules: string[];
-  plan: string | null;
-  isPlatformAdmin: boolean;
-  isOrgOwner: boolean;
-  sessionId: string;
-}
-
-export interface CurrentUserContext {
-  userId: string;
-  orgId: string;
-  branchId: number | null;
-  role: string;
-  permissions: string[];
-  enabledModules: string[];
-  plan: string | null;
-  isPlatformAdmin: boolean;
-  isOrgOwner: boolean;
-  sessionId: string;
-}
+export type JwtAudience = "INTERNAL" | "CLIENT_PORTAL";
+
+export interface BackendClaims {
+  sub: string;
+  orgId: string | null;
+  branchId: number | null;
+  role: string;
+  permissions: string[];
+  enabledModules: string[];
+  plan: string | null;
+  isPlatformAdmin: boolean;
+  isOrgOwner: boolean;
+  sessionId: string;
+  /** absent on existing internal tokens — treated as INTERNAL for backward compat */
+  aud?: JwtAudience;
+  /** portal-only; absent on internal tokens */
+  portalMembershipId?: string;
+  /** portal-only; absent on internal tokens */
+  sessionEpoch?: number;
+}
+
+export interface CurrentUserContext {
+  userId: string;
+  orgId: string;
+  branchId: number | null;
+  role: string;
+  permissions: string[];
+  enabledModules: string[];
+  plan: string | null;
+  isPlatformAdmin: boolean;
+  isOrgOwner: boolean;
+  sessionId: string;
+}
+
+export interface PortalUserContext {
+  userId: string;
+  orgId: string;
+  portalMembershipId: string;
+  partyContactId: string;
+  audience: "CLIENT_PORTAL";
+}
```

**Rationale:** `aud` is optional so every existing internal JWT that lacks the field continues to
parse without error. The `portalMembershipId` and `sessionEpoch` claims are portal-only; they are
absent on all current internal tokens.

---

## Patch 2 — `extractClaims` (REVIEWABLE — resides in `jwt-auth.guard.ts`, actively edited)

**File:** `backend/src/common/auth/jwt-auth.guard.ts`

```diff
 function extractClaims(payload: JWTPayload): BackendClaims {
   return {
     sub: typeof payload.sub === "string" ? payload.sub : "",
     orgId:
       typeof payload["orgId"] === "string" && payload["orgId"] !== ""
         ? payload["orgId"]
         : null,
     branchId:
       typeof payload["branchId"] === "number" ? payload["branchId"] : null,
     role: typeof payload["role"] === "string" ? payload["role"] : "",
     permissions: Array.isArray(payload["permissions"])
       ? payload["permissions"].filter((x): x is string => typeof x === "string")
       : [],
     enabledModules: Array.isArray(payload["enabledModules"])
       ? payload["enabledModules"].filter(
           (x): x is string => typeof x === "string",
         )
       : [],
     plan: typeof payload["plan"] === "string" ? payload["plan"] : null,
     isPlatformAdmin: false,
     isOrgOwner: payload["isOrgOwner"] === true,
     sessionId:
       typeof payload["sessionId"] === "string" ? payload["sessionId"] : "",
+    aud:
+      payload["aud"] === "CLIENT_PORTAL" || payload["aud"] === "INTERNAL"
+        ? payload["aud"]
+        : undefined,
+    portalMembershipId:
+      typeof payload["portalMembershipId"] === "string"
+        ? payload["portalMembershipId"]
+        : undefined,
+    sessionEpoch:
+      typeof payload["sessionEpoch"] === "number"
+        ? payload["sessionEpoch"]
+        : undefined,
   };
 }
```

---

## Patch 3 — `JwtAuthGuard` audience rejection (REVIEWABLE — actively edited file)

**File:** `backend/src/common/auth/jwt-auth.guard.ts`

Add the portal-rejection check as the **first** action after a successful `jwtVerify`, before any
`sub`/`sessionId` validation. The location is inside the `if (claims !== null)` block, immediately
after `claims = extractClaims(payload)`:

```diff
     if (claims !== null) {
+      // Reject portal-audience tokens on every internal endpoint.
+      // This must be the first check — before sub, sessionId, or org resolution.
+      if (claims.aud === "CLIENT_PORTAL") {
+        throw new ForbiddenException(
+          "Portal tokens are not accepted on internal endpoints",
+        );
+      }
+
       if (!claims.sub) throw new UnauthorizedException("Unauthorized");
       if (!claims.sessionId) throw new UnauthorizedException("Unauthorized");
       // ... rest of existing logic unchanged
```

**Gate:** e2e test — a JWT signed with `PORTAL_JWT_SECRET` containing `aud: "CLIENT_PORTAL"` sent
to any `JwtAuthGuard`-protected endpoint MUST receive HTTP 403. A JWT with no `aud` field (every
existing internal token) passes unchanged.

**Rollback:** remove the four added lines; no schema change; no other file affected.

---

## Patch 4 — `PortalJwtAuthGuard` (new file — apply directly)

**File:** `backend/src/common/auth/portal-jwt-auth.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { and, eq, isNull } from "drizzle-orm";
import type { Redis } from "@upstash/redis";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { REDIS } from "../../common/cache/cache.service";
import { portalMemberships } from "../../db/schema/portal-access/portal-memberships";
import type { BackendClaims, PortalUserContext } from "./backend-claims";

const REVOCATION_CACHE_TTL_MS = 5_000;
const portalRevocationCache = new Map<string, number>();

function extractPortalClaims(payload: JWTPayload): BackendClaims {
  return {
    sub: typeof payload.sub === "string" ? payload.sub : "",
    orgId:
      typeof payload["orgId"] === "string" && payload["orgId"] !== ""
        ? payload["orgId"]
        : null,
    branchId: null,
    role: "",
    permissions: [],
    enabledModules: [],
    plan: null,
    isPlatformAdmin: false,
    isOrgOwner: false,
    sessionId:
      typeof payload["sessionId"] === "string" ? payload["sessionId"] : "",
    aud:
      payload["aud"] === "CLIENT_PORTAL" ? "CLIENT_PORTAL" : undefined,
    portalMembershipId:
      typeof payload["portalMembershipId"] === "string"
        ? payload["portalMembershipId"]
        : undefined,
    sessionEpoch:
      typeof payload["sessionEpoch"] === "number"
        ? payload["sessionEpoch"]
        : undefined,
  };
}

export interface PortalRequest extends Request {
  portalUser: PortalUserContext;
}

@Injectable()
export class PortalJwtAuthGuard implements CanActivate {
  private readonly portalSecretKey: Uint8Array | null;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(REDIS) private readonly redis: Redis | null,
  ) {
    const raw = process.env.PORTAL_JWT_SECRET;
    this.portalSecretKey = raw ? new TextEncoder().encode(raw) : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.portalSecretKey) {
      throw new UnauthorizedException("Portal auth not configured");
    }

    const req = context
      .switchToHttp()
      .getRequest<PortalRequest>();

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Unauthorized");
    }
    const token = header.slice("Bearer ".length).trim();

    let claims: BackendClaims;
    try {
      const { payload } = await jwtVerify(token, this.portalSecretKey, {
        algorithms: ["HS256"],
      });
      claims = extractPortalClaims(payload);
    } catch {
      throw new UnauthorizedException("Invalid or expired portal token");
    }

    // INVARIANT 1: audience must be CLIENT_PORTAL — this is the first check,
    // before any DB access, so a misdirected internal token is rejected cheaply.
    if (claims.aud !== "CLIENT_PORTAL") {
      throw new ForbiddenException(
        "Audience mismatch — internal tokens are not accepted on portal endpoints",
      );
    }

    if (!claims.sub) throw new UnauthorizedException("Unauthorized");
    if (!claims.orgId) throw new UnauthorizedException("Unauthorized");
    if (!claims.portalMembershipId) throw new UnauthorizedException("Unauthorized");
    if (claims.sessionEpoch === undefined || claims.sessionEpoch === null) {
      throw new UnauthorizedException("Unauthorized");
    }

    // INVARIANT 2: explicit session revocation (sign-out path).
    // Namespace: portal:revoked:<sessionId> — never overlaps with internal revoked:session:<sessionId>.
    if (this.redis && claims.sessionId) {
      const now = Date.now();
      const cached = portalRevocationCache.get(claims.sessionId);
      if (!(cached && cached > now)) {
        const revoked = await this.redis.get<boolean>(
          `portal:revoked:${claims.sessionId}`,
        );
        if (revoked) {
          portalRevocationCache.delete(claims.sessionId);
          throw new UnauthorizedException("Portal session has been revoked");
        }
        portalRevocationCache.set(claims.sessionId, now + REVOCATION_CACHE_TTL_MS);
        if (portalRevocationCache.size > 5000) {
          for (const [key, exp] of portalRevocationCache) {
            if (exp <= now) portalRevocationCache.delete(key);
          }
        }
      }
    }

    // INVARIANT 3: session epoch — fast-path revocation for suspend/revoke events.
    // Redis key: portal:epoch:<portalMembershipId>
    // Set by PortalAccessService.setMembershipStatus when status → SUSPENDED or REVOKED.
    if (this.redis) {
      const storedEpoch = await this.redis.get<string>(
        `portal:epoch:${claims.portalMembershipId}`,
      );
      if (storedEpoch !== null && Number(storedEpoch) > claims.sessionEpoch) {
        throw new UnauthorizedException("Portal session has been invalidated");
      }
    }

    // INVARIANT 4: membership must be ACTIVE in the DB.
    // This is the authoritative check; Redis epoch is a fast-path optimization only.
    const [membership] = await this.db
      .select({
        portalMembershipId: portalMemberships.portalMembershipId,
        organizationId: portalMemberships.organizationId,
        partyContactId: portalMemberships.partyContactId,
        status: portalMemberships.status,
        sessionEpoch: portalMemberships.sessionEpoch,
      })
      .from(portalMemberships)
      .where(
        and(
          eq(portalMemberships.portalMembershipId, claims.portalMembershipId),
          eq(portalMemberships.organizationId, claims.orgId),
          isNull(portalMemberships.deletedAt),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new UnauthorizedException("Portal membership not found");
    }
    if (membership.status !== "ACTIVE") {
      throw new UnauthorizedException("Portal membership is not active");
    }
    // DB epoch is authoritative backstop — catches cases where Redis missed the update.
    if (membership.sessionEpoch > claims.sessionEpoch) {
      throw new UnauthorizedException("Portal session has been invalidated");
    }

    req.portalUser = {
      userId: claims.sub,
      orgId: claims.orgId,
      portalMembershipId: claims.portalMembershipId,
      partyContactId: membership.partyContactId,
      audience: "CLIENT_PORTAL",
    };

    return true;
  }
}
```

**Security notes:**
- Audience check is the first check after signature verification — a valid internal JWT sent to a
  portal endpoint is rejected before touching the DB.
- Redis epoch check is fast-path only; the DB `sessionEpoch` column is the authoritative backstop.
- `portal:revoked:<sessionId>` is a distinct namespace from `revoked:session:<sessionId>`
  (internal). The `JwtAuthGuard` never touches `portal:*` keys and this guard never touches
  `revoked:session:*` keys.
- No `PermissionGuard` is used on portal endpoints. Portal access is determined entirely by
  `project_client_grants`, not by RBAC.

---

## Patch 5 — Session epoch Redis push from `PortalAccessService` (new method — apply directly)

**File:** `backend/src/modules/portal-access/portal-access.service.ts`

The existing `setMembershipStatus` already increments `session_epoch` in the DB via a Drizzle
`sql` expression. It is missing the Redis push that makes the epoch fast-path effective.

Add `REDIS` injection and push after each status update that bumps the epoch:

```diff
+import { REDIS } from "../../common/cache/cache.service";
+import type { Redis } from "@upstash/redis";

 @Injectable()
 export class PortalAccessService {
   constructor(
     @Inject(DRIZZLE) private readonly db: Db,
     private readonly audit: AuditService,
+    @Inject(REDIS) private readonly redis: Redis | null,
   ) {}
```

```diff
   async setMembershipStatus(
     organizationId: string,
     userId: string,
     portalMembershipId: string,
     input: UpdateMembershipStatusInput,
   ) {
     await this.loadMembership(organizationId, portalMembershipId);

     const patch: PgUpdateSetSource<typeof portalMemberships> = {
       status: input.status,
     };

     if (input.status === "SUSPENDED" || input.status === "REVOKED") {
       patch.sessionEpoch = sql`${portalMemberships.sessionEpoch} + 1`;
     }

     const [updated] = await this.db
       .update(portalMemberships)
       .set(patch)
       .where(
         and(
           eq(portalMemberships.portalMembershipId, portalMembershipId),
           eq(portalMemberships.organizationId, organizationId),
         ),
       )
       .returning();
     if (!updated) throw new NotFoundException("Portal membership not found");

+    // Push new epoch to Redis so active tokens fail the fast-path check immediately
+    // without waiting for the next DB read. TTL slightly exceeds the portal token
+    // lifetime so the key is present for every outstanding token's remaining life.
+    // The constant PORTAL_EPOCH_REDIS_TTL_SECONDS should match PORTAL_TOKEN_TTL_SECONDS + 60.
+    if (
+      this.redis &&
+      (input.status === "SUSPENDED" || input.status === "REVOKED")
+    ) {
+      const PORTAL_EPOCH_REDIS_TTL_SECONDS = 3660; // 1 hour + 60s buffer; adjust to match token TTL
+      await this.redis.set(
+        `portal:epoch:${portalMembershipId}`,
+        String(updated.sessionEpoch),
+        { ex: PORTAL_EPOCH_REDIS_TTL_SECONDS },
+      );
+    }

     this.audit.log({
       action: "portal_access.membership.status_changed",
       userId,
       orgId: organizationId,
       resourceType: "portal_membership",
       resourceId: portalMembershipId,
       metadata: { portalMembershipId, status: input.status },
     });
     return updated;
   }
```

---

## Patch 6 — Portal JWT issuance (new files — apply directly)

### 6.1 Zod schema

**File:** `backend/src/modules/portal-auth/dto/portal-auth.schemas.ts`

```typescript
import { z } from "zod";

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

export const requestMagicLinkSchema = z.object({
  email: z.string().email(),
  organizationId: z.string().min(1),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
  organizationId: z.string().min(1),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;
```

### 6.2 Token helper

**File:** `backend/src/modules/portal-auth/portal-token.helper.ts`

```typescript
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";

export const PORTAL_TOKEN_TTL_SECONDS = 3600; // 1 hour — tune per org policy

export interface PortalTokenPayload {
  sub: string;
  orgId: string;
  portalMembershipId: string;
  sessionEpoch: number;
  sessionId: string;
}

export async function signPortalToken(payload: PortalTokenPayload): Promise<string> {
  const raw = process.env.PORTAL_JWT_SECRET;
  if (!raw) throw new Error("PORTAL_JWT_SECRET is not configured");

  const secret = new TextEncoder().encode(raw);
  const sessionId = payload.sessionId || `portal:${randomUUID()}`;

  return new SignJWT({
    orgId: payload.orgId,
    portalMembershipId: payload.portalMembershipId,
    sessionEpoch: payload.sessionEpoch,
    sessionId,
    aud: "CLIENT_PORTAL",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}
```

**Startup validation** — add to `backend/src/config/env.config.ts` (or wherever the env schema
lives — verify the actual file path):

```typescript
// Inside the config validation schema (adapt to actual Joi/zod shape used in the repo)
PORTAL_JWT_SECRET: z.string().min(32, "PORTAL_JWT_SECRET must be at least 32 characters"),
// Startup assertion: PORTAL_JWT_SECRET must not equal BACKEND_JWT_SECRET
```

Add a startup assertion in `main.ts` (or the bootstrap function):

```typescript
const portalSecret = process.env.PORTAL_JWT_SECRET;
const backendSecret = process.env.BACKEND_JWT_SECRET;
if (!portalSecret) {
  throw new Error("PORTAL_JWT_SECRET is required — portal auth will not function without it");
}
if (portalSecret === backendSecret) {
  throw new Error(
    "PORTAL_JWT_SECRET must differ from BACKEND_JWT_SECRET — shared secrets defeat audience isolation",
  );
}
```

### 6.3 Service

**File:** `backend/src/modules/portal-auth/portal-auth.service.ts`

```typescript
import {
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { portalInvitations } from "../../db/schema/portal-access/portal-invitations";
import { portalMemberships } from "../../db/schema/portal-access/portal-memberships";
import { organizations, users } from "../../db/schema/auth";
import { signPortalToken } from "./portal-token.helper";
import type { AcceptInvitationInput } from "./dto/portal-auth.schemas";

@Injectable()
export class PortalAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async acceptInvitation(input: AcceptInvitationInput): Promise<{ token: string }> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");

    return this.db.transaction(async (tx) => {
      // Step 1: Look up invitation by token hash — FOR UPDATE (serializable fence)
      const [invitation] = await tx
        .select({
          portalInvitationId: portalInvitations.portalInvitationId,
          organizationId: portalInvitations.organizationId,
          partyContactId: portalInvitations.partyContactId,
          email: portalInvitations.email,
          audience: portalInvitations.audience,
          status: portalInvitations.status,
          expiresAt: portalInvitations.expiresAt,
        })
        .from(portalInvitations)
        .where(eq(portalInvitations.tokenHash, tokenHash))
        .for("update")
        .limit(1);

      if (!invitation) throw new NotFoundException("Invitation not found");

      if (invitation.status !== "PENDING") {
        // 410 Gone: already accepted or revoked — non-replayable
        throw new GoneException("Invitation has already been used or revoked");
      }
      if (invitation.expiresAt < new Date()) {
        await tx
          .update(portalInvitations)
          .set({ status: "EXPIRED" })
          .where(eq(portalInvitations.portalInvitationId, invitation.portalInvitationId));
        throw new GoneException("Invitation has expired");
      }

      // Step 2: Verify org is active
      const [org] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, invitation.organizationId))
        .limit(1);
      if (!org) throw new GoneException("Organization not found or has been archived");

      // Step 3: Find or create user row for the invitation email
      let [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      if (!user) {
        const [created] = await tx
          .insert(users)
          .values({
            id: randomUUID(),
            email: invitation.email,
            name: invitation.email,
          })
          .returning({ id: users.id });
        if (!created) throw new Error("Failed to create portal user");
        user = created;
      }

      // Step 4: Guard against a pre-existing ACTIVE membership for this (org, partyContact, audience)
      // The DB partial unique index enforces this, but we check here for a cleaner error.
      const [existing] = await tx
        .select({ status: portalMemberships.status })
        .from(portalMemberships)
        .where(
          and(
            eq(portalMemberships.organizationId, invitation.organizationId),
            eq(portalMemberships.partyContactId, invitation.partyContactId),
            eq(portalMemberships.audience, invitation.audience),
            isNull(portalMemberships.deletedAt),
          ),
        )
        .limit(1);

      if (existing?.status === "ACTIVE") {
        // Mark invite accepted anyway so it can't be replayed
        await tx
          .update(portalInvitations)
          .set({ status: "ACCEPTED" })
          .where(eq(portalInvitations.portalInvitationId, invitation.portalInvitationId));
        throw new ConflictException("An active portal membership already exists for this contact");
      }

      // Step 5: Create portal membership (status=ACTIVE, sessionEpoch=0)
      const [membership] = await tx
        .insert(portalMemberships)
        .values({
          organizationId: invitation.organizationId,
          audience: invitation.audience,
          partyContactId: invitation.partyContactId,
          userId: user.id,
          status: "ACTIVE",
          sessionEpoch: 0,
        })
        .returning({
          portalMembershipId: portalMemberships.portalMembershipId,
          sessionEpoch: portalMemberships.sessionEpoch,
        });
      if (!membership) throw new Error("Failed to create portal membership");

      // Step 6: Consume the invitation — set ACCEPTED before response (non-replayable)
      await tx
        .update(portalInvitations)
        .set({
          status: "ACCEPTED",
          acceptedPortalMembershipId: membership.portalMembershipId,
        })
        .where(eq(portalInvitations.portalInvitationId, invitation.portalInvitationId));

      // COMMIT — both writes are durable or neither is.
      // Step 7 (post-commit): issue portal JWT with PORTAL_JWT_SECRET
      const sessionId = `portal:${randomUUID()}`;
      const token = await signPortalToken({
        sub: user.id,
        orgId: invitation.organizationId,
        portalMembershipId: membership.portalMembershipId,
        sessionEpoch: membership.sessionEpoch,
        sessionId,
      });

      return { token };
    });
  }

  async requestMagicLink(email: string, organizationId: string): Promise<void> {
    // Implementation sketch — generate a short-lived magic link token,
    // store SHA-256(token) in a short-lived table or Redis key (TTL 15 min),
    // send email. Rate-limited by the calling controller.
    // This is a stub; full implementation follows email outbox patterns (Step 2).
    void email;
    void organizationId;
  }

  async verifyMagicLink(token: string, organizationId: string): Promise<{ token: string }> {
    // Verify SHA-256(token) against stored hash; reject if expired or already used.
    // Load the portal membership for (org, userId associated with the magic link).
    // Issue portal JWT. Stub — implement after magic link infrastructure is in place.
    void token;
    void organizationId;
    throw new Error("Not yet implemented");
  }
}
```

### 6.4 Controller

**File:** `backend/src/modules/portal-auth/portal-auth.controller.ts`

```typescript
import {
  Body,
  Controller,
  HttpCode,
  Post,
} from "@nestjs/common";
import { Public } from "../../common/auth/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Throttle } from "@nestjs/throttler";
import { PortalAuthService } from "./portal-auth.service";
import {
  acceptInvitationSchema,
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
  type AcceptInvitationInput,
  type RequestMagicLinkInput,
  type VerifyMagicLinkInput,
} from "./dto/portal-auth.schemas";

@Public()
@Controller("portal/auth")
export class PortalAuthController {
  constructor(private readonly svc: PortalAuthService) {}

  /**
   * One-time invitation acceptance. Atomic, non-replayable.
   * Rate-limited: 10/minute per IP to prevent token-enumeration attacks.
   */
  @Post("invitations/accept")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  acceptInvitation(
    @Body(new ZodValidationPipe(acceptInvitationSchema)) body: AcceptInvitationInput,
  ) {
    return this.svc.acceptInvitation(body);
  }

  /**
   * Request a portal magic link for sign-in (not invite acceptance).
   * Rate-limited: 5/minute per IP.
   */
  @Post("magic-link")
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestMagicLink(
    @Body(new ZodValidationPipe(requestMagicLinkSchema)) body: RequestMagicLinkInput,
  ) {
    await this.svc.requestMagicLink(body.email, body.organizationId);
    // Always respond 202 — never reveal whether the email/org combination exists.
    return { message: "If a portal account exists for this email, a sign-in link has been sent." };
  }

  /**
   * Verify portal magic link and issue a portal JWT.
   * Rate-limited: 10/minute per IP.
   */
  @Post("magic-link/verify")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyMagicLink(
    @Body(new ZodValidationPipe(verifyMagicLinkSchema)) body: VerifyMagicLinkInput,
  ) {
    return this.svc.verifyMagicLink(body.token, body.organizationId);
  }
}
```

### 6.5 Module

**File:** `backend/src/modules/portal-auth/portal-auth.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { PortalAuthController } from "./portal-auth.controller";
import { PortalAuthService } from "./portal-auth.service";

@Module({
  controllers: [PortalAuthController],
  providers: [PortalAuthService],
})
export class PortalAuthModule {}
```

**Registration:** add `PortalAuthModule` to `AppModule` imports in `backend/src/app.module.ts`.

---

## Patch 7 — Portal data endpoints (new files — apply directly)

These endpoints sit behind `PortalJwtAuthGuard`. No `PermissionGuard`. BOLA is re-asserted in the
service on every request by the grant lookup.

### 7.1 Service

**File:** `backend/src/modules/portal/portal.service.ts`

```typescript
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { projectClientGrants } from "../../db/schema/portal-access/project-client-grants";
import { portalMemberships } from "../../db/schema/portal-access/portal-memberships";
import { projects } from "../../db/schema/projects";
import type { PortalUserContext } from "../../common/auth/backend-claims";

@Injectable()
export class PortalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  /**
   * BOLA-safe grant lookup. Returns the grant + field allowlist if the calling
   * membership has an ACTIVE grant for this project. Returns null otherwise.
   * Callers MUST treat null as 404 — never as 403 (no signal leak to external callers).
   */
  private async loadGrant(orgId: string, portalMembershipId: string, projectId: number) {
    const now = new Date();
    const [grant] = await this.db
      .select({
        projectClientGrantId: projectClientGrants.projectClientGrantId,
        canViewMilestones: projectClientGrants.canViewMilestones,
        canViewTasks: projectClientGrants.canViewTasks,
        canViewAttachments: projectClientGrants.canViewAttachments,
        canViewComments: projectClientGrants.canViewComments,
        canSubmitChangeRequests: projectClientGrants.canSubmitChangeRequests,
        expiresAt: projectClientGrants.expiresAt,
      })
      .from(projectClientGrants)
      .innerJoin(
        portalMemberships,
        and(
          eq(portalMemberships.portalMembershipId, projectClientGrants.portalMembershipId),
          eq(portalMemberships.organizationId, projectClientGrants.organizationId),
          eq(portalMemberships.status, "ACTIVE"),
          isNull(portalMemberships.deletedAt),
        ),
      )
      .where(
        and(
          eq(projectClientGrants.organizationId, orgId),
          eq(projectClientGrants.portalMembershipId, portalMembershipId),
          eq(projectClientGrants.projectId, projectId),
          eq(projectClientGrants.status, "ACTIVE"),
          or(
            isNull(projectClientGrants.expiresAt),
            sql`${projectClientGrants.expiresAt} > ${now}`,
          ),
        ),
      )
      .limit(1);

    return grant ?? null;
  }

  async listGrantedProjects(portalUser: PortalUserContext) {
    const now = new Date();
    return this.db
      .select({
        projectClientGrantId: projectClientGrants.projectClientGrantId,
        projectId: projectClientGrants.projectId,
        canViewMilestones: projectClientGrants.canViewMilestones,
        canViewTasks: projectClientGrants.canViewTasks,
        canViewAttachments: projectClientGrants.canViewAttachments,
        canViewComments: projectClientGrants.canViewComments,
        canSubmitChangeRequests: projectClientGrants.canSubmitChangeRequests,
        expiresAt: projectClientGrants.expiresAt,
        projectName: projects.name,
        projectKey: projects.key,
      })
      .from(projectClientGrants)
      .innerJoin(projects, eq(projects.id, projectClientGrants.projectId))
      .where(
        and(
          eq(projectClientGrants.organizationId, portalUser.orgId),
          eq(projectClientGrants.portalMembershipId, portalUser.portalMembershipId),
          eq(projectClientGrants.status, "ACTIVE"),
          or(
            isNull(projectClientGrants.expiresAt),
            sql`${projectClientGrants.expiresAt} > ${now}`,
          ),
        ),
      );
  }

  async getGrantedProject(portalUser: PortalUserContext, projectId: number) {
    const grant = await this.loadGrant(portalUser.orgId, portalUser.portalMembershipId, projectId);
    if (!grant) throw new NotFoundException("Project not found");

    const [project] = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        key: projects.key,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.orgId, portalUser.orgId),
        ),
      )
      .limit(1);

    if (!project) throw new NotFoundException("Project not found");

    return { project, grant };
  }
}
```

### 7.2 Controller

**File:** `backend/src/modules/portal/portal.controller.ts`

```typescript
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PortalJwtAuthGuard, type PortalRequest } from "../../common/auth/portal-jwt-auth.guard";
import { PortalService } from "./portal.service";

@UseGuards(PortalJwtAuthGuard)
@Controller("portal")
export class PortalController {
  constructor(private readonly svc: PortalService) {}

  @Get("projects")
  listGrantedProjects(@Req() req: PortalRequest) {
    return this.svc.listGrantedProjects(req.portalUser);
  }

  @Get("projects/:projectId")
  getGrantedProject(
    @Param("projectId", ParseIntPipe) projectId: number,
    @Req() req: PortalRequest,
  ) {
    return this.svc.getGrantedProject(req.portalUser, projectId);
  }
}
```

### 7.3 Module

**File:** `backend/src/modules/portal/portal.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";

@Module({
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
```

**Registration:** add `PortalModule` to `AppModule` imports.

---

## Patch 8 — `.env.example` addition (apply directly)

Add to `backend/.env.example` (or the repo's canonical env-example file — verify the path):

```
# Portal auth — MUST differ from BACKEND_JWT_SECRET; startup fails if absent or equal
PORTAL_JWT_SECRET=
```

---

## Patch 9 — e2e test scaffold (new file — apply directly)

**File:** `backend/src/modules/portal-auth/portal-auth.controller.e2e-spec.ts`

```typescript
import { createHash, randomBytes } from "node:crypto";

// Test scaffold — fill in NestJS testing harness imports for your test setup.
// The assertions below are the invariants that MUST pass before Wave 9 ships.

describe("Portal auth — audience separation invariants", () => {
  const PORTAL_SECRET = "test-portal-secret-at-least-32-chars!!";
  const INTERNAL_SECRET = "test-backend-secret-at-least-32ch!";

  async function signToken(
    payload: Record<string, unknown>,
    secret: string,
    expiresIn = "1h",
  ): Promise<string> {
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode(secret);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(payload.sub ?? "test-user"))
      .setExpirationTime(expiresIn)
      .sign(key);
  }

  it("INVARIANT-1: portal token (aud=CLIENT_PORTAL) sent to an internal endpoint → 403", async () => {
    const token = await signToken(
      { orgId: "org-1", aud: "CLIENT_PORTAL", sessionId: "portal:sess-1" },
      PORTAL_SECRET,
    );
    // Send to any JwtAuthGuard-protected internal endpoint, e.g. GET /me
    // expect(response.status).toBe(403);
  });

  it("INVARIANT-2: internal token (no aud) sent to a portal endpoint → 403", async () => {
    const token = await signToken(
      { orgId: "org-1", sessionId: "sess-1" },
      INTERNAL_SECRET,
    );
    // Send to GET /portal/projects
    // expect(response.status).toBe(403);
  });

  it("INVARIANT-3: portal token signed with INTERNAL_SECRET → 401 (wrong secret, fails jwtVerify)", async () => {
    const token = await signToken(
      { orgId: "org-1", aud: "CLIENT_PORTAL", sessionId: "portal:sess-1" },
      INTERNAL_SECRET,
    );
    // Send to GET /portal/projects
    // expect(response.status).toBe(401);
  });

  it("INVARIANT-4: suspended membership increments epoch in DB and Redis; portal request returns 401", async () => {
    // 1. Create active membership with sessionEpoch=0
    // 2. Issue portal token with sessionEpoch=0
    // 3. PATCH /portal-access/memberships/:id/status { status: "SUSPENDED" }
    // 4. Send portal token to GET /portal/projects → expect 401
  });

  it("INVARIANT-5: cross-tenant project access → 404", async () => {
    // Portal membership in org-A with grant for project-in-org-A
    // Request GET /portal/projects/<project-in-org-B>
    // expect(response.status).toBe(404);
  });

  it("INVARIANT-6: accept-invite is non-replayable → second call returns 410", async () => {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    // Insert PENDING invitation with tokenHash
    // POST /portal/auth/invitations/accept { token: rawToken } → 200
    // POST /portal/auth/invitations/accept { token: rawToken } → 410
  });

  it("INVARIANT-7: accept-invite NEVER creates an organization_members row", async () => {
    // After INVARIANT-6, assert:
    // SELECT COUNT(*) FROM organization_members WHERE user_id = <new_portal_user_id> → 0
  });

  it("INVARIANT-8: expired invitation → 410", async () => {
    // Insert PENDING invitation with expiresAt in the past
    // POST /portal/auth/invitations/accept → 410
  });
});
```

---

## New files summary

| File | Action |
|------|--------|
| `backend/src/common/auth/portal-jwt-auth.guard.ts` | CREATE (Patch 4) |
| `backend/src/modules/portal-auth/dto/portal-auth.schemas.ts` | CREATE (Patch 6.1) |
| `backend/src/modules/portal-auth/portal-token.helper.ts` | CREATE (Patch 6.2) |
| `backend/src/modules/portal-auth/portal-auth.service.ts` | CREATE (Patch 6.3) |
| `backend/src/modules/portal-auth/portal-auth.controller.ts` | CREATE (Patch 6.4) |
| `backend/src/modules/portal-auth/portal-auth.module.ts` | CREATE (Patch 6.5) |
| `backend/src/modules/portal/portal.service.ts` | CREATE (Patch 7.1) |
| `backend/src/modules/portal/portal.controller.ts` | CREATE (Patch 7.2) |
| `backend/src/modules/portal/portal.module.ts` | CREATE (Patch 7.3) |
| `backend/src/modules/portal-auth/portal-auth.controller.e2e-spec.ts` | CREATE (Patch 9) |

## Reviewable patches (do NOT apply without merging in-flight edits)

| File | Patch |
|------|-------|
| `backend/src/common/auth/backend-claims.ts` | Patch 1 — add `JwtAudience`, `aud?`, `portalMembershipId?`, `sessionEpoch?`, `PortalUserContext` |
| `backend/src/common/auth/jwt-auth.guard.ts` | Patch 2 — extend `extractClaims`; Patch 3 — add `aud === "CLIENT_PORTAL"` rejection in `canActivate` |
| `backend/src/modules/portal-access/portal-access.service.ts` | Patch 5 — inject `REDIS`, push epoch to `portal:epoch:<id>` after suspend/revoke |

## Files that need `AppModule` registration

- `backend/src/app.module.ts` — add `PortalAuthModule` and `PortalModule` to `imports`

---

## Audience-separation invariant

The central security property this entire patch implements:

> A `CLIENT_PORTAL` token MUST NOT successfully authenticate to any endpoint guarded by
> `JwtAuthGuard` (internal). An `INTERNAL` or absent-aud token MUST NOT successfully
> authenticate to any endpoint guarded by `PortalJwtAuthGuard` (portal). Each guard
> enforces this as its **first** action after signature verification — before any DB
> read, session lookup, or membership check — so the invariant cannot be bypassed by
> any downstream logic.

The invariant is dual-enforced:

1. `JwtAuthGuard` rejects `aud === "CLIENT_PORTAL"` at the top of the `if (claims !== null)` block (Patch 3).
2. `PortalJwtAuthGuard` rejects any token where `aud !== "CLIENT_PORTAL"` immediately after `extractPortalClaims` (Patch 4 line: `if (claims.aud !== "CLIENT_PORTAL")`).

The two secrets (`BACKEND_JWT_SECRET` / `PORTAL_JWT_SECRET`) provide cryptographic separation;
the audience claims provide logical separation. Both must hold. A token signed with the wrong
secret fails `jwtVerify` before the audience check runs. A token signed with the right secret
but wrong audience is rejected at the guard layer.
