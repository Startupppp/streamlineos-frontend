# StreamlineOS MCP Agent Access

Connect Cursor or Claude Code to your StreamlineOS workspace so your AI coding assistant can read tickets, view image attachments, post comments, and move tickets to In Review — all on your behalf via your personal agent token.

## 1. Create an Agent Token

1. Open StreamlineOS and navigate to **Projects → Settings → Integrations → AI Agent Access**.
2. Click **Generate Token**.
3. Copy the token immediately — it is shown only once. Tokens start with `slos_`.
4. To revoke access at any time, return to the same page and delete the token.

> **Security note:** the token carries your full permissions within your org. Treat it like a password. Never commit it to source control.

---

## 2. Cursor Setup

Create or edit `.cursor/mcp.json` in the repository root (or your global Cursor config):

```json
{
  "mcpServers": {
    "streamlineos": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/backend/scripts/mcp-server.mjs"],
      "env": {
        "STREAMLINEOS_TOKEN": "slos_your_token_here",
        "STREAMLINEOS_API_URL": "http://localhost:1500"
      }
    }
  }
}
```

Replace `<absolute-path-to-repo>` with the actual path on disk, e.g. `/home/you/streamlineos` or `C:\projects\streamlineos`.

Restart Cursor after saving. The StreamlineOS tools will appear in the MCP tools list.

---

## 3. Claude Code Setup

Run once in any terminal:

```bash
claude mcp add streamlineos \
  -e STREAMLINEOS_TOKEN=slos_your_token_here \
  -e STREAMLINEOS_API_URL=http://localhost:1500 \
  -- node /absolute/path/to/backend/scripts/mcp-server.mjs
```

Verify it registered:

```bash
claude mcp list
```

---

## 4. Available Tools

| Tool | What it does |
|------|-------------|
| `list_projects` | List all projects you have access to (id, key, name, status). Accepts optional `search` and `status` filters. |
| `list_my_tickets` | List tickets assigned to you (or all/created/subscribed via `scope`). Filters: `projectId`, `status`, `search`, `limit`. |
| `get_ticket` | Fetch full ticket detail: title, status, priority, type, project, due date, description, last 10 comments, and all attachments. Image attachments are fetched and returned inline (up to 4 images, max 4 MB each) so the AI can see screenshots and mockups directly. |
| `move_ticket_status` | Update a ticket's status. Standard value after completing a fix: `IN_REVIEW`. Statuses are project-specific — if a transition is rejected the backend message explains the allowed transitions. |
| `add_ticket_comment` | Post a comment on a ticket (plain text or markdown). Use this to record your fix summary and PR link before moving to In Review. |

---

## 5. Recommended Fix → Review Workflow

When working on a ticket with your AI assistant:

1. **Discover** — `list_my_tickets` to see what is assigned to you.
2. **Read** — `get_ticket {ticketId}` to understand the requirement, see any screenshots or mockups, and read prior comments.
3. **Implement** — make the code changes in your local repo.
4. **Comment** — `add_ticket_comment` with a summary of what changed and a link to the PR or commit.
5. **Review** — `move_ticket_status {ticketId, status: "IN_REVIEW"}` to hand it off to a reviewer.

If `IN_REVIEW` is rejected by the workflow (400 response), the error message will describe the allowed transition. Call `get_ticket` to inspect the current status and choose the correct next step.

---

## 6. Security Notes

- **Token scope:** the agent token inherits your account's role and permissions — it can only read/write what you can.
- **Revoke immediately** if compromised: Projects → Settings → Integrations → AI Agent Access → Delete.
- **Local only:** `STREAMLINEOS_API_URL` defaults to `http://localhost:1500`. For a remote deployment, point it at your production URL and ensure HTTPS.
- **Never commit** the token to source control; use `.env` files excluded from git or a secrets manager.
