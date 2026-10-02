# monday.com account

- **Status:** Account created and signed-in email/password login completed; research walk blocked by repeated monday renderer crashes.
- **Workspace:** `PXC-CI-Monday-20261001`
- **Plan/payment:** Used the free signup path (“No credit card needed”); no purchase or paid upgrade was made or requested.
- **Onboarding:** Completed account creation; selected `Work` and `Projects & tasks` (timelines, tasks, project tracking). Team-invite screen was reached; no invites were sent, and “Remind me later” was used.
- **Email:** Disposable mail.tm mailbox; domain type only: `uberip.com`. The monday email login verification challenge was completed from the mailbox.
- **Auth modalities observed:** email + password; Google; Microsoft; Email Code. No SSO control was observed on the login surface.
- **Board mutation:** Not reached; no board/items were created.
- **Blocker:** Signed-in workspace at `https://pxc-ci-monday-20261001.monday.com/boards` repeatedly ended in Chrome “Aw, Snap! Something went wrong while displaying this webpage. Error code: 9” after reloads. Evidence: `evidence/crash-after-onboarding.png`, `evidence/app-crash.png`.

Credentials are stored only in `.account-secrets.json` (mode 600).
