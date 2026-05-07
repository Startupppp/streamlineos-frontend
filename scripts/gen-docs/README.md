# Engineering documentation generators

Each script in this folder produces one professional Word document (`.docx`) under `docs/word-docs/`. The output files are gitignored — regenerate them any time with:

```bash
NODE_PATH=$(npm root -g) node scripts/gen-docs/01-architecture.js
NODE_PATH=$(npm root -g) node scripts/gen-docs/02-onboarding.js
# … etc
```

To regenerate all docs at once:

```bash
NODE_PATH=$(npm root -g) ls scripts/gen-docs/*.js | grep -v _styles | xargs -I {} node {}
```

Prerequisite: the `docx` package installed globally (`npm install -g docx`). The shared style helpers live in `_styles.js`.

## Document set (10 documents, developer audience)

1. `01-architecture.js` — System Architecture & Overview (the foundation)
2. `02-onboarding.js` — Developer Onboarding Guide
3. `03-database-schema.js` — Database Schema Reference
4. `04-auth-security.js` — Authentication, Roles & Security
5. `05-hr-payroll.js` — HR & Payroll Module
6. `06-crm-sales.js` — CRM / Sales Module
7. `07-projects-tickets.js` — Projects & Tickets Module
8. `08-api-reference.js` — API Reference
9. `09-frontend.js` — Frontend Architecture & UI
10. `10-deployment-ops.js` — Deployment, CI/CD & Operations

Each script is self-contained. Edit the relevant script to update content; rerun to refresh the `.docx`.
