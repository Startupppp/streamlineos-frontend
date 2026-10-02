# monday.com reachable page inventory

## Reachable before the signed-in walk was blocked

| Surface | URL/pattern | Observed |
|---|---|---|
| Public signup entry | `monday.com` → `auth.monday.com/users/sign_up_new` | Email signup form; Google button; free/no-card copy. |
| Create your account | `auth.monday.com/users/invitation/accept?...` | Full name, password, account name, use-case picker, optional phone. |
| Signup use case | same flow | `Work`, `Personal`, `Nonprofits`. Selected `Work`. |
| Main focus onboarding | same flow | Projects & tasks; Design & Creative; Ops & finance; People & recruiting; Product & dev; Sales & CRM; Education; Other; Marketing & content. Selected `Projects & tasks`. |
| Team invitation onboarding | workspace root / boards flow | Invite link, invite-by-email rows, Admin role dropdown, automatic signups checkbox, Remind me later. No invite sent. |
| Email/password login | `/auth/login_monday/email_password` | Email, password, Forgot password, Log in. |
| New-device email verification | `/auth/login_monday/new_login_detected?with_otp=true` | Verification-code field, Verify, Resend code, Go back to login. Completed. |

## Signed-in navigation inventory

Not reached. After the team-invite step, the signed-in workspace/boards route repeatedly crashed the Chrome renderer (error code 9). Therefore My Work, Boards, Dashboards, Docs, Workload, Forms, Automations, Integrations, and Admin/settings were not walk-confirmed and are intentionally not claimed here.

Evidence: `evidence/onboarding-team.png`, `evidence/auth-modalities.png`, `evidence/crash-after-onboarding.png`.
