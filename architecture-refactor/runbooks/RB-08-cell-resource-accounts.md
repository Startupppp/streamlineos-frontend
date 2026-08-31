# RB-08 Cell Resource Account Provisioning

**Status: OPERATOR-BLOCKED**
The code is complete. Six resource accounts require operator action in external consoles
before any cell can be declared ISOLATED rather than NAMESPACED.

**Why NAMESPACED is not ISOLATED:** A NAMESPACED resource uses a key prefix or channel
prefix inside a shared instance. Any credential with access to the shared instance master
key can read across cell boundaries. Six accounts must be provisioned — one per cell — to
close this gap.

---

## The six resource accounts

| # | Resource | Current verdict | Credentialed service | Account to create |
|---|---|---|---|---|
| 1 | Cell database + compute | ISOLATED (DB) / SHARED (compute) | Neon | Separate Neon project per cell |
| 2 | Cache | NAMESPACED | Upstash | Separate Redis database per cell |
| 3 | Object storage | NAMESPACED | Cloudflare R2 | Dedicated R2 bucket + access key per cell |
| 4 | Search cluster | SHARED (nothing deployed) | TBD search provider | Per-cell search cluster |
| 5 | Realtime broker | NAMESPACED | Ably | Separate Ably application per cell |
| 6 | Worker deployment | NAMESPACED | Railway / Fly / Render (app host) | Separate worker process deployment per cell |

### Why each must be separate

**1 — Neon project (compute)**
The current `cell2` database shares the primary region's Neon compute endpoint. A long
query on the primary starves the cell and vice versa. The logical database is already
isolated (separate DB, its own RLS policies, separate migration journal count). What is
not isolated is the compute: CPU, memory, and connection-pool capacity are shared. A
separate Neon project assigns dedicated compute and connection quotas.

**2 — Upstash Redis**
`CacheService` selects which Redis client to call based on `REGION_CELL_2_UPSTASH_REDIS_REST_URL`.
When that env var is absent, both cells write to the same Upstash instance under different
key prefixes. Any credential that has access to the master REST token can read both cells'
cached sessions, permission snapshots, and AI context. A separate Upstash database
scopes the token to one cell.

**3 — Cloudflare R2**
File uploads from cell-2 orgs are stored under `cell-2/` prefix inside the shared bucket.
A Cloudflare R2 access key scoped to the shared bucket can list and download objects from
all cells. A dedicated R2 bucket with its own access key pair limits blast radius to one
cell if the key is compromised.

**4 — Search cluster**
`RegionDefinition.searchCluster` is a declared string with nothing behind it. No search
cluster is deployed. When deployed, a shared cluster would mix vectors from multiple cells
under a single API key. Per-cell clusters isolate both the data and the API credential.

**5 — Ably application**
Every realtime channel and token capability is cell-prefixed
(`cell:cell-2:org:<orgId>:*`). A token minted for cell-2 cannot subscribe to cell-1's
channels, so user-level isolation holds. But the Ably root API key that mints those tokens
is shared. If it is leaked, an attacker can mint tokens for any cell. A separate Ably
application per cell scopes the root key to one cell.

