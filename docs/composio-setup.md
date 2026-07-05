# Composio Setup — Calendar Integrations

One-time setup to enable Google Calendar and Outlook account connections on `/calendar`. All tokens are custodied by Composio; StreamlineOS stores only connection metadata.

## 1. Composio account + API key

1. Sign up at [app.composio.dev](https://app.composio.dev) (free tier: 20k tool calls/month).
2. Copy your API key from the dashboard.
3. In `backend/.env`: `COMPOSIO_API_KEY=<key>`.

## 2. Outlook auth config (managed — no Microsoft credentials needed)

1. Dashboard → Auth Configs → Create → toolkit **Outlook**.
2. Choose **use Composio managed auth** (Composio's verified Microsoft app).
3. Copy the auth config id (`ac_...`) → `COMPOSIO_AUTH_CONFIG_OUTLOOK=<ac_id>`.

Teams meeting links on synced events require the connected account to have a Teams-enabled Microsoft 365 license.

## 3. Google Calendar auth config (custom — uses your existing Google OAuth client)

Composio has no managed Google Calendar app, so this one reuses your own `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`:

1. [Google Cloud Console](https://console.cloud.google.com) → your project:
   - Enable the **Google Calendar API** (APIs & Services → Library).
   - APIs & Services → Credentials → your OAuth 2.0 Web client → add authorized redirect URI:
     `https://backend.composio.dev/api/v3.1/toolkits/auth/callback`
   - OAuth consent screen → Test users → add every Google account that will connect (calendar scopes are "sensitive": up to 100 test users work unverified; verification is free when you need it — no CASA audit for calendar scopes).
2. Composio dashboard → Auth Configs → Create → toolkit **Google Calendar** → **use your own credentials**: paste the client id + secret, keep the default calendar scopes.
3. Copy the auth config id → `COMPOSIO_AUTH_CONFIG_GOOGLE_CALENDAR=<ac_id>`.

## 4. Finish

1. Restart the backend (`pnpm -C backend start:dev`). Missing keys degrade gracefully: connect attempts return "Composio integration is not configured".
2. Run the pending DB migration if not applied yet (`pnpm -C backend db:generate` + `db:migrate` — creates `user_integration_connections` and the `calendar_events` sync columns).
3. On `/calendar` → Accounts → Connect Google Calendar / Connect Outlook → approve in the provider popup → you land back on `/calendar` and the account appears in the sheet.
