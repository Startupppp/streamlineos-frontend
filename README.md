# Vaivamm CRM

![Vaivamm CRM](public/logo.svg)

**Vaivamm CRM** is a comprehensive, enterprise-grade application for managing Human Resources, Project Management, and Organizational Workflows. Built with modern web technologies, it offers a robust solution for tracking employee lifecycles, managing agile projects, and streamlining business operations.

---

## 🚀 Features

### 👥 Human Resources (HR)

- **Employee 360°**: Complete employee profiles, roles, and history.
- **Onboarding Wizard**: Streamlined process for adding new hires with role assignment.
- **Attendance Tracking**: Check-in/out logging, break tracking, and monthly attendance summaries.
- **Leave Management**: Leave requests, approval workflows, and balance tracking.
- **Payroll**: Automated salary calculations, payslip generation, and tax management.

### 💼 Project Management

- **Agile Workflows**: Sprints, Epics, Stories, and Tasks.
- **Backlog Management**: Prioritize work with advanced filtering and drag-and-drop.
- **Time Tracking**: Integrated timesheets linked directly to tickets.
- **Wiki & Documentation**: Project-specific documentation and knowledge base.
- **Performance**: Sprint burndown charts and velocity tracking.

### 🛡️ Enterprise Security

- **Role-Based Access Control (RBAC)**: Granular permissions for Owner, Admin, and Member roles.
- **Secure Authentication**: Powered by NextAuth.js.
- **Data Isolation**: Multi-organization support with strict data boundaries.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **API**: [tRPC](https://trpc.io/) (End-to-end typesafe APIs)
- **Database**: [PostgreSQL](https://www.postgresql.org/) & [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Beta)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) & [React Query](https://tanstack.com/query/latest)
- **AI Integration**: Vercel AI SDK (Google Generative AI)
- **Storage**: Cloudflare R2 / AWS S3

---

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-org/vaivamm-crm.git
    cd vaivamm-crm
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Environment Setup:**
    Duplicate `.env.example` to `.env` and fill in your credentials:

    ```bash
    cp env.example .env
    ```

    - **Database**: Set `DATABASE_URL`.
    - **Auth**: Set `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`).
    - **Storage**: Configure Cloudflare R2 credentials.
    - **AI**: Add `GOOGLE_GENERATIVE_AI_API_KEY`.

4.  **Database Migration:**
    Push the schema to your database:

    ```bash
    pnpm db:push
    ```

5.  **Run Development Server:**

    ```bash
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📜 Key Commands

| Command          | Description                                          |
| :--------------- | :--------------------------------------------------- |
| `pnpm dev`       | Starts the development server with Turbopack.        |
| `pnpm build`     | Builds the application for production.               |
| `pnpm start`     | Runs the built application in production mode.       |
| `pnpm lint`      | Runs ESLint to check for code quality issues.        |
| `pnpm db:push`   | Pushes schema changes to the database (prototyping). |
| `pnpm db:studio` | Opens Drizzle Studio to manage data visually.        |

---

## 📂 Project Structure

```
vaivamm-crm/
├── app/                  # Next.js App Router pages & layouts
├── components/           # Reusable UI components (Shadcn/UI based)
├── lib/                  # Utilities, hooks, and database config
│   ├── db/               # Drizzle schema definitions
│   └── validations/      # Zod schemas for input validation
├── server/               # Backend logic
│   └── api/              # tRPC routers (backend endpoints)
├── public/               # Static assets
└── types/                # Global TypeScript type definitions
```
