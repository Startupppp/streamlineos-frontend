# Page / surface inventory

**Result: BLOCKED during onboarding. Signed-in surfaces observed: 0.**

| Area | URL / route | Result | Evidence / notes |
|---|---|---|---|
| Login | `https://app.asana.com/-/login` | Reached | Google, Microsoft, email + Continue; reCAPTCHA notice |
| Create account | `https://asana.com/create-account` | Reached | Free trial copy; no credit card required |
| Verification handoff | `https://asana.com/thank-you` | Reached | “Please verify your email” |
| Email verification | Asana verification link from disposable mailbox | Completed | Redirected to account setup |
| Account setup step 1 | `https://app.asana.com/0/account_setup` | Completed | Full name and password accepted |
| Account setup step 2 | `https://app.asana.com/0/account_setup` | Skipped without field click | Empty job-title form advanced via Continue |
| Account setup industry | `https://app.asana.com/0/account_setup` | Chip selected, then blocked | **Technology & software** selected; renderer crashed during personalization |
| Authenticated home | `https://app.asana.com/0/home` | Not usable | Renderer Error code 9 |
| My Tasks | — | Not inspected | Blocked before signed-in shell |
| Inbox | — | Not inspected | Blocked before signed-in shell |
| Projects / list | — | Not inspected | Blocked before signed-in shell |
| Project / board | — | Not inspected | Blocked before signed-in shell |
| Timeline | — | Not inspected | Blocked before signed-in shell |
| Calendar | — | Not inspected | Blocked before signed-in shell |
| Portfolios | — | Not inspected | Blocked before signed-in shell |
| Goals | — | Not inspected | Blocked before signed-in shell |
| Dashboards / reporting | — | Not inspected | Blocked before signed-in shell |
| Forms | — | Not inspected | Blocked before signed-in shell |
| Rules / automations | — | Not inspected | Blocked before signed-in shell |
| Templates | — | Not inspected | Blocked before signed-in shell |
| Global search | — | Not inspected | Blocked before signed-in shell |

The requested workspace name and the one-project/1–2-task setup were not created because onboarding never completed. Per instruction, research stopped after the second reproduced renderer crash.
