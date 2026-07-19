# Production API domain (`api.streamlineos.in`)

Browsers must call the Nest API on the first-party hostname **`https://api.streamlineos.in`**, not `*.up.railway.app`. Some mobile carriers fail to reach Railway’s shared `up.railway.app` hostname while Wi‑Fi works — that surfaces as a generic “Network error” on sign-in.

## Current state (verified 2026-07-19)

| Check | Result |
| --- | --- |
| DNS for `api.streamlineos.in` | Cloudflare A/AAAA (proxied) |
| `GET https://api.streamlineos.in/health` | `200` (Railway behind Cloudflare) |
| CORS preflight from `https://www.streamlineos.in` | `Access-Control-Allow-Origin: https://www.streamlineos.in` |
| Live Vercel bundle | Still embeds `https://streamlineos-backend-production.up.railway.app` until env redeploy |

No extra in-repo Cloudflare/Terraform config exists — DNS is managed in the Cloudflare dashboard for `streamlineos.in`.

## Ops checklist (do in order)

### 1. Cloudflare DNS (already present — confirm only)

1. Zone: `streamlineos.in`
2. Record: `api` → CNAME to the Railway-provided custom-domain target **or** the Railway service hostname (as shown in Railway → Settings → Networking → Custom Domain)
3. Proxy: orange-cloud (proxied) is fine for browsers
4. SSL/TLS: Full (strict) to Railway
5. **Bot Fight / Super Bot Fight / WAF challenges**: disable or skip for `api.streamlineos.in` so Vercel server-side fetches are not challenged. If challenges remain, set `API_INTERNAL_URL` on Vercel (step 3) to the direct Railway origin — do **not** put that Railway URL in `NEXT_PUBLIC_API_URL`

### 2. Railway custom domain

1. Railway project → backend service → **Settings → Networking → Custom Domain**
2. Add `api.streamlineos.in` and complete Railway’s DNS verification if prompted
3. Confirm `https://api.streamlineos.in/health` returns `200`

### 3. Vercel (frontend) env — then redeploy

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.streamlineos.in` |
| `API_INTERNAL_URL` | *(optional)* `https://streamlineos-backend-production.up.railway.app` only if Cloudflare blocks Vercel→API |
| `NEXTAUTH_URL` | `https://www.streamlineos.in` |

`NEXT_PUBLIC_*` is inlined at **build** time — change the env, then trigger a **new production deployment** (not only a runtime restart).

CSP `connect-src` already includes the origin from `NEXT_PUBLIC_API_URL` (middleware + `next.config`).

### 4. Railway (backend) env — no hostname change required for CORS

| Variable | Value |
| --- | --- |
| `CORS_ORIGINS` | `https://www.streamlineos.in,https://streamlineos.in` |
| `APP_URL` | `https://www.streamlineos.in` |

CORS allowlists the **web** origin, not the API hostname. Adding `api.streamlineos.in` as a custom domain does not require changing `CORS_ORIGINS` unless the web origin itself changes.

### 5. Agent / MCP clients

Update `STREAMLINEOS_API_URL` to `https://api.streamlineos.in` (see `docs/mcp-agent-access.md`).

## Verify on cellular

1. Phone on **mobile data** (Wi‑Fi off)
2. Open `https://www.streamlineos.in/signin` in a fresh browser tab / private mode
3. Complete sign-in — should succeed
4. Optional: phone browser DevTools / remote debug — API requests go to `api.streamlineos.in`, not `up.railway.app`
5. If it still fails, the toast/network message should name the host (`Network error contacting api.streamlineos.in…`) for confirmation

## Rollback

Set `NEXT_PUBLIC_API_URL` back to the Railway origin and redeploy. Prefer fixing Cloudflare/DNS instead — Railway-direct is the cellular failure mode.
