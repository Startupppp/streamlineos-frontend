# StreamlineOS frontend

Next.js web application. The separate `backend/` repository owns business
endpoints, authorization, database schema, migrations, email and payments.

Read [shared rules](../CLAUDE.md), [frontend rules](CLAUDE.md) and the
[delivery index](../architecture-refactor/prd/README.md) before changing the app.
Historical test counts and build logs are not current release certification.

## Local development

The root package requires Node.js 22 or newer. Use the package manager version
recorded in `package.json` and the existing lockfiles. From the workspace root:

```powershell
pnpm install:all
pnpm dev
```

The root runner starts both applications. Frontend development uses port 1000;
consult backend configuration for its port. `pnpm dev:web` starts only the web app.

Configure variables from `.env.example` without overwriting existing environment
files. `NEXT_PUBLIC_API_URL` is browser-facing; `API_INTERNAL_URL` optionally
overrides server-to-server routing. The auth bridge uses `INTERNAL_API_SECRET`
and signed session proofs; check both tiers' auth contracts before deployment.
Keep backend signing keys and provider secrets out of public frontend variables.

Database provisioning belongs to the backend migration workflow. The frontend
has no migration or demo-seeding command. Use a disposable database for recovery.

## Identity and access

`/signup` currently redirects to `/signin`. Email OTP/magic links and configured
Google sign-in establish identity. Organization setup follows authentication.
The older public registration endpoint is included in the recovery review.

Organization and module owner/admin/member standings are fixed. Individual
permissions and record scope are separate; the UI consumes backend `/me/access`.
Proxy redirects assist navigation; the backend enforces authorization.

Routes live in `app/`, product UI in `features/`, queries in `hooks/api/`
and `lib/api/`. Use the existing scoped Query clients and `lib/wizard-gate.ts`.

## Verification

Read executable commands in `package.json`. Use `pnpm type-check`, focused Jest
checks and `pnpm build` as appropriate. Current Next configuration skips build-time
type validation; a successful build does not replace the independent typecheck.
Staging journeys, denials, payment reconciliation and recovery remain release gates.

## License

Proprietary — © StreamlineOS. All rights reserved.