**6 — Worker deployment**
The BullMQ worker and cron jobs run in a single process. Cell-2's `forEachOrg` now queries
cell-2's database, and cron leases use `cron:lease:cell-2:<job>`. But the lease store is
the same Redis instance (account #2 above closes that). More importantly, a bug or resource
exhaustion in one cell's workers delays jobs in all cells. A separate deployment enforces
the process boundary that NAMESPACED configuration cannot.

---

## Ordered provisioning steps

Run these in order. Each verification command must exit 0 before proceeding.

### Step 1 — Neon project for cell-2

**Why now:** Everything else points at a database. Provision compute first.

1. Log in to [console.neon.tech](https://console.neon.tech).
2. Create a new project named `streamlineos-cell-2` in the target region.
3. From the project dashboard copy the connection string for the **owner role**
   (`neondb_owner`) and the **pooler** variant.
4. Set the application role password (must be done in the Neon console, not via
   `ALTER ROLE` — the control plane restores the previous one after a branch suspension):
   - Open the project's **Roles** page.
   - Create (or reset) the `streamline_app` role with a strong password.
   - Copy the resulting connection string for `streamline_app` via the pooler.
5. In `backend/.env` (or the cell-2 deployment env), set:
   ```
   REGION_CELL_2_DATABASE_URL=<neondb_owner direct URL for cell2 DB>
   REGION_CELL_2_APP_DATABASE_URL=<streamline_app pooler URL for cell2 DB>
   ```
6. Bootstrap the schema:
   ```bash
   pnpm -C backend cell:bootstrap --region=cell-2
   ```

**Verification (must exit 0):**
```bash
pnpm -C backend cell:bootstrap --region=cell-2
# Expected last line: RESULT: CELL READY cell=cell-2 ...
```

```bash
node backend/src/scripts/compare-cell-schema.mjs --region=cell-2
# Expected: RESULT: SCHEMAS IDENTICAL ... differences=0 migrations=<N>/<N>
# Exit code must be 0.
```

---

### Step 2 — Upstash Redis database for cell-2

1. Log in to [console.upstash.com](https://console.upstash.com).
2. Create a new Redis database named `streamlineos-cell-2` in the same region as the
   Neon project from Step 1.
3. From the database detail page, copy:
   - **REST URL** (looks like `https://<id>.upstash.io`)
   - **REST Token**
4. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
   REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN=<token>
   ```
5. Restart the cell-2 application process so `CacheService` picks up the new credentials.

**Verification (must exit 0):**
```bash
node -e "
const url = process.env.REGION_CELL_2_UPSTASH_REDIS_REST_URL;
const token = process.env.REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) { console.error('MISSING: REGION_CELL_2_UPSTASH_REDIS_REST_URL or TOKEN'); process.exit(1); }
fetch(url + '/ping', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(j => { if (j.result !== 'PONG') { console.error('FAIL:', j); process.exit(1); } console.log('PASS: Redis responds PONG'); });
" --env-file=backend/.env 2>&1
```

```bash
pnpm -C backend cell:isolation --region=cell-2 2>&1 | grep -E 'cache|ISOLATED|NAMESPACED'
# Expected: cache ISOLATED
```

---

### Step 3 — Cloudflare R2 bucket for cell-2

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Navigate to **R2 Object Storage**.
3. Create a new bucket named `streamlineos-cell-2` (or `<env>-cell-2`).
4. Create an **R2 API token** scoped to the new bucket with **Object Read & Write** access.
5. Copy the **Access Key ID**, **Secret Access Key**, and the **S3-compatible endpoint**
   (`https://<account-id>.r2.cloudflarestorage.com`).
6. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_R2_BUCKET_NAME=streamlineos-cell-2
   REGION_CELL_2_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   REGION_CELL_2_R2_ACCESS_KEY_ID=<key-id>
   REGION_CELL_2_R2_SECRET_ACCESS_KEY=<secret>
   ```
   No code change is needed; `RegionStorageConfig` already reads these fields.

**Verification (must exit 0):**
```bash
node -e "
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.REGION_CELL_2_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.REGION_CELL_2_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.REGION_CELL_2_R2_SECRET_ACCESS_KEY,
  },
});
const bucket = process.env.REGION_CELL_2_R2_BUCKET_NAME;
const key = 'rb08-probe-' + Date.now();
client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'ok' }))
  .then(() => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })))
  .then(() => { console.log('PASS: R2 bucket writable and deletable'); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
" --env-file=backend/.env 2>&1
```

```bash
pnpm -C backend cell:isolation --region=cell-2 2>&1 | grep -E 'object_storage|ISOLATED|NAMESPACED'
# Expected: object_storage ISOLATED
```

---

### Step 4 — Search cluster for cell-2

**Note:** No search cluster is currently deployed in any region. This step provisions the
first production search cluster and proves it is cell-isolated.

1. Provision a managed vector search cluster in the same region as the Neon project.
   (The codebase uses an abstract `searchCluster` string; the concrete provider is
   operator-chosen. A Neon-native pgvector cluster or a managed Pinecone/Qdrant instance
   both satisfy the interface.)
2. Create one index namespace per cell in the cluster.
3. Obtain an API key scoped to the cell-2 namespace.
4. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_SEARCH_CLUSTER=<cluster-endpoint>
   REGION_CELL_2_SEARCH_API_KEY=<api-key>
   ```

**Verification (must exit 0):**
```bash
node -e "
const cluster = process.env.REGION_CELL_2_SEARCH_CLUSTER;
const key = process.env.REGION_CELL_2_SEARCH_API_KEY;
if (!cluster || !key) { console.error('MISSING env vars'); process.exit(1); }
console.log('PASS: search cluster env vars present. Perform a live index/query probe manually.');
" --env-file=backend/.env 2>&1
```

```bash
pnpm -C backend cell:isolation --region=cell-2 2>&1 | grep -E 'search|ISOLATED|SHARED|UNPROVED'
# Expected: search ISOLATED (not SHARED or UNPROVED)
```

---

### Step 5 — Ably application for cell-2

1. Log in to [ably.com/dashboard](https://ably.com/dashboard).
2. Create a new Ably application named `streamlineos-cell-2`.
3. From the application settings, copy the **root API key** (the key with all capabilities).
4. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_ABLY_API_KEY=<root-key>
   ```
   No code change is needed; `RegionDefinition.ablyApiKey` already reads this field.

**Verification (must exit 0):**
```bash
node -e "
const key = process.env.REGION_CELL_2_ABLY_API_KEY;
if (!key || !key.includes('.')) { console.error('MISSING or invalid REGION_CELL_2_ABLY_API_KEY'); process.exit(1); }
const [appId] = key.split('.');
fetch('https://rest.ably.io/time', { headers: { Authorization: 'Basic ' + Buffer.from(key).toString('base64') } })
  .then(r => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
  .then(() => console.log('PASS: Ably application ' + appId + ' is reachable with the provided key'))
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
" --env-file=backend/.env 2>&1
```

```bash
pnpm -C backend cell:isolation --region=cell-2 2>&1 | grep -E 'realtime|ISOLATED|NAMESPACED'
# Expected: realtime ISOLATED
```

---

### Step 6 — Separate worker deployment for cell-2

1. In your hosting platform (Railway, Fly.io, Render, or equivalent), create a new
   deployment targeting the `backend` service but with the worker entrypoint:
   ```
   node dist/worker.js
   ```
   (or equivalent, matching the primary region's worker startup command).
2. Set the deployment environment to cell-2's values:
   ```
   REGION_KEYS=cell-2
   DATABASE_URL=<cell-2 owner URL from Step 1>
   APP_DATABASE_URL=<cell-2 app URL from Step 1>
   REGION_CELL_2_DATABASE_URL=<same as DATABASE_URL>
   REGION_CELL_2_APP_DATABASE_URL=<same as APP_DATABASE_URL>
   REGION_CELL_2_CELL_ID=cell-2
   REGION_CELL_2_UPSTASH_REDIS_REST_URL=<from Step 2>
   REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN=<from Step 2>
   ```
3. Do NOT point the cell-2 worker at the primary region's database. The process boundary
   is what enforces isolation; pointing at the wrong database defeats it.

**Verification (must exit 0):**
```bash
# On the new worker instance, after startup:
node backend/src/scripts/compare-cell-schema.mjs --region=cell-2 2>&1
# Expected: RESULT: SCHEMAS IDENTICAL ... exit code 0

# Confirm cron leases are prefixed for cell-2 (run on a live cell-2 Redis instance):
node -e "
const url = process.env.REGION_CELL_2_UPSTASH_REDIS_REST_URL;
const token = process.env.REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN;
fetch(url + '/keys/cron:lease:cell-2:*', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(j => {
    if ((j.result ?? []).some(k => !k.startsWith('cron:lease:cell-2:')))
      { console.error('FAIL: found keys without cell-2 prefix'); process.exit(1); }
    console.log('PASS: all cron leases are cell-2 prefixed (' + (j.result ?? []).length + ' found)');
  })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
" --env-file=backend/.env 2>&1
```

---

## Full isolation check (run after all six steps)

```bash
pnpm -C backend cell:isolation --region=cell-2
```

Expected output — every line must read `ISOLATED`, no `NAMESPACED` or `SHARED`:

```
cell-2  database         ISOLATED
cell-2  compute          ISOLATED
cell-2  cache            ISOLATED
cell-2  object_storage   ISOLATED
cell-2  search           ISOLATED
cell-2  realtime         ISOLATED
cell-2  worker           ISOLATED
```

Record full output to `architecture-refactor/runbooks/evidence/RB-08-cell-resource-accounts-<date>.txt`
and commit the evidence file. The SCORECARD row 24 moves from `[!]` to `[x]` only after
that file exists and the isolation check exits 0.

---

## Traps

- **`streamline_app` password must be set in the Neon console, not via `ALTER ROLE`.**
  Neon restores the previous password when the project suspends. The console is the
  only durable path.
- **Bootstrap before pointing traffic.** Run `pnpm -C backend cell:bootstrap --region=cell-2`
  and confirm `compare-cell-schema.mjs` exits 0 before routing any organization to the cell.
  A zero-migration cell exits 1 with `VACUITY FAIL`; a partially-migrated cell exits 1
  with `SCHEMAS DIFFER`.
- **Steps are independent but ordered by dependency.** Steps 2–6 reference the Neon URLs
  from Step 1. Steps 2 and 3 are independent of each other. Step 6 depends on Steps 1 and 2.
- **Do not re-use the primary region's access keys.** Each step creates a NEW credential
  scoped to the cell. Reusing the primary key makes the "separate account" meaningless.
- **Neon PITR requires `NEON_API_KEY` with branch-restore rights** for the cell project,
  separate from the primary project's key. Provision it alongside Step 1 and record it in
  the cell-2 deployment secrets.
