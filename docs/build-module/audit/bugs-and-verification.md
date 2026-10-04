# Bugs and verification ledger

## Forms, Feedbucket and normal activation evidence — 2026-10-04

Classification: Current verified only for the exact source, focused gates and normal synthetic API/read-only outcomes below; Current unverified for complete requirements and release. Source60 uses the existing canonical public-field renderer; source61 serializes source conversion and queues publication after the enclosing commit. Both are independently reviewed and committed. The live backend still serves55, so the API62 observations do not prove newly committed58/61 behavior.

No broad checkbox or D/I/T/R/B/L stage advances:522 uniquely identified tasks,110 checked,412 open. The ordinary OTP → NextAuth credentials → organization setup → Project → Ticket path uses separate reserved synthetic API identity and server-issued authority; it does not complete the separate browser login awaiting private user code entry. No token, OTP, cookie, magic link, raw mail, secret or environment value is recorded. No live Ticket comment was posted.

Payload SHA-256: `f2c58dd9e3156c960195195c09e4dfb41fe1626dfa7978bf79eda9af4610f34c` (UTF-8 JSON between fences, excluding fence newlines). Exact commands/ownership remain in [work claims](../implementation/WORK-CLAIMS.md).

```json
{
  "source": {
    "classification": "Current verified for bounded source and focused gates; Current unverified for full requirements",
    "at": "2026-10-04T05:52:18.927Z",
    "packages": [
      {
        "number": 60,
        "repository": "outer",
        "revision": "683e3e7572f8864561041e41a52cf049d39a5d4c",
        "tasks": [
          "BT-1334e7840230",
          "BT-6510aa3284df"
        ],
        "files": [
          {
            "path": "frontend/features/build/forms/field-input.tsx",
            "sha256": "906214efb0309ed1c8255d6374a274065800639a625795f0d56a56e490f639c9",
            "committedBlobSha256": "906214efb0309ed1c8255d6374a274065800639a625795f0d56a56e490f639c9"
          },
          {
            "path": "frontend/features/build/forms/public-form-page-states.test.tsx",
            "sha256": "5e2c580b7a6acb2fe7efa09ca83b13a55e7bb8ab5181fe5c38a17a4fccd5fd64",
            "committedBlobSha256": "5e2c580b7a6acb2fe7efa09ca83b13a55e7bb8ab5181fe5c38a17a4fccd5fd64"
          }
        ],
        "meaningfulRed": "Actual PublicFormPage/View/RHF/Radix canonical dropdown and long_text RED2 before renderer edit",
        "focused": "C and root: two suites,42 tests passed",
        "lint": "Exact two-path strict ESLint and diff checks passed",
        "changedTypeScript": "Initial TS2345 in incoherent idle/error mock retained; coherent flags/data/variables correction; final 8 GiB scoped pass",
        "productionTypeScript": "Frontend production pass, session89864 exit0",
        "review": "Backend agent independent CLEAR; root hash/source review",
        "gaps": [
          "Actual published Form/answers/database/public authority/version proof",
          "Browser keyboard/mobile",
          "Deployment and operations"
        ],
        "retainedFailure": "First post-edit Radix jsdom pointer support failed; test support corrected without source bypass"
      },
      {
        "number": 61,
        "repository": "backend",
        "revision": "2eaa96b492964e0adbaaecec8c6b054fdf234da1",
        "tasks": [
          "BT-6aad874e5b9c",
          "BT-abd16670ef91"
        ],
        "files": [
          {
            "path": "backend/src/modules/feedbucket/feedbucket-submissions.service.ts",
            "sha256": "d6bd84d1fbcf525a94ae2298be8c51b561f1b33f69b941b67139fcc5e3d55c34",
            "committedBlobSha256": "33a1c16866389bdabd20e9da4f3ba3af7417d23ddb5196ae80aa0ec692e69855"
          },
          {
            "path": "backend/src/modules/feedbucket/lib/feedbucket-submit.ts",
            "sha256": "a94f4907e97e8cb7fd6f27a0435e953fd728de593cd8e28255fe63237dc49605",
            "committedBlobSha256": "a94f4907e97e8cb7fd6f27a0435e953fd728de593cd8e28255fe63237dc49605"
          },
          {
            "path": "backend/src/modules/build/core/tickets/projects-tickets-create.service.ts",
            "sha256": "17ce44a086f84867655cf0098989ee77473592063d56fad14af00fde7060543d",
            "committedBlobSha256": "74db481ddfb50f8921031f87b536f11eff4e9daa1adff5a159c55c2b3003ccf8"
          },
          {
            "path": "backend/src/modules/feedbucket/feedbucket-convert-project-access.spec.ts",
            "sha256": "272d8570df44964b7b8620a811ec7602428a1bdd82540404be3be85502bb51ba",
            "committedBlobSha256": "04580ffe5ba2109ec2119553c4abeee3b12ff6eabf6ca539b3975ba293301cc5"
          },
          {
            "path": "backend/src/modules/feedbucket/tests/feedbucket-auto-link-deferred.spec.ts",
            "sha256": "4eb9ec2b6ded8bae8e23928bfd78ff6016ffb26c568ed5e1256a36eb59c6cb8f",
            "committedBlobSha256": "8b9fcf53a38a182c57df47d63aa245c98ee44586690d2c7061ce09e8d66ae6cd"
          },
          {
            "path": "backend/src/modules/build/core/tickets/projects-tickets-create.savepoint.spec.ts",
            "sha256": "1c1e63dfcff50d8708d6121d5320c320dd6246a60dfa1ba5a563e93c2e15e679",
            "committedBlobSha256": "037acefcd4c421dc944c6de87bb4fd46728a859cf0551658c40fa23789be6fd5"
          },
          {
            "path": "backend/src/modules/feedbucket/__tests__/feedbucket-build-notification.spec.ts",
            "sha256": "c48e73811a22e00538855823dc081ca7c84655b99db67cbc17dd943d03f8b2df",
            "committedBlobSha256": "c48e73811a22e00538855823dc081ca7c84655b99db67cbc17dd943d03f8b2df"
          }
        ],
        "meaningfulRed": "Three seam REDs: repeated basic conversion, repeated committed auto-hook and publication before outer commit",
        "focused": "C and root: four suites,48 tests passed",
        "lint": "Exact seven-path strict ESLint and diff checks passed",
        "changedTypeScript": "10 GiB scoped pass, session77893 exit0",
        "productionTypeScript": "Backend production pass, fresh root execution exit0 at 05:50Z",
        "review": "Frontend agent independent Standards/Spec CLEAR on all seven hashes; root source/hash review",
        "compatibility": "Initial4 suites passed/2failed,41 tests passed/21failed; affected notice fixture corrected. Final5suites passed/1failed,42tests passed/20failed",
        "retainedFailure": "Twenty unchanged AI fixture failures reach missing AccessService.scopeFor before mocked Ticket adapter. No pre61 execution baseline; static attribution only. Excluded AI source/test remain unchanged.",
        "gaps": [
          "Actual PostgreSQL source lock/concurrent mapping/rollback",
          "Real HTTP response/RLS/cache/event proof",
          "Runner refuses Feedbucket writes and reserved org Feedbucket disabled",
          "Header replay, hard-delete durable mapping and complete authority races",
          "Browser/mobile/deployment/operations"
        ]
      }
    ],
    "newFiles": [],
    "deletedFiles": [],
    "tracker": {
      "total": 522,
      "checked": 110,
      "open": 412,
      "checkboxChanges": 0,
      "stageChanges": 0
    },
    "runtimeBackendRevision": "5dcafa517ca634e658345c08c4085899900279a3",
    "hashBasis": "sha256 is the reviewed frozen working-tree byte hash; committedBlobSha256 is the exact Git blob hash. CRLF/LF normalization may differ without source-content change."
  },
  "runtime": {
    "classification": "Current verified for named normal API and read-only outcomes; Current unverified for full journeys",
    "runtime": {
      "frontendPort": 1000,
      "backendPort": 1001,
      "backendRevision": "5dcafa517ca634e658345c08c4085899900279a3",
      "source60And61Served": false,
      "providersAndBackgroundWorkers": false,
      "capturedMailOnly": true
    },
    "before": {
      "at": "2026-10-04T05:16:18.659Z",
      "exactReservedUserCount": 0,
      "readOnly": true,
      "scope": "Older Flow02 application-role guard plus GLOBAL exact new-email identity lookup; not tenant-only signup proof"
    },
    "authentication": {
      "at": "2026-10-04T05:20:02.523Z",
      "otpStatus": 200,
      "credentialStatus": 200,
      "sessionStatus": 200,
      "reservedIdentityMatches": true,
      "userIdShape": true,
      "registeredSessionShape": true,
      "backendBearerShape": true,
      "orgPresent": false,
      "organizationAccess": "none",
      "enabledModules": [],
      "browserProof": false
    },
    "activation": {
      "first": {
        "at": "2026-10-04T05:21:11.350Z",
        "status": 201,
        "success": true,
        "orgIdShape": true,
        "autoLoginTokenShape": true,
        "errorCode": null,
        "selectedModules": [
          "build"
        ],
        "browserProof": false,
        "responseShape": "top-level declared success/orgId/autoLoginToken; initial evidence extractor incorrectly assumed data envelope"
      },
      "requestSchema": "Authoritative organization setup schema",
      "responseSchema": "Backend orgSetupCompleteResponseSchema parses actual top-level JSON",
      "renewal": {
        "sessionStatus": 200,
        "sameUserAndOrg": true,
        "organizationAccess": "active",
        "serverOwner": true,
        "enabledModules": [
          "build",
          "kb",
          "chat"
        ]
      },
      "replay": {
        "status": 201,
        "sameOrganization": true,
        "autoLoginTokenOmitted": true,
        "responseContract": true
      },
      "statusRead": {
        "status": 200,
        "ready": true,
        "provisioningStatus": "completed",
        "wireContract": "frontend/hooks/api/org-setup-schema.ts"
      },
      "persisted": {
        "at": "2026-10-04T05:27:05.884Z",
        "applicationRoleReadOnly": true,
        "currentOrgIdentityGuard": true,
        "setupCompleted": true,
        "organizationStatus": "ACTIVE",
        "ownerMembership": [
          {
            "role": "OWNER",
            "is_owner": true,
            "status": "ACTIVE"
          }
        ],
        "userVerified": true,
        "userActive": true,
        "otp": {
          "total": 1,
          "used": 1
        },
        "modules": [
          {
            "module_key": "accounting",
            "enabled": false
          },
          {
            "module_key": "billing",
            "enabled": false
          },
          {
            "module_key": "blog",
            "enabled": true
          },
          {
            "module_key": "build",
            "enabled": true
          },
          {
            "module_key": "calendar",
            "enabled": true
          },
          {
            "module_key": "chat",
            "enabled": true
          },
          {
            "module_key": "crm",
            "enabled": false
          },
          {
            "module_key": "directory",
            "enabled": true
          },
          {
            "module_key": "feedbucket",
            "enabled": false
          },
          {
            "module_key": "home",
            "enabled": true
          },
          {
            "module_key": "hr",
            "enabled": false
          },
          {
            "module_key": "inventory",
            "enabled": false
          },
          {
            "module_key": "kb",
            "enabled": true
          },
          {
            "module_key": "mail",
            "enabled": true
          },
          {
            "module_key": "notifications",
            "enabled": true
          },
          {
            "module_key": "payroll",
            "enabled": false
          },
          {
            "module_key": "settings",
            "enabled": false
          },
          {
            "module_key": "sign",
            "enabled": false
          },
          {
            "module_key": "support",
            "enabled": false
          },
          {
            "module_key": "surveys",
            "enabled": false
          }
        ],
        "outbox": [
          {
            "event_type": "organization.setup.completed",
            "delivery_state": "DELIVERED",
            "count": 1
          }
        ],
        "secretColumnsSelected": false,
        "browserProof": false,
        "retainedFailures": [
          "first identity query before explicit tenant context returned zero rows and refused; readonly rollback/connection closed",
          "next proof completed reads but evidence assignment used absent REPL binding; readonly connection closed; no write"
        ]
      }
    },
    "project": {
      "firstAt": "2026-10-04T05:29:46.946Z",
      "firstStatus": 201,
      "replayStatus": 201,
      "sameReturnedRecord": true,
      "readStatus": 200,
      "requestSchema": "createProjectSchema",
      "wireSchemas": [
        "projectsCreateProjectResponseSchema",
        "projectsByIdGetProjectResponseSchema"
      ]
    },
    "ticket": {
      "firstAt": "2026-10-04T05:30:51.243Z",
      "firstStatus": 201,
      "replayStatus": 201,
      "sameReturnedRecord": true,
      "readStatus": 200,
      "requestSchema": "createTicketSchema",
      "wireSchemas": [
        "projectsTicketsCreateTicketResponseSchema",
        "projectsTicketsGetTicketResponseSchema"
      ],
      "statusMutation": {
        "at": "2026-10-04T05:32:30.412Z",
        "status": 200,
        "version": 2,
        "wireSchema": "projectsTicketsUpdateTicketResponseSchema"
      },
      "staleMutation": {
        "status": 409,
        "errorCode": "PROJECTS_TICKET_CONFLICT",
        "not500": true
      },
      "tenantRead": {
        "knownExistingOtherReservedTicket": true,
        "freshOwnControl": 200,
        "foreignTicket": 404,
        "not500": true,
        "firstExpiredOrInvalidAuthenticationResult": 401,
        "first401IsNotTenantProof": true
      }
    },
    "postWrites": {
      "at": "2026-10-04T05:51:04.540Z",
      "appRoleReadOnly": true,
      "currentOrgIdentityGuard": true,
      "project": [
        {
          "status": "ACTIVE",
          "same_key_count": 1
        }
      ],
      "ticket": [
        {
          "status": "IN_PROGRESS",
          "priority": "HIGH",
          "version": 2,
          "same_title_count": 1
        }
      ],
      "assignments": [
        {
          "count": 1
        }
      ],
      "activity": [
        {
          "action": "created",
          "from_value": null,
          "to_value": null,
          "count": 1
        },
        {
          "action": "status_changed",
          "from_value": "TODO",
          "to_value": "IN_PROGRESS",
          "count": 1
        }
      ],
      "comments": [
        {
          "count": 0
        }
      ],
      "setupEvents": [
        {
          "event_type": "organization.setup.completed",
          "delivery_state": "DELIVERED",
          "count": 1
        }
      ],
      "secretColumnsSelected": false,
      "browserProof": false
    },
    "retainedVerificationMethodFailures": [
      "Initial setup extractor wrongly expected data envelope; actual top-level authoritative contract passed",
      "Initial setup-status parser used backend Date schema on wire strings; existing frontend wire schema passed",
      "First read-only new-org identity lookup omitted explicit tenant context, returned0 and refused; no write",
      "Second read-only evidence assignment referred to an absent REPL binding; transaction closed, no write",
      "First foreign-ticket attempt401; normal NextAuth session refresh followed by own200/foreign404 is the only tenant denial proof"
    ],
    "limits": [
      "Browser53 synthetic account is distinct and awaiting human OTP entry; API62 credentials are not injected into browser",
      "No full browser/mobile/role/module/object/PAT matrix",
      "No cache notification fanout/physical concurrency/deployment/operations proof",
      "No comment write",
      "Modules query limited20 is bounded observation, not whole catalog",
      "Old51–59 initial frontend API misconfiguration and unknown server-side effect remain retained"
    ]
  }
}
```

Every named failed gate/method and bounded proof remains retained. Physical Feedbucket locking, public Form persistence, complete permission/tenant/mobile/browser coverage and release/operations are open. No source or evidence file is created or deleted.

## Synthetic runtime and ticket interaction source — 2026-10-04

Classification: Current verified for the exact source/gate and bounded HTTP/read-only observations below; Current unverified for complete customer/release behavior. Eight disjoint packages reuse existing owners and have meaningful behavioral REDs, root focused repeats, exact lint/diff, changed-file/production TypeScript and frozen independent reviews.52 strict source lint remains failed with three existing warnings; the passing default lint is not a strict pass.54 repairs timestamp test fixtures without relaxing production contracts;57 repairs the existing member dirty/pending boundary. No source/helper/schema/API/component/test/Markdown was added or deleted by51–59.

All522 IDs remain present:110 checked/412 open; no checkbox or D/I/T/R/B/L status is advanced. The complete412-ID queue remains root-owned when not exactly claimed. Source58 is committed, but the local backend still serves55; no58 runtime proof is implied. Final frozen hashes, source revisions, suite counts and exact limits appear once in this receipt. Commands remain in each exact [work claim](../implementation/WORK-CLAIMS.md). Payload SHA-256: `6a5c8164d92e0f39a82a1f97c4104ee4457652757b201dfd809e08bb8f2b5247` (UTF-8 JSON between fences, excluding fence newlines).

The second1000 sign-in reached the local captured-mail transport and verification-code screen. The READ ONLY application-role query observes one active reserved global user, unverified email and one valid unused OTP; it does not prove the user was absent before, OTP consumption, authentication, new organization, onboarding or module/record authorization. Its older Flow02 tenant guard and bounded GLOBAL user read are separate scopes. The first misconfigured sign-in reached no local capture; its server-side effect remains unverified. Secret mail, OTP/token/session/activation values and database configuration are never recorded. The tools have separate memory and no supported private OTP bridge; browser code entry is pending user input.

The stale generated route declaration initially failed118 parse diagnostics. Installed Next typegen alone repaired it to zero; source was not excluded and generated declarations were not hand-edited. Temporary custom-output tsconfig includes remain authorized and differ from HEAD. No pre-window .env hashes exist, so no-write action audit is not byte invariance. Historical runtime failures, full test-TypeScript failures, unapplied application migrations, unverified physical races/cache/events/mobile and deployment/operations remain open.

```json
{
  "classification": "Current verified",
  "observedAt": "2026-10-04T05:14:58.223Z",
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "stageAdvances": 0,
    "sortedOpenIdSha256": "3ad4f5da9e48eee69e82369f027c5b654874563a603c9eaad80ddaf7acb9e160"
  },
  "sourcePackages": [
    {
      "package": 51,
      "revision": "35eac0d45783ad96f53b9898a69b7766da340fbc",
      "files": [
        {
          "path": "backend/test/helpers/build-browser-app.ts",
          "sha256": "4d858fb00bcf67d5722bf5187851caae64d53a8bc94fa36723c8a7e4d6e72feb"
        },
        {
          "path": "backend/test/helpers/run-build-browser-verification.ts",
          "sha256": "9fb449139b2ed5082dc220afe6cc74db1cfcec08a3616c057b6ae639ab17898d"
        },
        {
          "path": "backend/test/security/build-browser-boundary.spec.ts",
          "sha256": "74870e4c48006dd644c6b16871e7a882efc620f4a3aa4d297f120c57d0856c1a"
        },
        {
          "path": "backend/test/security/build-browser-runner.spec.ts",
          "sha256": "e519cb1dfbf040c0b8442b5dbbd9bf2d2c18e6cf5332b93b9eb510db928ebdbd"
        }
      ],
      "red": "4 meaningful boundary/CORS failures",
      "focused": {
        "passed": 223,
        "suites": 2
      },
      "review": "B and root CLEAR",
      "lint": "exact four paths strict PASS",
      "changedFileTypeScript": "PASS 10GiB",
      "productionTypeScript": "PASS 10GiB",
      "scope": "closed loopback browser origins; authority and provider/worker/application-role controls preserved"
    },
    {
      "package": 52,
      "revision": "8207d7c020dc2273a1964fdb6295a44954dea1de",
      "files": [
        {
          "path": "frontend/features/build/tickets/create-ticket-dialog.tsx",
          "sha256": "b0b67db4514b3f6cb1f242fb695293af90421f5e75919872c1de600611370727"
        },
        {
          "path": "frontend/features/build/tickets/create-ticket-dialog-dirty-state.test.tsx",
          "sha256": "c5c3f76ea55dc67c1315398d31daea0f1b8cca0af42d0e52b7fa4974f7a769b9"
        }
      ],
      "red": "2 actual pending Dialog/project-switch failures",
      "focused": {
        "passed": 15,
        "suites": 1
      },
      "review": "A and root CLEAR",
      "lint": "source0errors/3 retained effect warnings; strict max-warnings0 FAIL; test strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "pending Ticket create/upload draft retention; partial-upload/unmount/retry identity remains open"
    },
    {
      "package": 54,
      "revision": "53c437d0e2d0723eb39e2fd67cf9f86b001bd03c",
      "files": [
        {
          "path": "frontend/hooks/api/build/__tests__/build-project-contract-drift.test.ts",
          "sha256": "f2302a7fe6bf59196a30429eaa96bace6896e8c3c9b97a44e11996817252f44a"
        }
      ],
      "red": "6 timestamp-fixture failures/7passes",
      "focused": {
        "passed": 73,
        "suites": 6
      },
      "review": "B and root CLEAR",
      "lint": "exact one path strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "fixture follows required current createdAt/updatedAt; two omission negatives retained; no production contract relaxation"
    },
    {
      "package": 55,
      "revision": "5dcafa517ca634e658345c08c4085899900279a3",
      "files": [
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-relations.service.ts",
          "sha256": "eb63112886756b97b4443ea64f2b0af37d7fa721d7081765fc3fbcdbb3b0ed77"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-relations-soft-delete.spec.ts",
          "sha256": "31d726e963f67ec30ebe89f2b974a359f76c2e636c622a3683c1b2f348524124"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-links-tenant-isolation.spec.ts",
          "sha256": "09477d80c4dc7de40bbef7e59071d56825d54536533fa59a9edf6e9f83a45480"
        }
      ],
      "red": "2 hidden opposite-endpoint LIST/ADD authority failures",
      "focused": {
        "passed": 29,
        "suites": 3
      },
      "review": "B and root CLEAR",
      "lint": "exact three paths strict PASS",
      "changedFileTypeScript": "PASS 10GiB",
      "productionTypeScript": "PASS 10GiB",
      "scope": "canonical related Ticket read visibility in outer SQL before limit100; target ADD read gate; modeled SQL not physical PostgreSQL"
    },
    {
      "package": 56,
      "revision": "aec8aa43a84246c46693a38ad1c1c2967810017f",
      "files": [
        {
          "path": "frontend/features/build/ticket-details/ticket-related-links.tsx",
          "sha256": "04905cf9db833b82451dd03a2ff49044c61e055be5d02e46c0cae8e1b7c8547b"
        },
        {
          "path": "frontend/features/build/ticket-details/ticket-related-links.test.tsx",
          "sha256": "d130426331c49557e9fbd2300913e4846cecbbb2e4b8a148b9836511efcc6e4f"
        }
      ],
      "red": "2 actual unsafe rendered href failures; expanded8RED",
      "focused": {
        "passed": 96,
        "suites": 2
      },
      "review": "A and root CLEAR",
      "lint": "exact two paths strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "single-slash same-origin internal links, unsafe control/backslash/protocol-relative refusal; external HTTP(S) noopener preserved"
    },
    {
      "package": 57,
      "revision": "e28b9f225e611451bb6f3bfd97d473fad16ebcd8",
      "files": [
        {
          "path": "frontend/features/build/settings/add-project-member-dialog.tsx",
          "sha256": "d88226593cafb8ac444f1ee0bb9c8b4c6ff5ca2743a2120714bf3c81d2da6bc1"
        },
        {
          "path": "frontend/features/build/settings/add-project-member-dialog.test.tsx",
          "sha256": "e3318ca403601b3ae85ea701d48013eec7472a9ceeacfa0ba8caa769cef2d35f"
        }
      ],
      "red": "2 actual dirty-navigation/pending member-dialog failures",
      "focused": {
        "passed": 36,
        "suites": 2
      },
      "review": "A and root CLEAR",
      "lint": "exact two paths strict PASS",
      "changedFileTypeScript": "first FAIL118 stale generated-route parse errors; official next typegen repair then PASS8GiB",
      "productionTypeScript": "PASS 8GiB after official route repair",
      "scope": "actual RHF dirty registration; pending dismissal/edit fence, failure retry and acknowledged success; existing project VIEWER is not structural role"
    },
    {
      "package": 58,
      "revision": "c450537b0aa17aa0afbfe5976ffab2e9bb7f1b0d",
      "files": [
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-links.service.ts",
          "sha256": "b2e7116628b6c026b4a06bd270c7dc1362657f3596742c976d7a3c4adb5022de"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-links-project-access.spec.ts",
          "sha256": "8039f18ccb49d0f9472d3d826d0e9a47f5a74a49d303b8e9e1739f2ce454fa91"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-subresources-project-access.spec.ts",
          "sha256": "a62b3e7562092156ab72cbe814a36002de97a7ffcedf556cfd1b4f7320e41a01"
        }
      ],
      "red": "8 actual canonical locked-project command failures (4writes x ARCHIVED/COMPLETED)",
      "focused": {
        "passed": 131,
        "suites": 4
      },
      "review": "B and root CLEAR",
      "lint": "exact three paths strict PASS",
      "changedFileTypeScript": "PASS 10GiB",
      "productionTypeScript": "PASS 10GiB",
      "scope": "existing assertTicketWriteAccess for attachment and related-link add/update/delete; readable locked-project history and child binding preserved"
    },
    {
      "package": 59,
      "revision": "f47f13bb220edf42c5f06918b188688ef03c410e",
      "files": [
        {
          "path": "frontend/features/build/navigation/build-scope-browser.tsx",
          "sha256": "bd2b048429a1d483b1a7c88a6e89237bbacf141d179f1f4c5bc52b432094ff7a"
        },
        {
          "path": "frontend/features/build/navigation/build-scope-browser.test.tsx",
          "sha256": "81514223348dd7bf705faaf68c332815a60f194d951af4c458a3946fd60f5efc"
        }
      ],
      "red": "1 actual child-to-parent keyboard-focus failure/40oldskipped in RED selection",
      "focused": {
        "passed": 76,
        "suites": 3
      },
      "review": "A and root CLEAR",
      "lint": "exact two paths strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "current rendered hierarchy parent focus on Left; collapse/root/flat lists/Right/Enter unchanged"
    }
  ],
  "runtime": {
    "frontendPort": 1000,
    "backendPort": 1001,
    "backendServedRevision": "5dcafa517ca634e658345c08c4085899900279a3",
    "backendPid": 25504,
    "frontendPid": 10420,
    "backendReady": true,
    "frontendReady": true,
    "environment": "process-only overrides; .env read without write; no retained pre-window hash baseline",
    "primaryAndRegionalPreflight": "application role streamline_app; nonsuperuser/nonBYPASSRLS; read-only preflight retained",
    "frontendCompiledApi": "local emitted script confirmed127.0.0.1:1001 before second sign-in request",
    "observations": [
      {
        "at": "2026-10-04T04:37:01Z",
        "method": "OPTIONS",
        "path": "/auth/email-otp/request",
        "origin": "http://127.0.0.1:1000",
        "status": 204,
        "allowOrigin": "http://127.0.0.1:1000",
        "scope": "CORS only; this is not the business OTP route"
      },
      {
        "at": "2026-10-04T04:37:01Z",
        "method": "OPTIONS",
        "path": "/auth/email-otp/request",
        "origin": "https://evil.invalid",
        "status": 403,
        "allowOrigin": false
      },
      {
        "at": "2026-10-04T04:37:01Z",
        "method": "GET",
        "path": "/me/inbox/unified",
        "authenticated": false,
        "status": 401,
        "code": "UNAUTHORIZED"
      }
    ],
    "mail": {
      "status": 200,
      "noStore": true,
      "locallyCapturedMessages": 1,
      "secretDataRecorded": false
    },
    "persistence": {
      "at": "2026-10-04T04:56:23.330Z",
      "applicationRoleReadOnly": true,
      "syntheticOrganizationGuardVerified": true,
      "syntheticUserCount": 1,
      "userActive": true,
      "emailVerified": false,
      "otpCounts": {
        "total": 1,
        "unused": 1,
        "valid_unused": 1
      },
      "secretColumnsSelected": false,
      "scope": "READ ONLY guarded older Flow02 organization plus bounded GLOBAL exact reserved user/OTP read; not new-organization/RLS proof"
    },
    "browser": {
      "url": "http://127.0.0.1:1000/signin",
      "state": "verification-code screen after local captured-mail request",
      "signedIn": false,
      "otpConsumed": false,
      "screenshotsSaved": false,
      "secureCrossToolSecretTransfer": "unsupported; user private browser code entry requested"
    },
    "failedAttempts": [
      "First backend preload failed missing tsconfig-paths/register; retry uses installed ts-node/NODE_PATH without install",
      "Isolated frontend1002 font resolution failed and fallback manifest ENOENT followed; stopped exact owned process;1002 not used again",
      "First original1000 frontend launch lost API overrides; its sign-in did not reach local capture; server-side effect unverified. Stopped before retry, rebuilt unique env, asserted private presence and verified local compiled URL"
    ],
    "generatedRouteRepair": {
      "beforeSha256": "edac6b3be106ad13a0ca5cc45ce14bcdd2de1045dee64f8226b2db90b33ff907",
      "parseDiagnostics": 118,
      "command": "NEXT_DIST_DIR=.next/dev pnpm exec next typegen",
      "afterSha256": "ed3a1a13c826369276cd9f16ece0d12c53281f3733654cf10f43d09f1d916cfa",
      "afterParseDiagnostics": 0,
      "handEdited": false,
      "cause": "Current unverified"
    },
    "temporaryTrackedConfiguration": "frontend/tsconfig.json retains two compiler-added window12h output includes; not identical to HEAD; not staged"
  },
  "retainedFailures": [
    "52 strict source lint3 warnings",
    "Previous full backend test TypeScript10GiB OOM134/pnpm1",
    "Previous full frontend specs24 diagnostics in six unowned paths",
    "55 unexpected formatting drift restored only owned wrapping after AST leaf/kind equivalence; cause unverified",
    "Application1730/1731 and1732/1733/1734 unapplied"
  ],
  "contractEvidence": {
    "at": "2026-10-04T03:51Z",
    "dtoChanges": false,
    "backend": "OpenAPI self-test/check PASS4107operations/4092Zod/4107exposure",
    "frontend": "vendor self-test6PASS/byte parity; Build self-test93PASS/390schemas/311operations freshness"
  },
  "limitations": [
    "Focused tests are source/model/DOM evidence, not PostgreSQL RBAC, locks or persistence",
    "No complete new signup/onboarding/module/project/Ticket/client browser proof",
    "58 is committed but current backend runner still55",
    "No new deployment/operations evidence",
    "No whole BT checkbox or D/I/T/R/B/L stage changed"
  ],
  "cleanup": {
    "createdSourceFiles": [],
    "deletedFiles": [],
    "retained": "all historical evidence/research/screenshots and three unknown untracked Windows cache DBs"
  }
}
```


## Approver liveness and project draft recovery — 2026-10-04

Classification: Current verified for the bounded source and gate results below; Current unverified for complete application/release behavior. Backend49 commits exactly five existing files at 3f0d96786bffe6e0c463ce4da755be8601539947; frontend50 commits exactly two existing files at 1ff45c1c0c49136da0aa7ab30ece4a511c6b6e04. No file was created or deleted. Reproducible behavioral failures precede both corrections, and independent reviewers inspected the frozen production and test changes.

Root repeats six backend suites/175 tests and the actual frontend Sheet/provisioning suite/13 tests successfully. Both changed-file and production TypeScript gates, exact-path lint/diff, OpenAPI freshness and generated/vendor checks pass. The wider frontend run remains failed:65 pass/six unchanged CUSTOM_STATE timestamp-fixture failures. No historical baseline execution is invented. Previous full test TypeScript OOM/diagnostics remain unpassed; the scoped checks do not replace them.

Member SHARE precedes Ticket UPDATE; the test records exact modes and observes the independent member-queue wait before writer release. Those modeled queues do not prove PostgreSQL blocking, continuous account/org/requester authority or cascade safety. The project guard preserves pending review/input and its dedicated success acknowledgement path; scope/unmount recovery and real browser persistence remain open. None of BT-27a037364398, BT-801e948e8a67, BT-2e4073320ccb or BT-3e9ebfaad21e closes. All522 checkbox/stage statuses remain unchanged (110 checked/412 open). Canonical payload SHA-256: `92047146b0a1531f14ae4ab5da10f401053d32dafb17d3f418c930ce8d93af8d` (UTF-8 JSON between the fences, excluding fence newlines).

```json
{
  "classification": "Current verified",
  "observationAt": "2026-10-04T03:52:19.240Z",
  "claim49": {
    "requirements": [
      "BT-27a037364398",
      "BT-801e948e8a67"
    ],
    "revision": "3f0d96786bffe6e0c463ce4da755be8601539947",
    "files": [
      {
        "path": "backend/src/modules/build/approvals/approvals.service.ts",
        "sha256": "256c0ae2b45215459971904ed7b8dd0002f4532923b8bb734dfe6f05f9287f16"
      },
      {
        "path": "backend/src/common/organization/organization-actor.ts",
        "sha256": "d1fc8402cc0a064c5e399327e990f7981e8ce6d982717634ffd1575ca2577f58"
      },
      {
        "path": "backend/src/modules/build/approvals/approvals.service.spec.ts",
        "sha256": "8ce9b9233ac5cd7ab7cc95f9a4daf6ac7a1889c9da34252418f2b67f3e495c71"
      },
      {
        "path": "backend/src/modules/build/approvals/__tests__/approval-lifecycle-concurrency.fixture.ts",
        "sha256": "c3c9e23a97d106d93bee1a950f64f16ff4e14bd3289cd3b26a26807ca7018097"
      },
      {
        "path": "backend/src/modules/build/approvals/__tests__/approval-task-artifact.spec.ts",
        "sha256": "373e8e1bc5bff30af295fcda1c4618331a03d0dc500d9c0eed41e714db6718f4"
      }
    ],
    "behavioralReds": [
      {
        "observer": "C",
        "cases": 2,
        "scope": "inactive canonical user/org public creation succeeds before correction"
      },
      {
        "observer": "C",
        "failed": 14,
        "skipped": 34,
        "scope": "non-task requester revocation/project archive during member wait"
      }
    ],
    "coordinatorFocused": {
      "suites": 6,
      "passed": 175,
      "failed": 0,
      "exitCode": 0
    },
    "exactLint": {
      "exitCode": 0,
      "files": 5
    },
    "diff": {
      "exitCode": 0
    },
    "changedPathTypeScript": {
      "exitCode": 0,
      "heapMiB": 8192,
      "config": "tsconfig.test.json",
      "rootFileCount": 5,
      "incremental": false
    },
    "productionTypeScript": {
      "command": "pnpm -C backend typecheck",
      "exitCode": 0,
      "heapMiB": 10240
    },
    "independentReview": {
      "production": "C and B CLEAR",
      "test": "B and root CLEAR",
      "frozen": true
    },
    "modelQueue": {
      "memberQueueIndependentOfGlobalTransactionTail": true,
      "writerFirstWaitSignal": true,
      "exactModes": [
        "Member SHARE",
        "Ticket UPDATE"
      ],
      "physicalPostgreSQL": false
    },
    "open": [
      "physical member/status/delete concurrency",
      "user/org/requester/grant continuity",
      "reassignment and decision liveness",
      "real application API and persistence",
      "complete RBAC and tenant boundary",
      "cache/events",
      "browser and mobile",
      "deployment and operations"
    ]
  },
  "claim50": {
    "requirements": [
      "BT-2e4073320ccb",
      "BT-3e9ebfaad21e"
    ],
    "revision": "1ff45c1c0c49136da0aa7ab30ece4a511c6b6e04",
    "files": [
      {
        "path": "frontend/features/build/project-create/project-create-wizard.tsx",
        "sha256": "f5bda7640efe152267c1583466fd41ec2c6c2a1906008c6d7658d163c9731670"
      },
      {
        "path": "frontend/features/build/project-create/project-create-dirty-guard.test.tsx",
        "sha256": "eae63b3b3ad3a6ba12f94bae9e724259ee09d8d7bd465637bbfd3d2d902f88dc"
      }
    ],
    "behavioralRed": {
      "observer": "C",
      "failed": 1,
      "passed": 5,
      "exitCode": 1,
      "scope": "actual Sheet and provisioning hook pending close resets draft"
    },
    "coordinatorFocused": {
      "suites": 1,
      "passed": 13,
      "failed": 0,
      "exitCode": 0
    },
    "widerFocused": {
      "suites": 6,
      "passed": 65,
      "failed": 6,
      "exitCode": 1,
      "failingFile": "frontend/hooks/api/build/__tests__/build-project-contract-drift.test.ts",
      "reason": "unchanged CUSTOM_STATE fixture omits required createdAt and updatedAt",
      "baselineExecuted": false,
      "decoderAndFixtureModified": false
    },
    "exactLint": {
      "exitCode": 0,
      "files": 2
    },
    "diff": {
      "exitCode": 0
    },
    "changedPathTypeScript": {
      "exitCode": 0,
      "heapMiB": 8192,
      "config": "tsconfig.specs.json",
      "rootFileCount": 2,
      "incremental": false
    },
    "productionTypeScript": {
      "command": "pnpm -C frontend type-check",
      "exitCode": 0,
      "includesOfficialRouteTypeGeneration": true,
      "heapMiB": 8192,
      "warning": "existing Edge Runtime deprecation"
    },
    "independentReview": {
      "productionAndTests": "A and root CLEAR",
      "frozen": true
    },
    "open": [
      "scope/unmount/owner-change recovery",
      "real create/failure/retry and duplicate submission",
      "persistence after refresh",
      "Project to Ticket first-use action",
      "permission and tenant proof",
      "browser and mobile",
      "deployment and operations"
    ]
  },
  "contracts": {
    "dtoAndResponseChanged": false,
    "newPermissions": false,
    "vendor": {
      "selfTests": 6,
      "exitCode": 0,
      "byteMatch": true
    },
    "generatedBuild": {
      "selfTests": 93,
      "exitCode": 0,
      "schemaCount": 390,
      "operationCount": 311,
      "fresh": true
    },
    "openapiSelfTest": {
      "exitCode": 0,
      "semantics": "line endings, component and operation changes plus additions/removals"
    },
    "openapiFreshness": {
      "exitCode": 0,
      "operations": 4107,
      "responseContracts": 4092,
      "exposureStamped": 4107
    }
  },
  "cleanup": {
    "newFiles": [],
    "deletedFiles": [],
    "newSourceComments": false,
    "liveTicketComments": false
  },
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "stagesAdvanced": false
  },
  "historicalFailedGates": {
    "fullBackendTestTypeScript": "previous 10GiB OOM remains unpassed; no fresh successful full run",
    "fullFrontendSpecTypeScript": "previous24diagnostics/six unowned files remain unpassed"
  },
  "boundaries": {
    "realApi": false,
    "database": false,
    "browser": false,
    "mobile": false,
    "deployment": false,
    "operations": false
  }
}
```



## Task artifact PostgreSQL proof — 2026-10-04

Classification: Current verified for the exact frozen source gates and bounded scratch observations below. Current unverified for complete application, browser and release acceptance. The corrected third run passed89/89 checks, exit0, at backendc570327aebaad87030b58b4cafa0ab49ca3e186f. Root independently confirmed scratch database/sessions0 and unchanged application columns/approvals0 with streamline_app READ ONLY. Both failed earlier runs remain in the following historical checkpoint.

The external parent5e33d3ebb mixed six claimed paths with50 unrelated files; this coordinator preserved that commit and committed only the three residual proof corrections. No application migration or service/browser mutation occurred. Direct SQL fixture capture is not artifact-owner or service proof. Physical blocker observations, exact tenant receipts and all controlled SQLSTATE results are recorded below; observed23001 for RESTRICT and NOT ENFORCED CHECK recreation were confirmed after the earlier oracle failures. The coordinator preflight UUID/text query failure and its read-only retry are retained in this receipt without an invented SQLSTATE.

Canonical requirement coverage remains partial: BT-27a037364398 and BT-801e948e8a67 stay open. Current522-task statuses remain110 checked/412 open. Canonical payload SHA-256: `bcb743b8c238988b7ee53605d0d17389362484dec4d7e1e3a056542e21756758` (UTF-8 JSON between the fences, excluding fence newlines).

```json
{
  "classification": "Current verified",
  "requirements": [
    "BT-27a037364398",
    "BT-801e948e8a67"
  ],
  "backendRevision": "c570327aebaad87030b58b4cafa0ab49ca3e186f",
  "backendParent": "5e33d3ebb2b911941a8ed89e47e53b120dedbf7d",
  "parentBoundary": {
    "externallyCreatedMixedCommit": true,
    "totalFiles": 56,
    "claim48Files": 6,
    "unrelatedExcludedFiles": 50,
    "coordinatorOnlyCommittedThreeResidualCorrections": true
  },
  "run": {
    "scope": "task-artifact",
    "runId": "f8e47ebe465a33f58c6ef1f1",
    "database": "scratch_build_migration_f8e47ebe465a33f58c6ef1f1",
    "startedAt": "2026-10-04T03:04:55.055Z",
    "finishedAt": "2026-10-04T03:09:00.595Z",
    "exitCode": 0,
    "errorCode": null,
    "checks": 89,
    "passed": 89,
    "failed": 0
  },
  "sourceFiles": [
    {
      "path": "backend/src/scripts/approval-revision-migration-proof.mjs",
      "sha256": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
      "lines": 77
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-baseline.mjs",
      "sha256": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
      "lines": 259
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-cases.mjs",
      "sha256": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
      "lines": 286
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
      "sha256": "8d66bbb4503c65bd6e1a6c9ae19520313fcb9a042d0b2a940b3d921ca63fb8bd",
      "lines": 247
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
      "sha256": "cda78f9df9f3eb453fe91c061bffd4341e479c7413a5e6f65826edbf3ebadf2c",
      "lines": 249
    },
    {
      "path": "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs",
      "sha256": "33864d866596a5cb84d13c8ce18dcce4c963249df42d49eec3e6611dc832cd34",
      "lines": 299
    }
  ],
  "preflightFailure": {
    "capturedAt": "2026-10-04T03:04:34.877Z",
    "message": "operator does not exist: text = uuid",
    "sqlstate": null,
    "readOnly": true,
    "applicationWrites": false,
    "source": "coordinator preflight query used an unnecessary UUID cast against text org_id; transaction rolled back and connection closed"
  },
  "preflight": {
    "observedAt": "2026-10-04T03:04:36.360Z",
    "role": "streamline_app",
    "read_only": "on",
    "server_version_num": "180004",
    "scratch_database_count": 0,
    "new_column_count": 0,
    "reserved_approval_count": 0,
    "applicationWrites": false
  },
  "observations": [
    {
      "stage": "plan",
      "database": "scratch_build_migration_f8e47ebe465a33f58c6ef1f1",
      "execute": true,
      "proofScope": "focused-ticket-and-approval-fragments-and-whole-1732-1733-1734",
      "wholeChainVerified": false,
      "applicationRuntimeVerified": false,
      "deployedRlsVerified": false,
      "sourceHashes": {
        "0000_light_vance_astro": "850dc745890a24e85d6b4a79e2c47b35e96219e8b906178ff2a1984a5e09eccd",
        "0374_tenant_guc_helper": "bf571f0a242a09b337f6d2180ab2a812e62211fda39cf48d899dfcb3eae0ac25",
        "0426_build_identity_pks": "e3eab6751fa38e790dac2e874b778b6552de85c1534096effcf15b2a21e8b917",
        "0432_build_schema": "83cd4bed901ae2cbe844fdd849ab0c0c9b12be309e06bf10b9f33ec7989f7439",
        "0648_build_actor_membership_expand": "f16995bafc4db9daa8c7e3f0ff3492cf6327f944825cc4e601230a8a5564d7da",
        "0668_fix_membership_fk_on_delete": "1e525a18ef3f6d580ea1b29c6ea32991a9a47eb07746b030a93ffca705e95fc2",
        "0770_set_null_fk_column_lists": "6f0d4cd80034c047b8d6f44292eac6c4b0b8796452e6efcda98d37c4b472da2d",
        "0917_build_actor_drop": "482c1e02a4a9c8b214b62187354320d593d22260e4c1f2cc42a52d856a6037d6",
        "0945_ar02_build_composite_fks": "8257bf2b642166abaf28f947b1ad463abe2f6e4a8bf06fd36a37f5118c70ccaa",
        "0948_ar02_drop_build_single_fks": "64f504824eb85a211af95feda0aeec4a2f5ea131a2b0a39842488ac809eb2b9b",
        "1732_approval_row_revision": "a4b1eb51194c7a0e81fcb6f6e238c48c5161dbeb848c2b6b3d05de9562707ef1",
        "rollback/1732_approval_row_revision.down": "976df5d24de43708e8856344d01a4c3f1f7a7d5569cab9033a397677c6ac5bd1",
        "0322_recon_phase_c_candidate_keys": "bd6fbfe53f3d7926ef28bf417afc77bdb20ff3cde99dc2487e13797095589268",
        "0416_tickets_soft_delete_and_version": "b639c215e1b58ad5f442b589108e188e72ed7c9c4d617050354bd223f5ec8709",
        "1373_tickets_version_trigger": "681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a",
        "1733_approval_task_artifact": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
        "1734_approval_task_pending_index": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
        "rollback/1733_approval_task_artifact.down": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
        "rollback/1734_approval_task_pending_index.down": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2"
      }
    },
    {
      "stage": "phase",
      "phase": "refusal-baseline",
      "fixtureCapture": "direct-sql",
      "artifactOwnerCaptureVerified": false,
      "wholeChainVerified": false,
      "sequenceAtomic": false
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-official-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-replay-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-official-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-legacy-five-null-preserved",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-replay-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "physical-migration-blocker",
      "officialChild": false,
      "blockerObserved": true,
      "holderExpired": false
    },
    {
      "stage": "case",
      "caseId": "raw-held-lock-timeout",
      "passed": true,
      "expectedSqlstate": "57014",
      "actualSqlstate": "57014"
    },
    {
      "stage": "case",
      "caseId": "raw-held-lock-preserves-prior",
      "passed": true
    },
    {
      "stage": "physical-migration-blocker",
      "officialChild": true,
      "blockerObserved": true,
      "holderExpired": false
    },
    {
      "stage": "case",
      "caseId": "official-held-lock-atomic-refusal",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-held-lock-preserves-prior",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "raw-duplicate-refusal",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "official-duplicate-atomic-refusal",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "duplicate-preserves-prior",
      "passed": true
    },
    {
      "stage": "refusal-phase-receipt",
      "kind": "duplicate",
      "data": {
        "digest": "12f4b86666455f984fbd7b95bdd6ef83",
        "rows": 4
      },
      "catalog": "198fa51d111e46f068d2e7eddf19f772",
      "ledgers": [
        1,
        1,
        0
      ]
    },
    {
      "stage": "measured-heap",
      "bytes": 2523136,
      "refusalThresholdBytes": 1048576
    },
    {
      "stage": "case",
      "caseId": "measured-heap-above-limit",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "raw-heap-refusal",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION",
      "actualReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION"
    },
    {
      "stage": "case",
      "caseId": "official-heap-atomic-refusal",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "heap-preserves-prior",
      "passed": true
    },
    {
      "stage": "refusal-phase-receipt",
      "kind": "heap",
      "data": {
        "digest": "6abce8e1f661071f0e9ae446ed9eb80b",
        "rows": 4002
      },
      "catalog": "198fa51d111e46f068d2e7eddf19f772",
      "ledgers": [
        1,
        1,
        0
      ]
    },
    {
      "stage": "owned-baseline-reset",
      "reason": "delete-does-not-shrink-measured-heap",
      "applicationDdl": false
    },
    {
      "stage": "phase",
      "phase": "small-success-baseline",
      "fixtureCapture": "direct-sql",
      "artifactOwnerCaptureVerified": false,
      "wholeChainVerified": false,
      "sequenceAtomic": false
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-official-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-replay-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-official-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-legacy-five-null-preserved",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-replay-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-whole-1734",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-1734-replay-singleton",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-weak-check",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-timestamp-precision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-digest-collation",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-function-volatility",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-function-source",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-not-enforced",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-index-columns",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-index-null-semantics",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-partial",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-array",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-json-null",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-missing-shape",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-identity",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-version-zero",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-snapshot-project",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-snapshot-version",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-snapshot-id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-non-task",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-version-negative",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-version-overflow",
      "passed": true,
      "expectedSqlstate": "22003",
      "actualSqlstate": "22003"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-digest",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-size",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-unicode-byte-size",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-foreign-ticket",
      "passed": true,
      "expectedSqlstate": "23503",
      "actualSqlstate": "23503"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-missing-ticket",
      "passed": true,
      "expectedSqlstate": "23503",
      "actualSqlstate": "23503"
    },
    {
      "stage": "case",
      "caseId": "canonical-jsonb-byte-boundary",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "minimal-format-forgery-is-sql-allowed",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "same-org-wrong-project-is-sql-allowed",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "immutable-org_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-project_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-entity_type",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-entity_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_ticket_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_version",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_snapshot",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_digest",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_captured_at",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "legacy-null-to-bound-refused",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "status-assignee-mutable-binding-preserved",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "pending-unique-requested",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "pending-unique-pending",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "pending-unique-escalated",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "pending-unique-changes_requested",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "unique-control-0-{\"version\":4}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-1-{\"approver\":2}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-2-{\"status\":\"approved\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-3-{\"status\":\"rejected\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-4-{\"status\":\"cancelled\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-5-{\"deleted\":\"2026-10-04T00:00:00Z\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-6-{\"approver\":null}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-7-{\"approver\":null}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "bound-ticket-hard-delete-refused",
      "passed": true,
      "expectedSqlstate": "23001",
      "actualSqlstate": "23001"
    },
    {
      "stage": "physical-insert-blocker",
      "blockerObserved": true,
      "holderExpired": false
    },
    {
      "stage": "case",
      "caseId": "physical-same-tuple-insert-one-winner",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "transactional-audit-failure",
      "passed": true,
      "expectedSqlstate": "23502",
      "actualSqlstate": "23502"
    },
    {
      "stage": "case",
      "caseId": "audit-and-binding-rolled-back",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "rollback-rollback/1733_approval_task_artifact.down",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW",
      "actualReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW"
    },
    {
      "stage": "case",
      "caseId": "rollback-rollback/1734_approval_task_pending_index.down",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW",
      "actualReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW"
    },
    {
      "stage": "case",
      "caseId": "rollback-catalog-data-ledgers-unchanged",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-write-zero",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-insert-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "missing-tenant-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "app-binding-trigger-disable-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "exact-admin-row-identities",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "app-a-read-only-markers",
      "passed": true
    },
    {
      "stage": "read-only-tenant-receipt",
      "tenant": "a",
      "verified": true,
      "role": "streamline_app",
      "mode": "on",
      "markers": [
        {
          "id": 1,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": null,
          "artifact_version": null,
          "artifact_digest": null,
          "snapshot_digest": null,
          "captured": null,
          "unbound": true
        },
        {
          "id": 3,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "2",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 20,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 2,
          "artifact_digest": "85ab1468fec5ebbcabb352f6ca6b27a3355301deca5c893477e58c554917c2ba",
          "snapshot_digest": "5f03be12d4ef93b0a4b4af9bce4c080f",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 21,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 3,
          "artifact_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "snapshot_digest": "84bc5505f96de5382703acf9d6718df6",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 22,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 4,
          "artifact_version": 1,
          "artifact_digest": "73b6941f38480f5579e061d39673a1f3e15b1176b2d78bedfb74c9c2348de201",
          "snapshot_digest": "c6b934ce2cdd23f04da0c4025b97ff86",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 23,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 28,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 4,
          "artifact_digest": "d372978532e721a664f7324f20d486dc03aa6a1800c9d424ae407c2170dec10b",
          "snapshot_digest": "7785eb84e3f956bf4533b3a82ff11506",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 29,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 30,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 31,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 32,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 33,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 34,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 35,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 36,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 3,
          "artifact_version": 1,
          "artifact_digest": "d3cd16d2e3c968bef5a2f31d1a234f86be48df5e8874db6105f47e842a6b9201",
          "snapshot_digest": "4e43e028c8ecbd4328ca79114444ccff",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        }
      ]
    },
    {
      "stage": "case",
      "caseId": "app-b-read-only-markers",
      "passed": true
    },
    {
      "stage": "read-only-tenant-receipt",
      "tenant": "b",
      "verified": true,
      "role": "streamline_app",
      "mode": "on",
      "markers": [
        {
          "id": 2,
          "org_id": "synthetic-approval-proof-org-b",
          "revision": "1",
          "artifact_ticket_id": null,
          "artifact_version": null,
          "artifact_digest": null,
          "snapshot_digest": null,
          "captured": null,
          "unbound": true
        }
      ]
    },
    {
      "stage": "admin-select-receipt",
      "data": {
        "digest": "55ee7a51cc0fee2c25c93f74b8aac575",
        "rows": 16
      },
      "catalog": "34b205dfac735b9973cd10a3152cbad5",
      "ledgers": [
        1,
        1,
        1
      ],
      "sqlOnly": true,
      "deployedRlsVerified": false,
      "applicationRuntimeVerified": false,
      "wholeChainVerified": false
    },
    {
      "stage": "case",
      "caseId": "final-exact-catalog",
      "passed": true
    },
    {
      "stage": "results",
      "checks": 89,
      "failed": 0,
      "wholeChainVerified": false,
      "applicationRuntimeVerified": false
    },
    {
      "stage": "cleanup",
      "droppedCurrentRunDatabase": true
    }
  ],
  "independentCleanup": {
    "observedAt": "2026-10-04T03:11:03.769Z",
    "role": "streamline_app",
    "read_only": "on",
    "server_version_num": "180004",
    "scratch_database_count": 0,
    "scratch_session_count": 0,
    "new_column_count": 0,
    "reserved_approval_count": 0,
    "applicationWrites": false
  },
  "focusedTests": {
    "command": "node --test src/scripts/__tests__/approval-revision-migration-proof.test.mjs src/scripts/__tests__/approval-artifact-migration-proof.test.mjs src/scripts/__tests__/organization-setup-migration-proof.test.mjs src/scripts/__tests__/portal-migration-proof.test.mjs",
    "exitCode": 0,
    "tests": 99,
    "passed": 99,
    "failed": 0,
    "skipped": 0
  },
  "gates": {
    "exactSixPathLint": 0,
    "exactThreePathDiff": 0,
    "syntax": "six exact files previously passed at the same frozen hashes",
    "productionTypecheck": {
      "command": "pnpm -C backend typecheck",
      "exitCode": 0,
      "observedAt": "2026-10-04T02:02:38.420Z",
      "wallSeconds": 9.3764294,
      "typescriptSourceUnchanged": true,
      "scope": "production TypeScript; operational MJS requires separate focused/syntax/lint checks"
    },
    "independentReviews": "B final source/corrected catalog/commit boundary; C tests and inverse operational corrections CLEAR"
  },
  "scopeLimits": {
    "wholeChainVerified": false,
    "applicationRuntimeVerified": false,
    "deployedRlsVerified": false,
    "artifactOwnerCaptureVerified": false,
    "serviceRbacTenantCacheEventVerified": false,
    "browserMobileVerified": false,
    "deploymentOperationsVerified": false,
    "applicationMigrationsApplied": false,
    "broadRequirementClosed": false
  },
  "remaining": [
    "Approver liveness and requester/permission races",
    "All seven non-task artifact owners",
    "Real service, authorization, PAT, tenant, cache and event proof",
    "Application migration readiness and target application",
    "Matching synthetic browser and mobile proof",
    "Deployment and operations"
  ],
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "checkboxOrStageChanges": 0
  },
  "cleanup": {
    "createdSourceFiles": [
      "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
      "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
      "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs"
    ],
    "deletedFiles": []
  }
}
```

## Task artifact scratch proof checkpoint — 2026-10-04

Classification: Current verified for the exact source checks and bounded scratch observations below; Current unverified for application, browser and release acceptance. Claim48 supports BT-27a037364398 and BT-801e948e8a67 without closing either. The third corrected plan is ready, but has not executed. Source47 remains unchanged and application1732/1733/1734 remains unapplied.

### Failed runs and corrections

- First owned scratch run terminates with23514 after9 passing migration/replay/physical-lock checks. Guarded cleanup and independent application-role READ ONLY observations find no remaining owned database or sessions. A pure synthetic READ ONLY expression proves that the driver serializes a pre-serialized JSONB parameter into a string; text-first parsing yields an object. An installed-driver regression fails before the one-line `::text::jsonb` correction.
- Second owned scratch run completes89 checks:87 pass and2 fail. The named NOT ENFORCED CHECK mutation returns false; no SQLSTATE for that internal failure was exposed. The hard-delete oracle expects23503 but observes23001. Both failures are retained. Independent READ ONLY cleanup again finds no owned database or sessions.
- The corrected named operation reads only the exact admin-only reference CHECK expression and recreates the same CHECK as NOT ENFORCED inside the existing forced-rollback transaction. PostgreSQL limits the ALTER CONSTRAINT attribute form to foreign keys; see [PostgreSQL18 ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html). NOT ENFORCED can also change validation state; no direct system-catalog edit or claim of isolated enforcement is made. The delete oracle now requires exact23001; foreign/missing insert controls still require23503. These are distinct [PostgreSQL error codes](https://www.postgresql.org/docs/18/errcodes-appendix.html).
- C captures the named-operation RED before correction. Final99 focused checks pass; grouping the existing tests retains all earlier assertions. Exact six-file lint, syntax, whitespace and no-comment checks pass. B/C independently verify frozen hashes and the inverse deltas; coordinator reviews the tests. Earlier truthy-manifest/inherited-key/shape regressions and review-led catalog refinements retain their actual chronology.

The second run positively observes physical migration and insert blockers before release with expired-holder false; a2523136-byte heap; binding, UTF-8, immutable identity, uniqueness, audit-transaction rollback, rollback-script refusals and tenant denials; exact READ ONLY markers for15 tenant-A rows and1 tenant-B row. These are direct SQL fixtures, not canonical service capture, HTTP authorization, deployed RLS, cache/event, browser or mobile proof. The remaining liveness inventory recommends membership SHARE before Ticket to avoid a removal lock inversion; it is not an edit reservation. Full eight-owner approvals, application migration/readiness, complete role/PAT/tenant/cache/event matrices, matching frontend and deployment/operations remain open. Full test TypeScript and migration-gate failures recorded under source47 are unchanged.

### Sanitized scratch checkpoint receipt

One sanitized JSON payload is retained in this existing audit document; SHA-256 `ba22dd4cd29d322937ceee842d59d565fea3e4c84a27312ee2708f72e7df8916`. The failed-run events are retained with their original observed results. No credentials, OTPs, links, raw driver diagnostics, extra Markdown or historical evidence are added or removed.

```json
{
  "package": 48,
  "task": "BT-27a037364398",
  "supports": "BT-801e948e8a67",
  "claimRevision": "9d5542d7a40d16325e06b578cc5ab9ffa571145d",
  "parentBackendRevision": "ed55a897d8668f5adfd99136e3e3b05891285254",
  "currentSourceClassification": "Current verified for focused gates and independent source review",
  "applicationClassification": "Current unverified; no application writes or DDL",
  "frozenSources": [
    {
      "path": "backend/src/scripts/approval-revision-migration-proof.mjs",
      "sha256": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
      "lines": 77
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-baseline.mjs",
      "sha256": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
      "lines": 259
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-cases.mjs",
      "sha256": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
      "lines": 286
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
      "sha256": "8d66bbb4503c65bd6e1a6c9ae19520313fcb9a042d0b2a940b3d921ca63fb8bd",
      "lines": 247
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
      "sha256": "cda78f9df9f3eb453fe91c061bffd4341e479c7413a5e6f65826edbf3ebadf2c",
      "lines": 249
    },
    {
      "path": "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs",
      "sha256": "33864d866596a5cb84d13c8ce18dcce4c963249df42d49eec3e6611dc832cd34",
      "lines": 299
    }
  ],
  "gates": {
    "focusedChecks": 99,
    "focusedPassed": 99,
    "eslintExit": 0,
    "syntax": [
      {
        "path": "backend/src/scripts/approval-revision-migration-proof.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-revision-proof-baseline.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-revision-proof-cases.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs",
        "exit": 0
      }
    ],
    "diffExit": 0,
    "sourceComments": 0,
    "productionTypecheck": {
      "command": "pnpm -C backend typecheck",
      "exit": 0,
      "observedAt": "2026-10-04T02:02:38.420Z",
      "mjsTypechecked": false
    }
  },
  "failedRuns": [
    {
      "database": "scratch_build_migration_0b0d2a1acf93e471db19c583",
      "startedAt": "2026-10-04T02:25:32.415Z",
      "finishedAt": "2026-10-04T02:26:47.479Z",
      "exit": 1,
      "events": [
        {
          "stage": "plan",
          "database": "scratch_build_migration_0b0d2a1acf93e471db19c583",
          "execute": true,
          "proofScope": "focused-ticket-and-approval-fragments-and-whole-1732-1733-1734",
          "wholeChainVerified": false,
          "applicationRuntimeVerified": false,
          "deployedRlsVerified": false,
          "sourceHashes": {
            "0000_light_vance_astro": "850dc745890a24e85d6b4a79e2c47b35e96219e8b906178ff2a1984a5e09eccd",
            "0374_tenant_guc_helper": "bf571f0a242a09b337f6d2180ab2a812e62211fda39cf48d899dfcb3eae0ac25",
            "0426_build_identity_pks": "e3eab6751fa38e790dac2e874b778b6552de85c1534096effcf15b2a21e8b917",
            "0432_build_schema": "83cd4bed901ae2cbe844fdd849ab0c0c9b12be309e06bf10b9f33ec7989f7439",
            "0648_build_actor_membership_expand": "f16995bafc4db9daa8c7e3f0ff3492cf6327f944825cc4e601230a8a5564d7da",
            "0668_fix_membership_fk_on_delete": "1e525a18ef3f6d580ea1b29c6ea32991a9a47eb07746b030a93ffca705e95fc2",
            "0770_set_null_fk_column_lists": "6f0d4cd80034c047b8d6f44292eac6c4b0b8796452e6efcda98d37c4b472da2d",
            "0917_build_actor_drop": "482c1e02a4a9c8b214b62187354320d593d22260e4c1f2cc42a52d856a6037d6",
            "0945_ar02_build_composite_fks": "8257bf2b642166abaf28f947b1ad463abe2f6e4a8bf06fd36a37f5118c70ccaa",
            "0948_ar02_drop_build_single_fks": "64f504824eb85a211af95feda0aeec4a2f5ea131a2b0a39842488ac809eb2b9b",
            "1732_approval_row_revision": "a4b1eb51194c7a0e81fcb6f6e238c48c5161dbeb848c2b6b3d05de9562707ef1",
            "rollback/1732_approval_row_revision.down": "976df5d24de43708e8856344d01a4c3f1f7a7d5569cab9033a397677c6ac5bd1",
            "0322_recon_phase_c_candidate_keys": "bd6fbfe53f3d7926ef28bf417afc77bdb20ff3cde99dc2487e13797095589268",
            "0416_tickets_soft_delete_and_version": "b639c215e1b58ad5f442b589108e188e72ed7c9c4d617050354bd223f5ec8709",
            "1373_tickets_version_trigger": "681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a",
            "1733_approval_task_artifact": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
            "1734_approval_task_pending_index": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
            "rollback/1733_approval_task_artifact.down": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
            "rollback/1734_approval_task_pending_index.down": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2"
          }
        },
        {
          "stage": "phase",
          "phase": "refusal-baseline",
          "fixtureCapture": "direct-sql",
          "artifactOwnerCaptureVerified": false,
          "wholeChainVerified": false,
          "sequenceAtomic": false
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-legacy-five-null-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": false,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-timeout",
          "passed": true,
          "expectedSqlstate": "57014",
          "actualSqlstate": "57014"
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": true,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "refused-or-failed",
          "failure": "23514",
          "cleanupVerified": true,
          "manualInspectionRequired": false
        }
      ],
      "sourceHashes": {
        "backend/src/scripts/approval-revision-migration-proof.mjs": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
        "backend/src/scripts/lib/approval-revision-proof-baseline.mjs": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
        "backend/src/scripts/lib/approval-revision-proof-cases.mjs": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
        "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs": "fe9d102163ae4b5591c95e8aac02c3e61a0e5fc04c3d8ac3acaac98ab9f0e2a8",
        "backend/src/scripts/lib/approval-artifact-proof-cases.mjs": "9129859a0a279e31b2bc5dfb504f191de18c136609bc6e1ba392265ce4b6f1e7",
        "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs": "50edf21cf4e1c28fbff0f9ee209a1a696921b844829c0749f73c730dc4a455c8"
      },
      "independentReadOnlyCleanup": {
        "role": "streamline_app",
        "read_only": "on",
        "server_version_num": "180004",
        "scratch_database_count": 0,
        "scratch_session_count": 0,
        "new_column_count": 0,
        "reserved_approval_count": 0,
        "inferred_jsonb_type": "string",
        "explicit_text_jsonb_type": "object",
        "database": "scratch_build_migration_0b0d2a1acf93e471db19c583",
        "syntheticLiteralOnly": true,
        "applicationWrites": false,
        "observedAt": "2026-10-04T02:30:36.503Z"
      }
    },
    {
      "database": "scratch_build_migration_c531da14f7a30ad2e1c40a11",
      "startedAt": "2026-10-04T02:34:25.314Z",
      "finishedAt": "2026-10-04T02:38:26.225Z",
      "exit": 1,
      "events": [
        {
          "stage": "plan",
          "database": "scratch_build_migration_c531da14f7a30ad2e1c40a11",
          "execute": true,
          "proofScope": "focused-ticket-and-approval-fragments-and-whole-1732-1733-1734",
          "wholeChainVerified": false,
          "applicationRuntimeVerified": false,
          "deployedRlsVerified": false,
          "sourceHashes": {
            "0000_light_vance_astro": "850dc745890a24e85d6b4a79e2c47b35e96219e8b906178ff2a1984a5e09eccd",
            "0374_tenant_guc_helper": "bf571f0a242a09b337f6d2180ab2a812e62211fda39cf48d899dfcb3eae0ac25",
            "0426_build_identity_pks": "e3eab6751fa38e790dac2e874b778b6552de85c1534096effcf15b2a21e8b917",
            "0432_build_schema": "83cd4bed901ae2cbe844fdd849ab0c0c9b12be309e06bf10b9f33ec7989f7439",
            "0648_build_actor_membership_expand": "f16995bafc4db9daa8c7e3f0ff3492cf6327f944825cc4e601230a8a5564d7da",
            "0668_fix_membership_fk_on_delete": "1e525a18ef3f6d580ea1b29c6ea32991a9a47eb07746b030a93ffca705e95fc2",
            "0770_set_null_fk_column_lists": "6f0d4cd80034c047b8d6f44292eac6c4b0b8796452e6efcda98d37c4b472da2d",
            "0917_build_actor_drop": "482c1e02a4a9c8b214b62187354320d593d22260e4c1f2cc42a52d856a6037d6",
            "0945_ar02_build_composite_fks": "8257bf2b642166abaf28f947b1ad463abe2f6e4a8bf06fd36a37f5118c70ccaa",
            "0948_ar02_drop_build_single_fks": "64f504824eb85a211af95feda0aeec4a2f5ea131a2b0a39842488ac809eb2b9b",
            "1732_approval_row_revision": "a4b1eb51194c7a0e81fcb6f6e238c48c5161dbeb848c2b6b3d05de9562707ef1",
            "rollback/1732_approval_row_revision.down": "976df5d24de43708e8856344d01a4c3f1f7a7d5569cab9033a397677c6ac5bd1",
            "0322_recon_phase_c_candidate_keys": "bd6fbfe53f3d7926ef28bf417afc77bdb20ff3cde99dc2487e13797095589268",
            "0416_tickets_soft_delete_and_version": "b639c215e1b58ad5f442b589108e188e72ed7c9c4d617050354bd223f5ec8709",
            "1373_tickets_version_trigger": "681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a",
            "1733_approval_task_artifact": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
            "1734_approval_task_pending_index": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
            "rollback/1733_approval_task_artifact.down": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
            "rollback/1734_approval_task_pending_index.down": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2"
          }
        },
        {
          "stage": "phase",
          "phase": "refusal-baseline",
          "fixtureCapture": "direct-sql",
          "artifactOwnerCaptureVerified": false,
          "wholeChainVerified": false,
          "sequenceAtomic": false
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-legacy-five-null-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": false,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-timeout",
          "passed": true,
          "expectedSqlstate": "57014",
          "actualSqlstate": "57014"
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": true,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "raw-duplicate-refusal",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "official-duplicate-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "duplicate-preserves-prior",
          "passed": true
        },
        {
          "stage": "refusal-phase-receipt",
          "kind": "duplicate",
          "data": {
            "digest": "8e3cb841d86406701df39ca5f52369ca",
            "rows": 4
          },
          "catalog": "973e8514aaaa40b5a2162e0df28247c1",
          "ledgers": [
            1,
            1,
            0
          ]
        },
        {
          "stage": "measured-heap",
          "bytes": 2523136,
          "refusalThresholdBytes": 1048576
        },
        {
          "stage": "case",
          "caseId": "measured-heap-above-limit",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "raw-heap-refusal",
          "passed": true,
          "expectedSqlstate": "P0001",
          "actualSqlstate": "P0001",
          "expectedReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION",
          "actualReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION"
        },
        {
          "stage": "case",
          "caseId": "official-heap-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "heap-preserves-prior",
          "passed": true
        },
        {
          "stage": "refusal-phase-receipt",
          "kind": "heap",
          "data": {
            "digest": "c4a8d69553b78189e3df1ba139e82227",
            "rows": 4002
          },
          "catalog": "973e8514aaaa40b5a2162e0df28247c1",
          "ledgers": [
            1,
            1,
            0
          ]
        },
        {
          "stage": "owned-baseline-reset",
          "reason": "delete-does-not-shrink-measured-heap",
          "applicationDdl": false
        },
        {
          "stage": "phase",
          "phase": "small-success-baseline",
          "fixtureCapture": "direct-sql",
          "artifactOwnerCaptureVerified": false,
          "wholeChainVerified": false,
          "sequenceAtomic": false
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-official-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-replay-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-official-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-legacy-five-null-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-replay-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-whole-1734",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-1734-replay-singleton",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-weak-check",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-timestamp-precision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-digest-collation",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-function-volatility",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-function-source",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-not-enforced",
          "passed": false,
          "failure": "PROOF_ASSERTION_FAILED"
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-index-columns",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-index-null-semantics",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-partial",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-array",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-json-null",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-missing-shape",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-identity",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-version-zero",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-snapshot-project",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-snapshot-version",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-snapshot-id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-non-task",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-version-negative",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-version-overflow",
          "passed": true,
          "expectedSqlstate": "22003",
          "actualSqlstate": "22003"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-digest",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-size",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-unicode-byte-size",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-foreign-ticket",
          "passed": true,
          "expectedSqlstate": "23503",
          "actualSqlstate": "23503"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-missing-ticket",
          "passed": true,
          "expectedSqlstate": "23503",
          "actualSqlstate": "23503"
        },
        {
          "stage": "case",
          "caseId": "canonical-jsonb-byte-boundary",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "minimal-format-forgery-is-sql-allowed",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "same-org-wrong-project-is-sql-allowed",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "immutable-org_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-project_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-entity_type",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-entity_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_ticket_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_version",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_snapshot",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_digest",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_captured_at",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "legacy-null-to-bound-refused",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "status-assignee-mutable-binding-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "pending-unique-requested",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "pending-unique-pending",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "pending-unique-escalated",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "pending-unique-changes_requested",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "unique-control-0-{\"version\":4}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-1-{\"approver\":2}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-2-{\"status\":\"approved\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-3-{\"status\":\"rejected\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-4-{\"status\":\"cancelled\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-5-{\"deleted\":\"2026-10-04T00:00:00Z\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-6-{\"approver\":null}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-7-{\"approver\":null}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "bound-ticket-hard-delete-refused",
          "passed": false,
          "expectedSqlstate": "23503",
          "actualSqlstate": "23001"
        },
        {
          "stage": "physical-insert-blocker",
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "physical-same-tuple-insert-one-winner",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "transactional-audit-failure",
          "passed": true,
          "expectedSqlstate": "23502",
          "actualSqlstate": "23502"
        },
        {
          "stage": "case",
          "caseId": "audit-and-binding-rolled-back",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "rollback-rollback/1733_approval_task_artifact.down",
          "passed": true,
          "expectedSqlstate": "P0001",
          "actualSqlstate": "P0001",
          "expectedReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW",
          "actualReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW"
        },
        {
          "stage": "case",
          "caseId": "rollback-rollback/1734_approval_task_pending_index.down",
          "passed": true,
          "expectedSqlstate": "P0001",
          "actualSqlstate": "P0001",
          "expectedReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW",
          "actualReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW"
        },
        {
          "stage": "case",
          "caseId": "rollback-catalog-data-ledgers-unchanged",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "foreign-tenant-write-zero",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "foreign-tenant-insert-denied",
          "passed": true,
          "expectedSqlstate": "42501",
          "actualSqlstate": "42501"
        },
        {
          "stage": "case",
          "caseId": "missing-tenant-denied",
          "passed": true,
          "expectedSqlstate": "42501",
          "actualSqlstate": "42501"
        },
        {
          "stage": "case",
          "caseId": "app-binding-trigger-disable-denied",
          "passed": true,
          "expectedSqlstate": "42501",
          "actualSqlstate": "42501"
        },
        {
          "stage": "case",
          "caseId": "exact-admin-row-identities",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "app-a-read-only-markers",
          "passed": true
        },
        {
          "stage": "read-only-tenant-receipt",
          "tenant": "a",
          "verified": true,
          "role": "streamline_app",
          "mode": "on",
          "markers": [
            {
              "id": 1,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": null,
              "artifact_version": null,
              "artifact_digest": null,
              "snapshot_digest": null,
              "captured": null,
              "unbound": true
            },
            {
              "id": 3,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "2",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 20,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 2,
              "artifact_digest": "85ab1468fec5ebbcabb352f6ca6b27a3355301deca5c893477e58c554917c2ba",
              "snapshot_digest": "5f03be12d4ef93b0a4b4af9bce4c080f",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 21,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 3,
              "artifact_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "snapshot_digest": "84bc5505f96de5382703acf9d6718df6",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 22,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 4,
              "artifact_version": 1,
              "artifact_digest": "73b6941f38480f5579e061d39673a1f3e15b1176b2d78bedfb74c9c2348de201",
              "snapshot_digest": "c6b934ce2cdd23f04da0c4025b97ff86",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 23,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 28,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 4,
              "artifact_digest": "d372978532e721a664f7324f20d486dc03aa6a1800c9d424ae407c2170dec10b",
              "snapshot_digest": "7785eb84e3f956bf4533b3a82ff11506",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 29,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 30,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 31,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 32,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 33,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 34,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 35,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 36,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 3,
              "artifact_version": 1,
              "artifact_digest": "d3cd16d2e3c968bef5a2f31d1a234f86be48df5e8874db6105f47e842a6b9201",
              "snapshot_digest": "4e43e028c8ecbd4328ca79114444ccff",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            }
          ]
        },
        {
          "stage": "case",
          "caseId": "app-b-read-only-markers",
          "passed": true
        },
        {
          "stage": "read-only-tenant-receipt",
          "tenant": "b",
          "verified": true,
          "role": "streamline_app",
          "mode": "on",
          "markers": [
            {
              "id": 2,
              "org_id": "synthetic-approval-proof-org-b",
              "revision": "1",
              "artifact_ticket_id": null,
              "artifact_version": null,
              "artifact_digest": null,
              "snapshot_digest": null,
              "captured": null,
              "unbound": true
            }
          ]
        },
        {
          "stage": "admin-select-receipt",
          "data": {
            "digest": "11f51626c8127dc5db6e9dd2932b8604",
            "rows": 16
          },
          "catalog": "3b4a37f8abd88dcc28e791267632837a",
          "ledgers": [
            1,
            1,
            1
          ],
          "sqlOnly": true,
          "deployedRlsVerified": false,
          "applicationRuntimeVerified": false,
          "wholeChainVerified": false
        },
        {
          "stage": "case",
          "caseId": "final-exact-catalog",
          "passed": true
        },
        {
          "stage": "results",
          "checks": 89,
          "failed": 2,
          "wholeChainVerified": false,
          "applicationRuntimeVerified": false
        },
        {
          "stage": "cleanup",
          "droppedCurrentRunDatabase": true
        }
      ],
      "sourceHashes": {
        "backend/src/scripts/approval-revision-migration-proof.mjs": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
        "backend/src/scripts/lib/approval-revision-proof-baseline.mjs": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
        "backend/src/scripts/lib/approval-revision-proof-cases.mjs": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
        "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs": "62c68b2d324a4b53e9e3caf0907f91af8e4618e4c742d969d0542c08d55b2853",
        "backend/src/scripts/lib/approval-artifact-proof-cases.mjs": "9129859a0a279e31b2bc5dfb504f191de18c136609bc6e1ba392265ce4b6f1e7",
        "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs": "5a44666b9dad1eadeecc056856edfc47985070f4586b817cc592fe3240199882"
      },
      "independentReadOnlyCleanup": {
        "role": "streamline_app",
        "read_only": "on",
        "scratch_database_count": 0,
        "scratch_session_count": 0,
        "database": "scratch_build_migration_c531da14f7a30ad2e1c40a11",
        "observedAt": "2026-10-04T02:39:07.325Z"
      }
    }
  ],
  "thirdPlan": {
    "database": "scratch_build_migration_f8e47ebe465a33f58c6ef1f1",
    "exit": 0,
    "execute": false,
    "sqlPinsUnchanged": true,
    "started": false
  },
  "limitations": {
    "applicationRuntimeVerified": false,
    "deployedRlsVerified": false,
    "wholeChainVerified": false,
    "browserVerified": false,
    "mobileVerified": false,
    "deploymentVerified": false,
    "operationsVerified": false,
    "fullTaskStagesClosed": false,
    "todoCheckboxChanged": false
  },
  "counts": {
    "total": 522,
    "checked": 110,
    "open": 412
  }
}
```

## Ticket scalar approval artifact source — 2026-10-04

Selected requirement: BT-27a037364398; supporting BT-801e948e8a67. [Exclusive claim47](../implementation/WORK-CLAIMS.md#bt-27a037364398--ticket-scalar-artifact-binding-47) was committed at210bb1e88; migration runner correction at7e727dd61. Source is committed at backend `ed55a897d` (28 changed paths) and frontend `a4bc33699` (12 changed paths). Classification: Current verified for the exact source, focused gates, independent reviews and read-only observation below; Current unverified for full application/RBAC/persistence/browser/release behavior. No broad task or D/I/T/R/B/L stage advances.

### Adopted behavior and review corrections

- New task requests strictly require expectedArtifactVersion. The server captures14 bounded Ticket scalar fields under the canonical Ticket lock, refuses more than131072 UTF-8 bytes of PostgreSQL JSONB text without truncation, and hashes that same canonical text. Approval row revision stays separate from Ticket artifact version. Seven other entity families keep their existing unbound behavior; their immutable-artifact acceptance remains open.
- GET detail alone exposes current/stale snapshot receipts after current canonical Ticket authorization; restricted/unavailable/unbound contains state only. Lists, mutation responses, counts and requested events remain metadata-only. Legacy unbound tasks can be read/cancelled/deleted, but cannot be decided. Private stored-binding validation checks schema/identity/version/hash; no client snapshot or authority is accepted.
- Decision locks Ticket then approval, rechecks current approval authority/revision/immutable binding and current Ticket access after both waits, and compares the current Ticket version before CAS/critical audit. Creation checks the request key before work and rechecks request authority/project write policy after its Ticket-lock wait. Approver ACTIVE resolution after that wait is separately open; no recipient membership lock was added.
- UI captures an explicit selected version and retains it across background refresh;409 retains input and requires explicit reselection/review. Latest authorized state/digest/version fences captured content and submission, including fresh200 restricted/unavailable responses. Mutation metadata cannot hydrate GET detail. Reuse existing components, neutral selected styling and SanitizedHtml; captured descriptions use a bounded semantic HTML allowlist removing SVG/CSS/media resource constructs while retaining safe formatting/explicit links.
- Meaningful initial REDs: assigned task decision without canonical Ticket read1; fresh200 content/selected-version UI11; later approval-lock scope revocation1; creation project archive/request-key loss2; actual shared sanitizer SVG/CSS regression1. Each was reproduced before its domain correction. These are model/jsdom evidence, not physical PostgreSQL or browser proof.

### Gates, contracts and failed checks

Final backend C gates:11 suites/192 tests, exact12 source and13 test lint, diff checks. Coordinator final frontend run:11 suites/203 tests; exact11 lint/diff pass. Both final scoped TypeScript configurations (backend32/frontend29 includes,8GB) and both production TypeScript gates pass. Initial owned literal/generated-union typing errors were repaired; the default4GB scoped backend attempt exhausted heap before the8GB pass. C independently reviews production/SQL/generated/UI; A independently reviews the final UI, including the sanitizer and named-handler fixes; coordinator reviews backend test preservation/integration and verifies all44 frozen file hashes and44 outer/47 backend unrelated dirty-file hashes. No authored source comment or live Ticket comment was added.

Official generators alone produced OpenAPI SHA `54cfc6e2bc1a7ba5a8f30b055aeffa7ba814038500637da40bab0bbe6fc60a82`:4107 operations/exposure stamps,4092 Zod contracts,0 unconvertible findings. Only POST `/build/{projectId}/approvals` requestBody and GET `/build/{projectId}/approvals/{approvalId}` response change. Task version is required in its strict branch; other7 branches forbid it. Mandatory headers/keys/bodies remain authoritative. OpenAPI self-test and source freshness,6 vendor self-tests plus byte parity,93 Build self-tests plus fresh390-schema/311-operation generation checks pass. No generated file was edited by hand.

Full gate failures remain explicit: fresh backend test TypeScript10GB exhausts heap (child134/pnpm1); fresh frontend full specs fail24 diagnostics in six unowned Calendar/Chat/Wiki/KB/Mail paths. The initial controller-E2E invocation used the unit config and found no tests; the corrected official test:e2e command is refused by the disposable-database guard before0 tests. No guard or baseline is widened. Existing React act warning at approvals.ts123 and Edge Runtime type-generation warning remain; no clean-console or browser claim. Migration discipline36/rollback9 self-tests pass; real discipline initially includes1734 CONCURRENTLY, then reports15 existing findings after correction; real rollback reports13 existing findings, with no1733/1734 finding. Unchanged guarded revision/organization/portal proof tests pass86; that rerun executes no PostgreSQL artifact proof.

Exact commands: `pnpm -C backend exec jest --runInBand --runTestsByPath` with the eleven claimed specs excluding the fixture/controller E2E; `pnpm -C frontend exec jest --runInBand --runTestsByPath` with the eleven approval/form/hook suites. Exact claimed ESLint paths; `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p .scratch/tsconfig-approval-43.json` in each package; `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`; `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs`; `pnpm -C backend openapi:generate` and `pnpm -C backend openapi:check`; `pnpm -C frontend generate:build-contracts`, `pnpm -C frontend check:build-contracts` and `pnpm -C frontend check:contract-vendor`, with the named self-tests. Official controller command: `pnpm -C backend test:e2e --runInBand --runTestsByPath src/modules/build/approvals/approvals.controller.e2e-spec.ts`.

### SQL and runtime boundary

Draft1733 adds five nullable binding fields, all-or-none/identity/version/size/digest-format checks, tenant Ticket FK and immutable identity/binding trigger. SQL does not prove actual content hash provenance, all14 scalar validation, current Ticket project/read authority or approver liveness; canonical API owners enforce their own source boundaries. Draft1734 creates two regular indexes transactionally under5s SHARE lock/statement limits and refuses a measured heap above1048576 bytes with APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION. Conditional large-target online preparation is a separately reviewed operator package. Both down scripts refuse destructive rollback with exact controlled reasons; rollback/recovery remains open. Earlier concurrent construction is explicitly superseded because the standard migrator wraps transactions.

Application-role READ ONLY observation below proves revision and all five artifact columns absent and0 approvals in reserved project54. No application approval write/DDL, artifact scratch execution, browser/mobile or deployed operation occurs in47. Application1732/1733/1734 and Portal1730/1731 remain unapplied. Matching local frontend1002 authorization remains pending; deployed-API frontend1000 is read-only and the prior runner cannot prove47. Earlier proof45 SQL cases remain separate. Planned follow-up: reviewed opt-in guarded1733/1734 scratch proof, actual service/role/PAT/tenant/recipient-liveness/physical lock/cache/event proof, queue/sheet/filter/history/mobile acceptance, seven other artifact owners and deployment/operations.

### Sanitized source and gate receipt

The following JSON is retained once in this existing audit file. SHA-256 of its exact JSON payload: `d58f53d8f52a2e4d3774ea3c6d97b2c03dba8fb2a53406be33a921ecec3907f2`. Source hashes describe working bytes at final freeze, not physical runtime proof.

```json
{
  "package": 47,
  "task": "BT-27a037364398",
  "supports": "BT-801e948e8a67",
  "classification": "Current verified for bounded source and named gates; Current unverified for complete runtime and release",
  "backendRevision": "ed55a897d8668f5adfd99136e3e3b05891285254",
  "frontendRevision": "a4bc33699345f912c449d2406115f8a09b309e6b",
  "sourceHashes": {
    "backend/src/db/schema/build/approvals.ts": "a7210594e4c9c2984a7e487b502165140575de139f867e00ac001d1a483bca98",
    "backend/src/modules/build/core/tickets/projects-tickets-detail.service.ts": "8dfdeee6383f0ee6caaad2002b9cc5744a45b3d40808017cd135ce15f6b88545",
    "backend/src/modules/build/core/dto/ticket.schemas.ts": "0e6f8b88c2a35ca2f15b779fcc16ca8e1ff20978454e3ba264e6fbeb5f2b7087",
    "backend/src/modules/build/core/projects.module.ts": "26dc0a50dd2d96a8b54291e13aed4941bf14b851e56c41a91139f736088bcfab",
    "backend/src/modules/build/approvals/build-approvals.module.ts": "7d401b1f4e9c29053e268ace4e6d17844f73f46f8d3770c73d1ddb188b2cc033",
    "backend/src/modules/build/approvals/approvals.service.ts": "6590a7248b4ecc2accf6eef3ba4e63cb9c0c1eb13bfa98d2bd6a483686143bd3",
    "backend/src/modules/build/approvals/approval-lookup.ts": "d879b83cab13f76c3e0f12319bf1a305a3f06b538175155706b5d79353fb217f",
    "backend/src/modules/build/approvals/approvals-read.service.ts": "6242c4a1a5cecb79a40c418b78ecb2ee215ae62c2621f4bfd8e9db1ce2bcdc88",
    "backend/src/modules/build/approvals/core/approval-commands.service.ts": "71aaefb0accffdabe29c411bc646b50bd4c9762c28c317d992874434c2e07c33",
    "backend/src/modules/build/approvals/approvals.controller.ts": "bbb582eb75f3292d8eaa5e0ccd9e926445f007725c52cf0fa97d88986828589b",
    "backend/src/modules/build/approvals/dto/approvals.schemas.ts": "e329f53efbf9a3898d152886a109191700f21402998b1838e8dda90749b03bec",
    "backend/src/modules/build/approvals/dto/approvals-response.schemas.ts": "4fdb6e9b01f3b873ecf0bbcbfef1f228062280956598195796446d10644c1b4e",
    "backend/src/modules/build/approvals/__tests__/approval-task-artifact.spec.ts": "233d1dd3e6cd8b70fbe9807d4bb194b87462b814af65e81158a2a9b5f64586c7",
    "backend/src/modules/build/core/tickets/projects-tickets-detail-revocation.spec.ts": "32a2b333d1b57fff87090f69d09737d4f9a63d1f14cdc35157e25b781bf3ce08",
    "backend/src/modules/build/approvals/__tests__/approval-lifecycle-concurrency.fixture.ts": "ad3e34627beddac5b30b868577be4c5faab7bc70fe40492e2ecb3a1c00eb603e",
    "backend/src/modules/build/approvals/__tests__/approval-lifecycle-concurrency.spec.ts": "d22e305777eb67ef401e7678bed32ff6edc2e04fd860bdaf2cc5658b713ac591",
    "backend/src/modules/build/approvals/__tests__/approval-lifecycle-schema.spec.ts": "65cd4f825a459afae8ca8a6e4262c24cca0299cb9ac17a7af6deb35265ba4a8b",
    "backend/src/modules/build/approvals/__tests__/approval-detail-access.spec.ts": "a8f0307cd2f717fed25304ee56d4f610f1875068b1e8c008b8a55cbc2b75808a",
    "backend/src/modules/build/approvals/approvals.service.spec.ts": "9559c62f158f5e5e00d2dba8cf3a1ca898ac7650dec0deb6e1b5f37f37b7458f",
    "backend/src/modules/build/approvals/approvals-by-id-project-access.spec.ts": "cae5067b10950a4583d20daaa9eb78a5514847768c90bfbc086e6fc6b9425745",
    "backend/src/modules/build/approvals/approvals.controller.e2e-spec.ts": "9c12a31d89a9847664a3a4a992d6e36855b471cc95b821f7b30c9bcff14af63d",
    "backend/src/modules/build/approvals/approvals-read-tenant-isolation.spec.ts": "396bb55e0d6462af44b9e8e6186bf1e2d6263c91900e3edee1b92add3ff98e76",
    "backend/src/modules/build/approvals/build-approval-requested-emit.spec.ts": "a9d70c1d4a8ed1007a062d6e9e977b07e5b171fa83b0d016469a488aa4d0af3e",
    "backend/src/modules/build/approvals/approvals-approver-filter.spec.ts": "aa01480dc836018662f7bd09681d23ce4638a0a1954f82267df05ba7fa1c8dba",
    "backend/src/modules/build/approvals/build-inbox-count.spec.ts": "dc5f678c32ebd6b1d61012c43d2b2878002b2fd8c4cf136eaa2bc246aba9b238",
    "backend/migrations/1733_approval_task_artifact.sql": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
    "backend/migrations/rollback/1733_approval_task_artifact.down.sql": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
    "backend/migrations/1734_approval_task_pending_index.sql": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
    "backend/migrations/rollback/1734_approval_task_pending_index.down.sql": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2",
    "backend/migrations/meta/_journal.json": "3a96eb0934a3475c42c6d50270df5fd61949e2b93dd43fedcdeebdcdbb0bea05",
    "backend/openapi.json": "54cfc6e2bc1a7ba5a8f30b055aeffa7ba814038500637da40bab0bbe6fc60a82",
    "frontend/types/projects/approvals.ts": "ca9b428a71c57e80dfb60602a005e15e55f1a05d331f2eb700db0a54f3bf15e0",
    "frontend/hooks/api/build/approvals.ts": "d3f90f34c4f37a5818027a4b0df449df4e3cab28d9690c90c2ea98fb46231570",
    "frontend/hooks/api/build/approvals-schema.ts": "c9f317788f83652d00031b20d2fa0a14ecb8c76990fe02aa0f7e6b3f80f5a9db",
    "frontend/features/build/approvals/request-approval-sheet.tsx": "0c644f053aada7fc50f2bd02d36b7a63424d52c66937658a055fced845b479a3",
    "frontend/features/build/approvals/decide-dialog.tsx": "f63ab58c8bf96543d5f6e323c2e264e61973612649ba652a3265060f6b48a1e5",
    "frontend/features/build/approvals/project-approvals-page.tsx": "31e70e811804093036119fab63a5849776e49f478173473bded80efca4b49030",
    "frontend/features/build/approvals/request-approval-sheet.test.tsx": "83276d3131eb2682859380ef8a3d1adc7321b515858d4d6ef70cbc4352b04943",
    "frontend/features/build/approvals/decide-dialog.pending-close.test.tsx": "cf81073e36b206e61378ba31629775ba10f3cffd611e6568a27d2be221e57013",
    "frontend/features/build/approvals/__tests__/approval-decision-conflict.spec.tsx": "711ffb19ef04d243205d476f3a5e541d3577ba99d05631a571e213f9104dc27b",
    "frontend/hooks/api/build/__tests__/approval-revision-mutations.spec.tsx": "0482e0e4a07e7e4d62bb09ee0e047a12ac14a6f57b7cc4458100bbee7df5b77d",
    "frontend/features/build/approvals/__tests__/approval-ticket-artifact-request.spec.tsx": "bb59a2a8e33f8350cb007c4f7e99e8df193a2f71a8b6959d5db846f3f0461a74",
    "frontend/contracts/openapi.json": "54cfc6e2bc1a7ba5a8f30b055aeffa7ba814038500637da40bab0bbe6fc60a82",
    "frontend/contracts/build-contracts.generated.ts": "0b986f732c34fedad9b9ca214bca2628651c0d081ec44dc580a36df6dec5a8fc"
  },
  "focused": {
    "backend": {
      "suites": 11,
      "tests": 192
    },
    "frontend": {
      "suites": 11,
      "tests": 203
    }
  },
  "passedGates": [
    "exact backend12 source and13 test lint",
    "exact frontend11 lint",
    "scoped backend32 paths8GB",
    "scoped frontend29 paths8GB",
    "backend production TypeScript",
    "frontend production TypeScript",
    "official OpenAPI source freshness4107operations4092Zod",
    "byte vendor6 selftests",
    "Build freshness390schemas311operations93 selftests",
    "migration discipline36 selftests",
    "rollback9 selftests",
    "unchanged guarded proof86 safety tests",
    "independent frozen backend/frontend/SQL/generated/test reviews",
    "exact-file staged diff checks",
    "zero added authored source comments"
  ],
  "failedGates": [
    {
      "gate": "initial scoped backend TypeScript",
      "reason": "owned test literal widening; repaired before final8GB pass"
    },
    {
      "gate": "default4GB scoped backend TypeScript",
      "reason": "heap exhaustion; final8GB scoped check passed"
    },
    {
      "gate": "initial scoped frontend TypeScript",
      "reason": "owned generated-union expected-body typing; repaired before final pass"
    },
    {
      "gate": "full backend test TypeScript10GB",
      "reason": "heap exhaustion; child134/pnpm1"
    },
    {
      "gate": "full frontend test TypeScript",
      "reason": "24 diagnostics across six unowned Calendar/Chat/Wiki/KB/Mail paths; tsc2/pnpm1"
    },
    {
      "gate": "migration discipline",
      "reason": "15 existing findings; no1733/1734 finding after compatibility correction"
    },
    {
      "gate": "migration rollback",
      "reason": "13 existing findings; no1733/1734 finding"
    },
    {
      "gate": "unit Jest invocation of controller E2E",
      "reason": "wrong config excludes E2E; no tests found; no proof"
    },
    {
      "gate": "official controller E2E",
      "reason": "disposable-database guard refused before0 tests; no bypass"
    }
  ],
  "warnings": [
    "unchanged React act warning at frontend/hooks/api/build/approvals.ts123",
    "frontend route type generation emits existing Edge Runtime deprecation warning"
  ],
  "readOnlyApplicationReceipt": {
    "role": "streamline_app",
    "read_only": "on",
    "new_column_count": 0,
    "reserved_approval_count": 0,
    "observedAt": "2026-10-04T01:22:00.906Z"
  },
  "applicationWrites": false,
  "applicationMigrationsApplied": false,
  "browserVerified": false,
  "mobileVerified": false,
  "fullStagesAdvanced": false,
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412
  },
  "remaining": [
    "actual1733/1734 scratch proof",
    "application1732/1733/1734 readiness/application",
    "real service/role/PAT/tenant/currentgrant/recipient-liveness/physical locking/cache/outbox proofs",
    "matching frontend1002 authorization remains pending",
    "full approval sheet/filter/history/mobile acceptance",
    "seven other immutable artifact owners",
    "large-target online index operator preparation",
    "deployment and operations"
  ]
}
```


## Exact approval notification navigation — 2026-10-04

Selected requirements: BT-27a037364398 and BT-801e948e8a67. [Disjoint navigation46 reservation](../implementation/WORK-CLAIMS.md#bt-27a037364398--bt-801e948e8a67--exact-approval-navigation-prerequisite-46), outer `21fdbc51e`, assigns six existing frontend files to B and two backend files to coordinator; C independently reviews both. Backend source is committed at `f5a8532ce`, frontend at `177e48cf3`. All ownership is released after these exact commits. No API, schema, permission key, query key, component, route page, migration or helper is duplicated.

- Genuine backendRED:16 of19 projection/link cases fail before the correction, including actual task/release approval projection pointing at Ticket900 or a queue instead of approval9. Final four suites75 tests pass; canonical strict project/approval int32 params are reused. The producer now passes actual row.id while retaining related Ticket identity as context. Its authorized reader, cursor and response fields stay owned by their existing services.
- Genuine frontendREDs: one outside-loaded-queue record-selection failure, three Unified navigation failures and one fabricated direct-entry queue-revision failure. Coordinator final14 suites158 tests pass. Direct `/build/approvals?projectId=<id>&approvalId=<id>` selects existing fresh authorized detail independently of loaded queue/filter/error state. Single positive int32 URL values are required; incomplete, duplicate, malformed or overflowing selection issues no detail request. Global Build approval cards use exact record identity; other module safe-target behavior remains covered.
- Queue opening uses push with scroll false; close removes approvalId through replace with scroll false and retains all other query parameters/cursor/page. Back/Forward and refresh reconstruct URL selection at the source-test boundary. Existing Dialog owns pending-close/Escape; list keyboard is disabled during review. Radix focus return chooses the connected Decide origin or existing search. Direct entry uses the fresh displayed revision without inventing an earlier queue revision. Existing409 input preservation, explicit Review latest and current-owner fences are retained. This package uses the existing dialog; the complete immutable-artifact decision Sheet remains separate.
- Exact eight-path lint/diff, backend and frontend changed-file TypeScript, and both production TypeScript commands pass. A first backend command invocation accidentally forwarded literal `--` and refused withTS5023 before compilation; corrected canonical `pnpm run typecheck` passes. Frontend `pnpm run type-check` uses official Next route type generation and passes. Full repository test TypeScript is not rerun for this bounded change: the earlier backend10GB exhaustion/frontend23 unowned diagnostics remain failed gates. Focused tests emit an act warning at the unchanged approval hook; console silence is not claimed.
- Existing generated contracts remain authoritative and unchanged; no response contract is changed here. No owned file exceeds500 lines or newly crosses300. C independently verifies all eight frozen hashes and preserved meaningful negatives. Coordinator verifies all44 outer/47 backend unrelated working-byte hashes are unchanged, including the user-modified tracker generator.

| Verification stage for bounded46 | Classification | Exact evidence or remaining gap |
|---|---|---|
| Source implemented | Current verified | Backend `f5a8532ce`; frontend `177e48cf3`; eight exact retained files |
| Focused tests passed | Current verified |75 backend/158 frontend tests after genuine REDs |
| Production typecheck passed | Current verified | Backend `pnpm run typecheck`; frontend `pnpm run type-check`; both scoped gates also pass |
| Database verified | Current unverified | Earlier33 scratch SQL cases prove the revision prerequisite, not this application read/navigation flow; application1732 is absent |
| Role/tenant verified | Current unverified | Source/model controls retained; current matching HTTP/application-role/object matrix still required |
| Browser verified | Current unverified | Matching frontend1002 remains pending following earlier automatic approval rejection of frontend API changes; no route rendering substitutes for actions/refresh/history |
| Deployment verified | Current unverified | Application1732/source parity and deployed policies not verified |
| Operations verified | Current unverified | Durable cache/events, revocation, jobs and recovery not verified |

Remaining scope: immutable artifact snapshot/version/current-version decision fence; all eight artifact owners; complete queue filters/requester/due/version projections, decision Sheet, inline Build Inbox approval action, full mobile/modifier-click/keyboard/browser history and return behavior, matching HTTP authorization/persistence and cache/event/deployment/operational proof. projectId provides selected-record context here; it does not add a server project filter to the organization queue. No full BT checkbox or D/I/T/R/B/L stage is advanced.

## Approval revision PostgreSQL replay — 2026-10-04

Selected requirement: BT-27a037364398; supporting BT-801e948e8a67. [Proof44 and correction45 ownership](../implementation/WORK-CLAIMS.md#bt-27a037364398--focused-postgresql-revision-replay-44) is disjoint from application implementation. Backend proof tool `a5ae00f77` adds four bounded repeatable verification files, reuses the unchanged IAM target guard/SQL client and official pending-migration runner, and pins original source fragments plus whole1732. Coordinator reran86 approval/organization/portal safety tests and exact four-path ESLint/diff; C and coordinator independently verified all four hashes before execution. Model tests cannot prove PostgreSQL behavior.

Current verified chronology:

1. Nonconnecting plan accepted only the derived current-run database. Execution began at `2026-10-03T23:35:32.486Z` against `scratch_build_migration_e34bee016e71af9de8f82340`. Four actual checks passed: focused prerequisites, revision absent before upgrade, real lock-timeout SQLSTATE55P03 and no migration ledger after that timeout. Whole1732 ran through the official fixed-tag runner, but the post-application catalog oracle refused with `PROOF_APPROVAL_CATALOG_INVALID`; exit1. The guard independently closed owned clients, verified current-run database identity/zero sessions and dropped only that database: cleanupVerified true, manualInspectionRequired false. This is a failed real gate, not a passed migration proof.
2. A second guarded diagnostic used `scratch_build_migration_499642ded8e36f923ddc7c1e` and preserved the same refusal. Its READ ONLY catalog observation showed bigint revision, NOT NULL, default1, validated one-column inclusive safe-integer CHECK, BEFORE/ROW/UPDATE trigger19, enabledO, no predicate/arguments, invoker function and exact pinned function body. Stored and pinned bodies are200 characters; direct source equality is true, while the previous SQL-btrim versus JavaScript-trim comparison is false. The diagnostic transaction observed read_only on. Cleanup again verified true. No migration SQL or guard is changed to accommodate this result.
3. [Correction45](../implementation/WORK-CLAIMS.md#bt-27a037364398--exact-postgresql-catalog-oracle-correction-45), committed backend `15eee78d9`, changes only the existing baseline oracle and its focused test: raw pinned dollar-body comparison. A recorded genuine RED1 then GREEN86; root reran86 and exact lint/diff, and C independently reviewed both hashes. Baseline SHA `703f7e210f449d5d90892d0ee66216d6061c2cddab119814eb11a8554a78d046` (204 lines); test `5480a98cb05945a038b302a67f157da84625d0be1ce972ec1f68be07528d76bc` (299 lines). Driver/cases/shared guards/SQL/source pins remain unchanged. No normalization, weakened CHECK or skipped assertion.
4. Corrected real execution on `scratch_build_migration_dd524fa92564bb29dc5e9c49` began `2026-10-03T23:50:12.773Z`, finished `2026-10-03T23:51:49.151Z`, exit0. All33 case oracles passed. Final privileged SELECT receipt:9 rows,1 exact migration ledger row, data digest `269ceb0a352fdcdfe0bc3828efd75863`, catalog digest `c23637780a536ea027c7a4c263ca4eb6`. Separate app-tenant-a/b cases explicitly set READ ONLY and require role `streamline_app`, mode on, exact tenant and exact unique ID-to-revision/cardinality maps. Guard verified zero remaining sessions/current-run OID-owner identity before dropping only this database. SQL CAS only; fixture RLS, not deployed policy or service authorization. Canonical sanitized observation-object SHA `d1c7b33059aaa5d8407c827eae97b3fd407527277556d89f090aac4b6db08627`.

### Sanitized PostgreSQL execution receipt

```json
{
  "sourceRevision": "15eee78d9",
  "runDatabase": "scratch_build_migration_dd524fa92564bb29dc5e9c49",
  "startedAt": "2026-10-03T23:50:12.773Z",
  "finishedAt": "2026-10-03T23:51:49.151Z",
  "cases": [
    {
      "stage": "case",
      "caseId": "focused-prerequisites",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "revision-absent-before-upgrade",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "migration-lock-timeout",
      "passed": true,
      "expectedSqlstate": "55P03",
      "actualSqlstate": "55P03"
    },
    {
      "stage": "case",
      "caseId": "failed-lock-no-ledger",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-whole-1732",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "constant-default-upgrade",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "validated-revision-catalog",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-ledger-replay",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "raw-rerun-refused",
      "passed": true,
      "expectedSqlstate": "42701",
      "actualSqlstate": "42701"
    },
    {
      "stage": "case",
      "caseId": "down-refused",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_REVISION_ROLLBACK_REQUIRES_REVIEW",
      "actualReason": "APPROVAL_REVISION_ROLLBACK_REQUIRES_REVIEW"
    },
    {
      "stage": "case",
      "caseId": "refused-ddl-unchanged",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "new-row-default-one",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "direct-writer-overrides-input-revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "reassignment-advances-revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "column-restricted-fk-delete-advances-revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "range-0",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "range--1",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "range-9007199254740992",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "range-null",
      "passed": true,
      "expectedSqlstate": "23502",
      "actualSqlstate": "23502"
    },
    {
      "stage": "case",
      "caseId": "exhaustion-refused",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_REVISION_EXHAUSTED",
      "actualReason": "APPROVAL_REVISION_EXHAUSTED"
    },
    {
      "stage": "case",
      "caseId": "exhaustion-unchanged",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "opposing-same-revision-one-winner",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "delayed-reassign-stale-decision-refused",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "delayed-cancel-stale-decision-refused",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "delayed-delete-stale-decision-refused",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "transactional-audit-failure",
      "passed": true,
      "expectedSqlstate": "23502",
      "actualSqlstate": "23502"
    },
    {
      "stage": "case",
      "caseId": "row-revision-and-audit-rolled-back",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "app-tenant-a-read-only",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "app-tenant-b-read-only",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-write-zero",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-insert-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "missing-tenant-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "app-trigger-disable-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    }
  ],
  "adminReceipt": {
    "stage": "admin-select-receipt",
    "rows": 9,
    "digest": "269ceb0a352fdcdfe0bc3828efd75863",
    "catalogDigest": "c23637780a536ea027c7a4c263ca4eb6",
    "ledgerRows": 1,
    "sqlCasOnly": true,
    "deployedRlsVerified": false
  },
  "cleanup": {
    "stage": "cleanup",
    "droppedCurrentRunDatabase": true
  },
  "wholeChainVerified": false,
  "applicationRuntimeVerified": false,
  "deployedRlsVerified": false
}
```

Repeatable commands: `node --test src/scripts/__tests__/approval-revision-migration-proof.test.mjs src/scripts/__tests__/organization-setup-migration-proof.test.mjs src/scripts/__tests__/portal-migration-proof.test.mjs`; exact proof-path ESLint and diff checks. Runtime invoked `node src/scripts/approval-revision-migration-proof.mjs --run-id=dd524fa92564bb29dc5e9c49 --approve-database=scratch_build_migration_dd524fa92564bb29dc5e9c49 --execute` with backend.env supplied only in the child environment. Each repeat must use a fresh run ID and approve only that derived database; no credential, IAM token or connection URL is stored in evidence.

Current unverified: full historical migration chain; real application service/controller/RBAC, cache/event delivery, browser/mobile, deployment and operations. The33 passing SQL cases are bounded PostgreSQL evidence, not HTTP authorization or immutable-artifact approval proof. RLS and parent tables in this proof are declared fixtures rather than deployed policy evidence. Independent application-role READ ONLY receipts at `2026-10-03T23:44:23.615Z` and after the successful run at `2026-10-04T00:02:10.026Z` observed role streamline_app, mode on, revision absent and0 approvals in reserved project54. The second receipt additionally restricted the catalog check to the exact three owned scratch names and observed0 remaining databases. Application1732 remains unapplied; no application approval writes, live Ticket comments or secret-bearing evidence were created. Both failed runs and their cleanup remain part of the chronology. The full BT task and its D/I/T/R/B/L stages remain open.

## Approval row revision source correction — 2026-10-04

Selected requirement: BT-27a037364398; supporting BT-801e948e8a67. [Exact disjoint ownership and full acceptance](../implementation/WORK-CLAIMS.md#bt-27a037364398--approval-row-revision-and-atomic-commands-43) was reserved at outer `61fa949c5`, starting backend `d2863e8d8`; backend source is committed at `43074abf8`. Classification: Current verified for bounded source/focused gates and catalog observations; Current unverified for runtime, browser and deployment. No full task stage or checkbox closes.

- Backend genuine RED: concurrent public approve/reject commands both fulfilled at expectedRevision1; expected exactly one. Final fake-adapter row still had revision1. One focused test failed before production changes; this is source-level behavior, not database race proof.
- Frontend genuine RED: public delete-hook command with `{approvalId:7, expectedRevision:3}` interpolated the object into the URL and sent no body. One focused test failed before production changes; runtime and browser behavior remain unverified.
- Existing baseline flaws: unconditional lifecycle writes; terminal decisions accepted by general management update; best-effort mutation audits; assigned approver can decide without project membership but cannot read the current detail GET. Approval request creation does not bind an immutable artifact. The correction must preserve canonical permission keys, route exposure, explicit module access and object-level policy.
- Application migration readiness: READ ONLY with the reserved tenant context sees integer id/project_id, text org_id, no revision column, and0 approvals in reserved project54. No application DDL or approval mutation was executed.1732 adds a separate bigint row revision exposed as a positive safe JSON integer; a database trigger advances every update. This is not an artifact version. [Corrected proof45](#approval-revision-postgresql-replay--2026-10-04) subsequently verifies focused scratch PostgreSQL trigger/CAS/rollback and33 case oracles. Actual application migration, service/API authorization/persistence and deployed policies remain Current unverified.
- Static migration evidence: discipline self-tests36, rollback self-tests9 and immutability self-tests19 pass. Real discipline still fails15 existing entries; real rollback still fails13 existing entries. Neither result names1732; no baseline is widened. Real immutability passes, and every earlier journal entry compares unchanged after the single1732 append. Static absence of a new finding is not a passed full gate or migration replay.
- Final backend evidence: coordinator 15 suites/207 tests pass, including opposing decisions, critical-audit rollback, assigned detail access, permission/terminal/revision refusals and 12 public mutation foreign-tenant/wrong-project/missing/deleted-record negatives. Exact 22-path lint/diff and scoped/production TypeScript pass. Independent source/SQL/journal/generated-contract review is clear. Three existing Inbox factories only add required `revision: 1`. Controller E2E was refused by the disposable-database guard before zero tests; mocks cannot substitute for that gate.
- Official artifact: both OpenAPI files have SHA `8ba8a4d13ca5be105d2381e4acb95db88c11442a735f14d097cec719082b4318`. Freshness passes at 4107 operations/4092 Zod contracts/4107 exposure stamps; Build freshness passes at 311 operations/390 schemas and byte vendor passes. The resolved inventory retains 410 mandatory-key operations, 1550 required bodies and 12 multipart contracts. Eight changed operations are approval-owned. No generator or generated artifact was edited by hand.
- Frontend source at `4773c5685`: coordinator nine suites/83 tests, exact lint/diff, scoped and production TypeScript pass; independent 22-file/final-delta review is clear. Displayed fresh revision survives background reads;409 retains choice/reason and blocks resubmit until explicit Review latest. Decisions accept pending/escalated/changes_requested, reject requested; requested management remains available. Project decisions require actual assigned membership or management, bulk controls require management, and successful bulk rows alone clear after current-owner acknowledgements. Hook inputs/types derive from official contracts; no new unused-underscore escapes or comments. Two initial unknown-ReactNode diagnostics were fixed and rechecked.
- Broad gate limits at this package: full backend test TypeScript again exhausts10GB (child134, pnpm1). Full frontend spec TypeScript fails with23 diagnostics in six unowned Calendar/Chat/Wiki/KB/Mail test paths, with no43 diagnostic. Preserve failures and unrelated hashes; scoped/production success does not imply a full test gate passed. This is not browser or persistence proof.
- Existing FK clarification: READ ONLY deployed catalog shows validated `fk_project_approvals_approver_actor` uses `ON DELETE SET NULL (approver_membership_id)`. The older unrestricted composite definition in historical0668 is an intermediate baseline, not a reproduced current defect;0770 supplies the later correction. [Focused proof44/45](#approval-revision-postgresql-replay--2026-10-04) preserves this distinction and verifies its column-restricted FK action advances revision. Full historical migration-chain and application runtime evidence remain Current unverified.
- Full remaining scope: all eight owners must supply bounded authorized immutable artifact snapshots/current-version checks; existing approvals remain unbound. Registered lifecycle events, cache/event delivery, canonical decision Sheet and Inbox integration, filters, requester/due/status/version projections, URL/history/mobile behavior, role/tenant, real persistence, browser, deployment and operations require separate matching evidence. Do not enqueue an unregistered changed event into a publisher that retries unknown types.

Status: Current unverified historical findings; Planned remediation

## Problem Statement

Planning a fix is not evidence that a historical browser failure is resolved. Pack observations also change over time: PM-001 first described no CTA, then Owner verification showed CTAs existed with failed persistence/loader. Preserve chronology and current uncertainty.

## Solution

Retain source evidence, map findings to canonical interfaces, and close only on current actor-specific persisted behavior. Refer to [research traceability](./research-traceability.md) for all source IDs and screenshots.

## User Stories

1. As an owner, I want an invitation to yield real access, so that collaborators start without support.
2. As a client, I want a successful grant to open my project, so that success messages are trustworthy.
3. As a Member, I want assigned projects visible, so that a blank list does not resemble data loss.
4. As an administrator, I want revocation to stop reads and jobs, so that stale grants do not leak data.
5. As a tester, I want the exact actor/environment/version, so that a screenshot cannot hide an incomplete lifecycle.

## Implementation Decisions

| Finding | Historical evidence | Planned seam | Closure evidence |
|---|---|---|---|
| BUG-001 / PM-011 | cold invite acceptance intermittently blank | invitation acceptance + onboarding destination resolver | cold session, wrong-email/expired/revoked/retry, actual membership and landing |
| BUG-002 / PM-002 | org invite without intended Build access | atomic membership + module standing activation | accepted module member can create ordinary work in assigned project |
| BUG-003 | tester project membership gate | canonical project access | assigned vs unrelated project positive/negative; consistent discovery |
| BUG-004 | Member client access no CTA/denial | capability projection and access request | safe human explanation; no inappropriate grant management |
| BUG-005 / PM-001 | false-success client invite without grant/entry; see [source audit](./client-portal-activation-gap.md) | `ARCH-17-CLIENT-PORTAL-ACCESS` activation command, invitation, publication gate, and outbox | persisted grant/invitation, usable guest entry, published client-visible artifact, no false toast |
| BUG-006 | Grant Access project loader failure | scoped project queries | authorized projects list loads; empty/denied/network states differ |
| BUG-007 | contested/scrubbed observation in CI log | original evidence review before attribution | reproduce exact original condition; do not invent a fix from identifier |
| UX-022/023 | membership discovery and productive role mismatch | scoped projects + ticket commands | correct count/list; Member create/update; deny elsewhere |
| UX-024–032 | cycle/release/filter/program/triage/report/portal/form depth gaps | corresponding domain/query interfaces | filled lifecycle and negative cases, recorded in source-linked acceptance |
| RBAC/cache/DB deployment gaps | source design cannot prove target runtime | AuthContext + ScopedRead + project access + client policy | runtime-role DB isolation, cache revocation, job/export/file/AI negatives |

Do not expand a historical severity into a new release blocker without attribution. Do not call RBAC broken because a UI preset is restricted. Compare current catalog, intended role and observed behavior; findings remain verification work until reproduced.

## Current source findings (2026-10-03)

| Finding | Current source evidence | Required correction | Closure evidence |
|---|---|---|---|
| BLD-INVITE-DELIVERY-01 | Before backend `9046fc768`, `bulkInvite` ignored `queued: false` for suppressed recipients or no provider; the source now returns queue outcome, records `DELIVERY_FAILED`, and marks setup partial | Prove the persisted invitation, failure event, and owner-visible recipient state agree; close the separate manual resend and worker-failure paths | Focused source checks passed at `9046fc768`; target database event and outbox rows, owner status after refresh, recovered delivery, and a real recipient link remain open |
| BLD-INVITE-ATOMIC-02 | The earlier source concern was incorrect: `DRIZZLE` is tenant aware and redirects the injected email outbox database to the ambient invitation transaction. The focused `invitation-outbox-transaction.spec.ts` exercises the real services and proxy with a transactional fake: four commit/rollback cases pass for pending, failed, and suppressed email rows. | Preserve this shared transaction behavior and verify it against the target database and a concurrent worker; explicit executor plumbing is not justified by current source evidence. | A real database rollback leaves neither invitation nor email row, and a concurrent worker cannot dispatch before commit; retry and first-link checks remain separate under BLD-INVITE-REPLAY-03 |
| BLD-INVITE-REPLAY-03 | The earlier replay claim omitted the outer outbox consumer transaction. The publisher wraps the setup consumer in one tenant transaction, the invite runs in a nested savepoint, and the inbox has a unique producer-event/consumer fence. Source therefore indicates a pre-commit crash rolls back invite, email, and inbox together; post-commit replay sees `COMPLETED` and skips. | Preserve the transactional inbox fence. Do not add a setup correlation schema solely to fix this unproven duplicate-send claim. | Target database crash tests before commit and after commit/before publisher acknowledgment show one invitation, one token hash, one email row, and a completed inbox fence; intentional manual resend remains separate |
| BLD-INVITE-STATUS-PROVENANCE-05 | Before backend `e1001a934`, setup status matched an organization invitation by recipient email, so an older pending invitation could mask the current attempt. The source now writes event-scoped receipts and reads only the exact outbox/inbox event and invitation ID. | Apply and verify migration `1728`, tenant RLS/FKs, legacy null, replay, rollback, and owner/member refresh on a disposable target database and browser; see the [onboarding source gap](./onboarding-current-state-gap.md#setup-invitation-outcome-provenance). | Backend `e1001a934` passes production typecheck, 104 setup tests, 38 migration-integrity tests, and scoped lint; database application and deployed behavior remain open. |
| BLD-ONBOARDING-PLAN-01 | Before backend `9fd0b94d2`, `OrgSetupService.completeSetup` enabled selected modules without the normal plan lock; source now reads a fresh tier inside setup and rejects locked choices before provision | Align preview and server error states; prove target database rollback and coordinate concurrent subscription transitions if needed | Five focused suites/109 tests, production typecheck, and lint pass at `9fd0b94d2`; target database, preview/browser, and subscription race proof remain open |
| BLD-INVITE-RESEND-04 | Before backend `9dc80badb`, manual resend rotated the token and returned success without separating email queue refusal. The backend now reports `deliveryQueued` and a controlled reason from the idempotent response while persisting the queue outcome; later worker failure is still a separate state. | Reconcile later worker outcomes with the invitation record and prove target database/recipient behavior | Backend `9dc80badb`, OpenAPI `d6bf011f5`, frontend response contracts `a48b731cb`/`306b0a636`, and owner presentation `1f608bc96` pass focused source/contract/UI checks; worker failure, provider retry, browser, and actual mail remain open |
| BLD-MODULE-REVOKE-01 | Before backend `f3d962afe`, direct standing removal left group, personal, or delegated permission active; source now writes a per-user deny and filters historical structural admin denials | Prove the override and cache/session revocation at runtime; preserve Org Owner/Admin access and verify regrant through every authorized path | Focused source checks passed at `f3d962afe` and direct/transfer regrant at `876b6f1e1`; target database, cache revocation, live session, job/export/file/AI, and role negatives remain open |
| BLD-MODULE-REGRANT-02 | Before backend `876b6f1e1`, direct RBAC role assignment and accepted ownership transfer could grant positive standing while an earlier per-user deny remained; those paths now clear the deny through the Access-owned writer in the same transaction | Define consistent reactivation for other positive group-grant paths and prove the committed state at runtime | Seven suites/84 tests, production typecheck, and scoped lint pass; existing revoked member regains only intended module access after target database, audit/version/cache, browser, and negative-role proof |
| BLD-MIGRATION-CHAIN-01 | Historical migration `0965_ar02_canonical_tenant_fks_3.sql` adds a composite foreign key to `invitations(org_id,id)`, while a source search of earlier SQL found only the `id` primary key and no composite unique prerequisite. The new `1728` index runs later and cannot repair a cold migration chain. | Follow the [migration chain gap](./migration-chain-gap.md): add a safe, reviewed prerequisite before `0965` without rewriting an applied migration; prove cold and upgrade paths. | Disposable database applies the complete journal from empty state and an upgraded snapshot; catalog shows the intended composite key/FK, rollback is rehearsed, and no deployed checksum is invalidated. |

These findings are source-level and remain Current unverified as deployed behavior until the named runtime evidence is collected.

## Intake processing reconciliation — 2026-10-03

`BLD-INTAKE-TRANSITION-08` is a source and bounded runtime correction under `ARCH-04-REQUEST-CONVERGENCE`, supporting BLD-011 and BLD-035. The previous `IntakeService.updateIntake` read pending state before its transaction. Competing decisions could both create a Ticket or overwrite the processed state. Its focused regression first produced two successful accepts where only one should succeed.

Backend `53a369619` moves the independent Intake owner from `execution/workspace.service.ts` to `execution/intake.service.ts`, with direct DI/import consumers and no forwarding facade. It locks the exact organization/project/request row in the tenant transaction, checks the locked state, and creates the canonical Ticket plus the pending-qualified request transition atomically. A missing result or failed write rolls back; processed requests retain the existing 409 contract. Publication runs after the owned transaction commits or through the ambient transaction's after-commit hooks; missing ambient hooks fail rather than publish early. List/create contracts, permissions and the canonical ticket creation interface remain unchanged. The unused controller schema import was removed without changing its response decorators.

Five focused suites passed 98 tests, including concurrent decisions, current locked state, tenant/project misses, creator/request rollback and ambient commit/rollback behavior. Independent review passed. Production TypeScript and scoped test TypeScript passed; the latter includes every changed spec and both RBAC scenario/adaptor imports, not the entire repository test suite. Exact eleven-path ESLint passed with zero warnings. Module-registration self-tests passed 13 cases and the real gate found all 260 modules reachable. `workspace.service.ts` shrank from 589 to 440 lines and the new owner is 136 lines; the unchanged file-size rules now report 38 existing violations instead of 39. The repository-wide size and other previously reported release gates remain open.

The coordinator restarted only the verified local synthetic runner at that revision. The normal synthetic owner session created Intake 2 and 3 through the real API in Flow02 project 54, then exercised competing commands. Before the races, a separate application-role read found both PENDING with null links and zero matching Tickets. The [saved request outcomes and persisted markers](evidence/2026-10-03-intake-transition.json) contain no authentication credentials.

| Real API action | Observed result | Persisted result |
|---|---|---|
| Two concurrent accepts for Intake 2 | 409 and 200 | One accepted request linked to Ticket 359, number 3; exactly one matching live Ticket. |
| Concurrent decline and accept for Intake 3 | Decline 200; accept 409 | Request declined with its submitted reason and no link; zero matching Tickets. |
| Repeat Intake 2 acceptance | 409 | Existing link remains Ticket 359; no additional Ticket. |
| Read accepted Intake collection | 200 with one matching row | Collection agrees with stored accepted state. |
| Read creation activity | One `created` row for Ticket 359 | No live ticket comment was posted. |

An independent fresh IAM read at 10:22:10 UTC used `streamline_app`, verified no superuser/BYPASSRLS, enforced read-only mode and selected REPEATABLE READ. It rechecked the exact synthetic organization, active owner and project before querying. All six stored-state checks passed: accepted and declined decisions, exact accepted link, one matching accepted Ticket, zero declined-title Tickets and one creation activity. This separately confirms the saved persistence markers; it does not establish browser behavior or every possible concurrent ordering.

These observations use real application guards and PostgreSQL; request concurrency is an observed schedule, not exhaustive controlled interleaving proof. Database failure injection, deployed effects/workers, cache/browser refresh and the full role/tenant matrix remain Current unverified. The generic duplicate transition still accepts a same-organization ticket ID without canonical target record authorization, and its existing numeric schema is not positive/integer constrained. That requires a separately claimed correction and tests for hidden/foreign/deleted targets and the allowed cross-project policy. This slice does not claim complete Intake, Feedbucket mapping, conversion-to-project or duplicate-link acceptance.

### Duplicate target authorization

Backend `0fdf32a3e` closes the source-level unchecked duplicate-target path: while the pending Intake row is locked, the command uses canonical `assertTicketReadAccess` for the same actor, organization, project and target. No target read, transition or Ticket visibility policy is duplicated. The positive int32 boundary additionally requires a target for duplicate commands; malformed processed requests can now fail validation before the processed-state conflict, an intentional invalid-input change.

Focused Intake checks passed 121 tests across six suites, including the real canonical guard's tenant/project/deletion/scope predicates, accessible same-project positive, no mutation after denied targets and processed/CAS behavior. Production and changed-spec TypeScript and scoped lint passed; independent source review was clear. The regenerated OpenAPI contract is backend `8d5e583ee`. New target-link HTTP/DB, target visibility/deletion races and browser proof remain open. Earlier accept/decline runtime results above do not verify this new duplicate-target branch. See the [runner evidence](evidence/2026-10-03-build-browser-runner.md#reviewed-assignment-authority-and-intake-target-changes) for the full-test TypeScript heap failure and pending frontend numeric-bound reconciliation.

The [duplicate-target runtime artifact](evidence/2026-10-03-intake-duplicate-runtime.json) now records eight actual endpoint checks against backend `8d5e583ee`. Synthetic request 4 was created in project 54. Missing ID, zero, fraction and overflow returned 400; a positive but absent ticket ID returned 404. A READ ONLY query confirmed request 4 stayed pending with no link. Linking accessible ticket 359 returned 200, repeat processing returned 409, and a fresh list returned the same duplicate/link. A separate agent's application-role READ ONLY transaction confirmed the exact request, live same-project ticket, zero tickets with the new Intake title and absence of the missing target within this tenant. No new Ticket was created by the duplicate command. The regenerated frontend schemas at outer `f5a57e8ec` parsed the real create/update/list payloads and rejected the three invalid numeric identifiers. Foreign/hidden/deleted targets, controlled interleavings, broader roles, browser and deployment remain open; the original requirement is not closed by this one-owner proof.

## Build Inbox module boundary — 2026-10-03

The user's reported category mismatch reproduced in the browser: Build displayed CRM, HRMS, Billing and other module categories. The underlying list already constrained `sourceModule=build`; the mark-all control incorrectly invoked global read-all. Thus the collection scope and mutation scope disagreed.

Outer `6ab361475` and backend `231a94829` correct this boundary. The shared category definition drives the Build menu and URL parser. Build binds a mandatory source route; global Inbox/bell retain the original command. The server updates exact tenant/recipient/source live unread rows without advancing the global recipient watermark. Client rollback changes only affected read flags, preserving concurrent foreign-module reads, current metadata, new/removed rows and aggregate counts. A 404 from an older backend shows the existing error toast and cannot fall back to global read-all. These are source-implemented findings, not full requirement closure.

| Evidence dimension | Result and limit |
|---|---|
| Focused source checks | Frontend 22 suites/205 tests; backend notification 5 suites/37 tests. Initial category/scope, delayed rollback race and visible failure regressions failed before their repairs. Independent final review clear. |
| Static gates | Exact frontend 12-path lint, backend notification lint, changed-spec TypeScript and both production TypeScript gates pass. Full frontend test TypeScript fails in unchanged Calendar/Chat/Wiki/Mail tests; full backend test TypeScript previously exhausted its 10 GB heap. Neither full test gate is claimed passed. |
| Contracts | Official backend OpenAPI generation; vendored and freshly generated frontend contracts at `9e9b178f7` match hash `ba9ab6ad26c439e53aeaa41935976a24fe06dd7f5767bb72a2456821e18e29d1`. Generated Build TypeScript syntax is unchanged apart from that hash; generator formatting explains the large textual diff. |
| Browser, Current verified | Build menu has All types, Projects & tickets and Approvals; selecting each category updates the corresponding `type` URL and selected label. Global Inbox still has All modules. At 390×844, the existing full-pane preview returns through Back to inbox with the category preserved; Approvals shows the filtered empty state. The observed console error list was empty. No user notification was mutated through this deployed-backend frontend. |
| Real API/database, Current verified | [Sanitized runtime artifact](evidence/2026-10-03-build-inbox-runtime.json): genuine synthetic session, local runner, application-role READ ONLY tenant checks. Fixture 307 is Build; 306 is organization. Build read-all returned 200; immediate counts were global 1/Build 0; only 307's stored read flag changed and no watermark was created. Global read-all returned 200, immediate counts 0/0, and persisted watermark 307 makes both records effectively read while 306's physical flag remains false. |
| Retry/denial, Current verified | Missing authentication 401, missing/wrong fixture capability 403, client-supplied authority 400 and absent reserved ticket 404; database remained unchanged after those denials. Fixture retries return the same ID without resetting its read state. These are fixture/owner results, not the full production role/tenant matrix. |
| Current unverified | Full recipient/tenant denials, browser mutation, complete event fanout/durability, and deployment/operations. The current browser frontend uses the deployed backend; local runner evidence is separate. Approval for a separate local verification frontend remains pending. |

The separate runner guard revision `33b2dd463` permits only reviewed global/Build scoped read-all PATCH paths after the existing reserved actor/organization checks. Fixture claim `BLD-INBOX-NOTIFICATION-FIXTURE-13` supplies bounded local test data through canonical notification creation; it does not prove real Build event fanout or modify production notification delivery.

Runner fixture commit `e238696bc` passed five focused suites/259 tests, exact lint and changed-spec/production TypeScript with independent review. Backend `1aee0d53a` moves notification cache invalidation/publication after commit; rollback and commit-failure tests prove no premature side effects. The author passed eight suites/89 tests; the later import-only test relocation passed its eight-suite/80-test selection plus the final scoped TypeScript gate. The relocation and hashes are in the [cleanup manifest](cleanup-manifest.md#notification-focused-test-placement--2026-10-03). Production TypeScript passed before the import-only relocation. The runner restarted with these frozen production files; an initial launch omitted documented NODE_PATH and failed before listening, then the corrected launch bound only 127.0.0.1:1001. No migration was applied.

The real SSE probe found another issue: count changes arrive as a default message containing a nested MessageEvent. The initial observer required a named event and therefore missed that frame; inspecting the actual frame corrected the observation. Source tracing confirms the global JSON response interceptor causes the nesting, and the frontend loses a notification's nested payload. BLD-NOTIFICATION-STREAM-WIRE-18 owns the canonical fix and real wire regression; it is Planned until independently checked and retested. Feedbucket submission notices also use the legacy feedbucket/SYSTEM classification, so future-notice correction is separately claimed under BLD-FEEDBUCKET-NOTICE-16. Historical ambiguous notices are retained; no broad filter or speculative backfill hides the distinction.

The SSE correction is now Current verified for the recorded source and local runtime scope. Backend `f1eecf42f` preserves native Nest SSE frames while retaining ordinary JSON envelopes. Three real wire regressions failed before the repair; four suites/52 tests, exact lint/diff, production TypeScript, final changed-spec TypeScript and independent review pass. Before restart, genuine synthetic notification 308 reproduced a default message with its notification nested and missing at the frontend's expected level. After restart into runner PID 20336, notification 309 arrives as a named notification frame with top-level payload; a following scoped read-all produces a named count_changed frame. Reusing the consumed stream token returns 401. Fresh counts progress 1 → 2 → 0; independent read-only persistence confirms Build records 307–309 read, organization 306's physical flag unchanged, and the prior global watermark still 307. This verifies actual notification framing and local command effects, not browser consumption or cross-tenant delivery.

Responsive read-only checks additionally passed at 375, 768 and 1280 widths. Escape dismisses the category menu and returns focus to its combobox; 768/1280 showed no horizontal overflow and no console errors were observed. The viewport was restored. Browser screenshots were captured in tool output; no saved screenshot path is asserted. Separate local frontend mutation approval remains pending.

Independent review blocks Feedbucket notice acceptance until a real registered recipient visibility policy checks current module/scope/project access. The intent/classification slice has five suites/35 tests plus a repaired schema-inferred test fixture, but that does not prove authorization. BLD-FEEDBUCKET-RECIPIENT-VISIBILITY-19 addresses pre-materialization access; queued delivery, stored history/counts and caller-token ceilings remain separate required integration work.

### Notification domain and replay source reconciliation — 2026-10-03

These are source-implemented slices with focused verification, not closure of BLD-009, BLD-014 or BLD-025. No original broad checkbox was marked complete.

| Slice / revision | Current verified source evidence | Current unverified acceptance |
|---|---|---|
| Atomic Feedbucket notice and recipient visibility, backend `7dff538d9` | New `build.feedback.received` intents share the submission transaction, preserve real submission identity, use Build/PROJECTS classification and register the owning Feedbucket read policy. That policy checks current membership, Feedbucket availability/scope, live submission/widget and, only for project-bound widgets, Build availability/project reach. Seven suites/118 tests and final integration two suites/59 tests passed; exact lint/diff and two independent source reviews passed. | Synthetic organization has Feedbucket disabled; no addon was enabled to manufacture success. Real notice production, stored historical text/count authorization, later provider authorization, browser and deployment remain open. Historical ambiguous notices were retained. |
| Canonical ticket assignment, backend `8c801eb4c` | Ordinary, template and feedback creation use the canonical transactional intent seam. Active internal recipients are read in a batch; self/invalid recipients are omitted; metadata carries trusted project identity. Returned ticket numbers are sorted before matching draft/activity/assignee state. Thirteen suites/146 tests and two independent reviews passed. | Real multi-recipient assignment and tenant/role/browser matrices remain open. Existing feedback null-actor watcher assertion and automation publication ordering are separate unresolved behavior. |
| Explicit intent replay, backend `0c90ca9f3` | The versioned identity binds canonical tenant/event/entity/recipient/chunk identity, explicit-versus-implicit caller semantics and optional priority/channel overrides. Writer and relay share strict encoding/decoding; internal metadata is not delivered. Six suites/57 tests include actual service replay after simulated post-materialization failure, 501 recipients, tamper negatives and legacy controls. Independent review clear. | Runtime replay, actual concurrent worker leases/crash recovery and rollout remain open. Implicit-window late replay and old unmarked rows retain their documented residual. Empty-channel coverage proves argument preservation; real routing may retain IN_APP. Existing relay handling of `failedRecipients` can mark an intent processed despite recipient failure and must be repaired separately. Consumer-before-producer deployment is required. |
| Build availability in live notification context, backend `85e62a08c` | Canonical module availability is checked before ticket/release/approval context even for an owner. Disabled, plan-locked and user-denied states have focused negatives. Six suites/105 tests, exact lint/diff and independent review passed. | Membership/cache latency, stored history/counts, actual module revocation/reenablement and full runtime/tenant/browser proof remain open. |

The test selections above overlap; do not add them as unique coverage. Combined changed-spec TypeScript and production TypeScript passed with all four production slices frozen. Runner test files were excluded from that changed-spec pass while their test-only extension was being edited. A second integrated gate includes them after the fixture review correction. Full test TypeScript is not claimed passed. These slices do not modify public API/schema contracts; generated contract checks remain separately dated.

Read-only application-role prerequisites for the reserved synthetic organization found status-change defaults LOW/IN_APP, no tenant event/policy override and no notification preference/digest row. Its baseline contains five processed intents and one historical DONE email queue row. This snapshot is neither actual new dispatch proof nor proof that external workers are isolated. The reviewed local fixture will require capability, live synthetic owner, current module/ticket access, fixed payload/recipient and no digest, and will never rewrite queue leases or states. Manual replay of a validated processed row will not be described as worker crash proof.

Canonical dispatch/replay now has bounded Current verified runtime evidence in the existing [sanitized artifact](evidence/2026-10-03-build-inbox-runtime.json), observation `canonical-notification-dispatch-replay`. Backend `693d332d0` closes the explicit-channel digest preference race, with nine suites/74 tests and independent coordinator/agent review; runner `702bd1d3c` adds the guarded fixture, five suites/305 tests and exact lint. Combined changed-spec and production TypeScript pass. A freeze check caught unrelated formatting of the runner after the author's hash snapshot; both coordinator and independent agent compared its parsed syntax against the prior revision plus the two intended dispatch additions and found no semantic difference. Fresh lint passed; the formatting was retained.

Reviewed runner PID17416 returned health200 and a genuine synthetic session200. Real fixture denials were401/403/400/404/409; alternate GET returned404 rather than the internal guard's focused403, and no denied operation changed notification state. Enqueue returned200/PENDING and persisted outbox492; after commit, notification310 and linked IN_APP delivery555 appeared, with LOW priority and no internal replay metadata in the notification. The fresh Build projection contains310 and only Build rows; its unread count is1. A manual canonical persisted-row replay after a real minute-bucket rollover returned200 without creating another intent, delivery or notification. Scoped read-all followed by another replay retains310's read flag, count0 and global watermark307; organization notification306's physical read flag remainsfalse. No email queue or digest rows were added. Delivery proof uses the actual composite notification FK, not an assumed fixture marker in delivery metadata.

This is owner-only fixture evidence, not worker lease/crash, full recipient/tenant, live preference-race, browser mutation or deployment proof. Existing `failedRecipients` handling remains open. Stored owner policies25 were edited only after this runner boot and are excluded from its evidence. The full file-size gates remain failed (38 source files over500;511 over300 versus baseline413), after their65/16 self-tests passed; no baseline or exception was widened.

The initial BT-801e948e8a67 acceptance audit recorded the following source gaps; later33/34/35/37/39 source handoffs address lifecycle controls, preview states and selected-read ownership, while their full runtime/browser proof remains open: no Build resolved/snoozed controls; notification approval does not open the exact-version domain decision sheet and the current decision command lacks a version/status compare-and-swap; ticket preview errors/denials can become misleading missing-record states; selection/history/return and narrow-desktop auto-selection need follow-up. Claim26 addresses only malformed ticket-link decoding and stale selection across project filters. Shared link fallback safety, the other UI behaviors and their browser proof remain open. Flat/unified stored notification reads, AI raw notification tools and live SSE payload visibility require separate authority enforcement; a producer visibility check does not authorize historical reads.

### Inbox independent review corrections — 2026-10-03

Claim26 source is committed at outer `2b256d30a`. Its exact six files are the existing shared ticket formatter/parser and test, Inbox ticket-link parser and test, and Inbox list and type-filter test. Malformed percent escapes no longer throw; project/comment/numeric ticket IDs must be positive int32 values; changing or removing the project filter clears stale bulk selection while same-project paging/refresh retains it. Independent review caught a first-draft compatibility regression: real backend provisioning emits project keys such as `WEB-123`, so both shared and Inbox parsers must retain `WEB-123-29`, legacy URLs and comment targets. The shared parser was repaired instead of adding another key grammar. Initial regression RED was 30 failures/19 passes; producer compatibility RED was 11 failures/53 passes. Final focused selection passed 13 suites/199 tests, six-file lint/diff, root scoped TypeScript and production `pnpm -C frontend type-check`; independent agent and root source reviews passed. These are Current verified source/gate results, not new browser or persistence proof.

The fresh full frontend `pnpm -C frontend type-check:specs` gate failed in six unmodified Calendar, Chat, Wiki, KB and Mail test files: recurrence shape, nullable textarea ref, missing conversation pagination props, KB hook arity and numeric Mail identity fixtures. No changed Inbox/shared-parser path was reported. An earlier scoped invocation omitted `types/next-auth.d.ts`, producing 12 Session augmentation diagnostics; the corrected scoped program included the repository declaration files and passed. Neither failure is hidden or reported as a full pass.

Claim25 policy review found two agent-identity mismatches before consumer integration: Feedbucket own/team ownership and an assigned-approval exception used accountable issuer membership where canonical list/inbox boundaries use acting membership. Three focused negatives reproduced this, and both owners now use acting membership for those assignment branches while retaining accountable issuer validation and canonical project/token scope resolution. Final owner-policy tests passed 10 suites/156 tests and exact seven-file lint/diff; independent re-review is clear. Current HTTP routes reject agent tokens, so this is proven shared-policy consistency, not a claim of an observed HTTP exploit. Consumer wiring, actual SQL execution, current membership-cache latency, full role/tenant proof and deployment remain Current unverified. Claim27 separately owns flat/unified list/count propagation and unsafe raw-response cache removal.

The same review found a pre-existing Feedbucket detail gap: `FeedbucketController.getSubmission` delegates to `findOne(orgId, id)` without the own/team or live-parent scope enforced by the collection route. Preserve this as an open authorization finding; fixing a notification projection does not repair the owning detail endpoint. No related endpoint, permission, migration or historical record was changed in these slices.

### Stored notification authorization runtime — 2026-10-03

Current verified, bounded scope: owner policies are committed at backend `8db4f6dd6` and read consumers at `e0f3de0fb`. Independent consumer review matched all 33 frozen files; policy tests passed 10 suites/156 tests and consumer tests 26 suites/249 tests. Combined changed-spec TypeScript, production TypeScript, exact lint/diff, backend OpenAPI freshness and frontend contract/vendor checks passed. The full test-TypeScript and repository standards failures documented above remain open.

The reviewed synthetic runner was restarted from a clean detached checkout of `e0f3de0fb`, sharing installed dependencies but excluding unrelated working edits. PID24992 listened on 127.0.0.1:1001 after its application-role preflight. Real owner reads returned only Build rows under `sourceModule=build`, and both Build and organization history globally. Cursor pages retained their sentinel/terminal behavior. Two temporary personal tokens demonstrated authorization before pagination: the restricted `build:access:view` token received an empty Build page and the unrelated organization row306 as the complete global one-row page; the permitted `build:view` plus `build:tickets:view` token received the Build rows.

The guarded enqueue command durably created intent495, notification311 and IN_APP delivery558 for reserved ticket358/project54. With notification311 unread, actual flat and unified reads/counts returned one for the owner/permitted token and zero for the restricted token, with valid response contracts and no degraded source. Missing authentication returned401, client-supplied organization query returned400, and the restricted ticket endpoint returned403. These are genuine statuses, not500. Independent application-role READ ONLY queries confirmed the exact recipient, live notification, PROCESSED intent, DELIVERED row and unchanged watermark307. Scoped Build read-all then returned200 and count0; notification311 became read while organization306's physical read flag and watermark307 stayed unchanged. Both temporary token revocations returned204 and subsequent token requests401; a final independent read confirmed both revoked. All observations and harness corrections are in the [runtime artifact](evidence/2026-10-03-build-inbox-runtime.json), observation `stored-notification-read-authorization`.

Current unverified: nonowner and cross-tenant matrices, object/assignment revocation races, real owner query budgets, cache-freshness ceiling, stream/AI consumer authorization, matching browser/mobile flow, deployment and operations. Local workers/providers were disabled; remote worker behavior and crash/lease recovery were not exercised. Synthetic evidence records remain; no customer data, live ticket comment or historical evidence was deleted. No broad BT stage closes from this bounded runtime matrix.

### AI notification read adoption — 2026-10-03

Current verified source/gate result at backend `52cd31533`: `getMyInbox`, `getMyNotificationCount` and `summarizeMyDay` now use the exported canonical NotificationsReadService with the unchanged actual caller. Missing principal or caller/actor organization/user mismatch rejects before notification reads or any daily-digest branch. AiModule imports the existing NotificationsModule without a duplicate reader/registry provider. Inbox output retains its eleven fields and nullability, with 30 rows, title240/message1200 character caps and an over-2048-character link omitted as null. Canonical ID ordering, effective-read watermark, retention and snooze rules replace the former independent raw queries.

The new actual-tool/reader/registry regression and existing DI test failed17/passed4 before the three production changes; final four suites/40 tests passed. Exact seven-file lint/diff, independent review, scoped TypeScript and production TypeScript pass. An initial scoped-TypeScript invocation omitted `src/@types/express.d.ts` and reported one `rbacScope` augmentation error; including the repository declarations produced zero diagnostics. Fixtures simulate database filtering; they are not PostgreSQL or AI-provider proof. Runtime24992 still loads `e0f3de0fb`, before this AI commit. Actual AI execution, provider token usage, physical query costs, complete role/tenant/browser and deployment remain Current unverified. No provider was invoked.

### Notification hints and bounded hydration query — 2026-10-03

Current verified source/gate result at backend `efcb68681`: notification SSE egress projects only `{type: "notification", notification: {id}}`; count events cannot carry an accidental notification payload. Recipient filtering, heartbeat and one-use tokens retain their existing behavior. The canonical authenticated notification list accepts 1–100 unique positive safe-integer IDs as canonical decimal CSV, bounded to 1699 decoded characters; bigint IDs above int32 remain valid. The same DTO array validator rejects invalid direct-reader input before SQL, and the ID predicate composes with current tenant/recipient/domain access before sentinel LIMIT. Counts remain independent of hydration IDs.

Three focused suites/58 tests, exact six-file lint/diff, independent frozen-hash review and scoped/production TypeScript pass. Initial focused RED had10 failures/28 passes, with seven additional failing direct-reader bound cases before implementation. On this revision, `pnpm -C backend typecheck:test` again exhausted its configured 10GB heap and exited134; the full test gate did not pass. Runtime proof for this new source is pending. Frontend30 remains in progress. Deployment requires matching client/server release or server ID-query support → hydrated client → ID-only egress; neither client-first nor server-first alone is compatible with the older counterpart. No private-content fallback is allowed.

### Stored notification cross-tenant isolation — 2026-10-03

Current verified, bounded runtime at `e0f3de0fb`: normal local captured-mail OTP and magic-link flows created the second reserved organization `a3ee7aa5-3005-4c3b-a4c5-db16151d0a29`, owner membership140, with setup notification312. Global flat/unified reads returned312 and unread count1; Build reads/counts returned empty/0. All corrected responses matched canonical contracts and unified reads were not degraded. The second tenant's request for first-tenant project54/ticket358 returned404, and client-supplied `orgId` returned400.

Build-scoped read-all returned200; refresh and independent application-role READ ONLY queries confirmed organization312 remained unread, no second-tenant watermark appeared, and original tenant rows306–311/watermark307 were unchanged. Under the second tenant's RLS context, the first tenant's six recorded notification rows were invisible. The first tenant's positive global read still returned306–311 and excluded312. The [existing runtime artifact](evidence/2026-10-03-build-inbox-runtime.json), observation `stored-notification-cross-tenant-isolation`, records the actual statuses, persisted synthetic setup, exact scope, harness corrections and limitations. The second tenant has no Build records; this does not prove nonowner, own/team, project-revocation, browser/mobile, AI28, stream29 or deployment/operations behavior. Synthetic evidence is retained and secrets were excluded.

### Notification hint runtime and hydration — 2026-10-03

Current verified bounded runtime: runner8804 loads detached `efcb68681`. Actual synthetic dispatch for project54/ticket357 produced outbox497, notification313 and delivery561. The owner stream emitted exactly `{type:"notification",notification:{id:313}}`; its count event had only `{type:"count_changed"}`. Both synthetic owner streams received heartbeat events and the second tenant received no notification event. Hydration of313 returned one authorized unread record for the owner, and empty lists for the other tenant and restricted `build:access:view` PAT. Duplicate and unsafe IDs returned400, a safe bigint ID above int32 returned200/empty, absent authentication and a consumed stream token returned401, and the restricted ticket read returned403. These are real HTTP results with canonical contracts, not mocked browser calls.

Independent application-role READ ONLY queries confirmed unread313 and PROCESSED497 before the read command. Build-scoped read-all returned200, subsequent UNREAD hydration omitted313, and persisted313 was read while organization306 and watermark307 remained unchanged. Delivery561 was IN_APP/DELIVERED. The temporary PAT was revoked204, subsequently denied401 and persisted revoked; both stream readers were closed. Exact requests and limits are in the17th [runtime observation](evidence/2026-10-03-build-inbox-runtime.json), `id-only-stream-and-authorized-hydration`; independent artifact review by `scoped_activation_dispatch` is clear for the recorded scope. LOW synthetic fixture notices do not prove visible frontend toasts. Browser/mobile, project-revocation timing, query budgets, worker recovery and deployment remain Current unverified.

Generated contracts at backend `6b2b285cd` and frontend `0b4b52427` contain only the optional notification ID query and regenerated source hash. Independent review, six vendor and93 Build generator self-tests, vendor/freshness checks and backend OpenAPI freshness pass (4106 operations,4091 contracts). Initial isolated generation lacked environment inputs and failed before generation; rerunning the official entry with the existing backend environment file succeeded without copying secrets or editing generated output. The OpenAPI CSV representation does not encode all transform/refinement rules; runtime Zod remains authoritative for safe integers, count and uniqueness.

### Notification hydration and target source closure — 2026-10-03

Current verified source/gates: frontend `6191ee3d2` consumes ID-only hints, discards private fields in legacy frames, parses the real token response envelope, and obtains toast content through a fresh canonical authenticated UNREAD request. Exact organization/user/session and committed identity fence the request, response, toast and View action. The existing API client and response contract remain authoritative; the bounded queue batches100 IDs, caps pending/held/running and seen sets at1000, allows one in-flight request and three transient attempts before reconnect recovery. It never substitutes cached notification text.

Independent review exposed two subscriber-grace defects. Actual-hook RED tests reproduced lost pending/in-flight hints and a disconnected stream whose retry fired with no subscribers. The repaired108-test snapshot resumes accepted hints through a fresh read, discards inactive response content, preserves session cancellation and retry budgets, and reconnects only without a live connection or future retry. Eight focused suites/108 tests, exact13-path lint/diff, matching-hash independent review and final scoped/production TypeScript pass. The earlier token-cooldown race hypothesis was disproved against the frozen implementation; no unsupported fix was made. The full frontend test TypeScript gate remains failed in six unrelated Calendar/Chat/Wiki/KB/Mail files; no changed notification path failed.

Current verified source/gates: frontend `94135bc10` hardens the existing shared deep-link normalizer used by Build Inbox, global Inbox, bell and toast. Opaque/non-HTTP schemes, malformed HTTP URLs, raw control/backslash characters and protocol-relative outputs fall back to `/inbox`. Legacy Build mappings, valid HTTP(S)-to-internal-path handling, other-module paths, queries and existing fragment dropping remain compatible. Meaningful RED24/49 became six focused suites/145 tests passing; exact two-path lint/diff, independent hash review, scoped TypeScript and the production gate covering this frozen revision pass. These overlapping suite totals must not be added as unique coverage.

Browser toast/click/refresh/back/mobile, the complete nonowner/object-revocation matrix, deployment compatibility and operations remain Current unverified. No full BT stage or checkbox advances from these source slices. No source comments, route, permission key, caller-specific sanitizer or duplicate API client was added.

### Canonical notification triage reads — 2026-10-03

Current verified source/gates at backend `f2ec6c210`: flat notification reads accept `SNOOZED` and share the existing Active/Later/Done predicate owner with unified Inbox. Active is unarchived and not future-snoozed; Later is unarchived with a future deadline; Done is archived regardless of snooze. SNOOZED plus unreadOnly intersects Later with effective unread state. Existing section overrides, PINNED behavior, active unread badge, watermark, bounded cursor/ID hydration and tenant/current-domain visibility remain compatible. The primary reader shrinks from300 to291 lines without baseline changes or a new production abstraction.

Meaningful RED8/30 preceded implementation; final four suites/38 tests, exact eight-path lint/diff, coordinator independent frozen-hash review and scoped/production TypeScript pass. The new focused contract test drives the real owner registry and project-family authorization algorithm through a bounded simulated SQL adapter; it is not PostgreSQL, cost or full owner-family proof. The backend full-test TypeScript gate remains the separately recorded10GB heap failure. Persisted snooze/archive transitions, explicit unsnooze, command validation/concurrency, matching browser/mobile and deployment/operations require subsequent claims and evidence. The reviewed runner must admit lifecycle writes before they can be exercised; a verification-boundary403 is not product authorization evidence.

Official generated artifacts are committed at backend `e9a281d31` and outer `d9e1a33ce`, with vendor SHA256 `0da95f9b7ea876191c34611190da47137463611c0beab79396f9ef423f530478`. Independent artifact review, six vendor/93 Build self-tests and both freshness checks pass; the only semantic OpenAPI delta is the new section enum member. Replacement runner25784 loads reviewed `f2ec6c210` with healthy `/health` and `/health/ready`. Observation18, `triage-query-contract-read-smoke`, records active Build IDs313/311/310/309/308/307, empty Later/Done, unsupported-section400 and absent-auth401. Application-role READ ONLY inspection confirms all six Build rows have null archive/snooze fields, are read, and organization306 remains unread. No notification mutation occurred; empty Later/Done and the second tenant's empty Later result do not prove successful lifecycle transitions or positive cross-tenant Later isolation. Initial pre-listening connection failures and the nonexistent `/health/live`404 are recorded as harness corrections.

### Synthetic Member invitation and unassigned Build denial — 2026-10-03

Current verified, bounded runtime evidence at reviewed backend `f2ec6c210`, runner25784: the reserved Flow02 owner invited the existing synthetic isolation account as Org Member without moduleAccess. Actual create201, validate200 and local captured OTP200 responses match their canonical contracts; acceptance without the OTP returns400. Acceptance with it returns200 and persists invitation `8ec14496-c3c8-4e7b-9289-a0aaca97b75d` as ACCEPTED, membership141 as ACTIVE/MEMBER, and one consumed code. The issued join magic link verifies200 once and401 on reuse. The same create Idempotency-Key replays201 with the same invitation; accepting the consumed invitation returns404. Independent application-role READ ONLY inspection confirms exactly one membership, zero invited module assignments, zero module overrides and zero Build role assignments.

The new Member's genuine session exchange returns200; project54 returns403/FORBIDDEN before module assignment. Canonical Build and global notification cursor reads return200/empty, which proves response shape only, not positive visibility. The [existing sanitized artifact](evidence/2026-10-03-build-inbox-runtime.json), observation19 `synthetic-member-invite-and-unassigned-module-denial`, records the exact reserved IDs, persistence and denials; independent agent review found no exposed credentials and confirmed the bounded claim. Tokens, OTPs and join capabilities remain in memory.

At observation19, positive entry after explicit Build assignment, own-notification visibility, linked object scope, transition races, client grants, browser/mobile onboarding and deployment/operations remained Current unverified. This runner predates claim33 lifecycle commands and claim35's expanded synthetic boundary; neither is proven by these flows. No full BT stage or checklist item closes.

### Synthetic Build Member assignment and preserved object scope — 2026-10-04

Current verified, bounded runtime evidence: observation20 in the [existing artifact](evidence/2026-10-03-build-inbox-runtime.json), still at backend `f2ec6c210` and runner25784. The synthetic owner selected canonical Build Member group2068 and assigned membership141 through the real module-access endpoint; it returned201 with the canonical success contract. After normal session renewal, the Member's permission read returns200 with `build:view`, without `build:access:manage`, and all organization/module owner/admin flags false. The canonical Build project collection returns200 with an empty authorized cursor page. Private project54 and Ticket358 remain403 with `PROJECTS_FORBIDDEN_PROJECT` and `PROJECTS_FORBIDDEN_TICKET`; self-escalation to Build Admin2051 returns403/FORBIDDEN. The other tenant's owner receives404/`PROJECTS_NOT_FOUND` for project54.

Independent application-role READ ONLY inspection after the denied escalation confirms ACTIVE Org Member141, structural organization Member role2048, exactly one Build role2068, an enabled Build override and canonical `module_access.member_added` audit930 naming the owner and group2068. Permissions version13 was observed without a captured before-value, so its increment and complete cache/event fanout are not asserted. An early final-state assertion incorrectly counted the organization role as a Build role; inspecting `module_key` corrected the assertion without another product write. Held credentials initially returned401; the cause was not independently proven, and renewed normal sessions supply the authority results above.

Independent agent review confirmed observation19 is unchanged and20 contains no credentials or unsupported closure claims. Empty collections prove module entry and response shape, not positive project/Ticket/notification visibility. Client activation, complete role/tenant and authority-transition matrices, browser/mobile, deployment and operations remain Current unverified. The research sequence has bounded invite acceptance and module-assignment evidence; client-grant activation remains the next separate activation gate. No full BT stage advances.

### Personal notification triage source and cache handoff — 2026-10-04

Current verified at source/test level: backend claim33 `1c673c5bd` implements current live recipient authority and exact-row locking for archive, unarchive, future Snooze and explicit bodyless Unsnooze in the existing lifecycle owner. The exact partition timestamp is preserved as PostgreSQL text rather than rounded through a JavaScript Date. Strict HTTP bodies reject authority fields; strict command-entry and post-lock Snooze validation reject malformed direct calls and expired new commands. Completed canonical keyed retries can replay after the deadline. Repeated unchanged commands preserve state and omit duplicate cache/count publication. Fourteen pure NotificationsService forwards were removed after caller inventory; the controller injects the actual lifecycle owner. This changes personal attention only, not a Ticket status or approval decision.

Meaningful regressions include a microsecond partition-key404 and malformed direct Snooze action-string dispatch before repair. Final nine suites/140 tests, exact15-path lint/diff, independent matching-hash review, combined scoped33+35 TypeScript and backend production TypeScript pass. Backend full test TypeScript session45618 again exhausted10GB: pnpm exited1 with the child ELIFECYCLE exit134, so the full gate is failed. The fixture's unused exports and unasserted wrappers were removed to keep its existing domain boundary at300 lines; source-size limits and baselines were not changed.

Frontend claim34 `6e200b0e3` uses field-owned optimistic operations and captured invocation identity/input. Same-field ABA, cross-session response fencing, query cancellation during a Build-to-global scope change, refreshed-list preservation and server-authoritative counts have focused negative/positive coverage. Resolve/Restore/Snooze/Unsnooze hooks reuse canonical contracts, keys and command permissions. Final nine suites/76 tests, exact17-path lint/diff, independent review, scoped TypeScript and production TypeScript pass. The scoped gate first found a flatMap union inference error; the existing union generic resolved it and the reviewer verified that exact delta. Fresh full frontend spec TypeScript failed in six unrelated Calendar/Chat/Wiki/KB/Mail paths, with no claim34 diagnostics; it is not passed.

Runner claim35 `94d32b547` admits only the exact five personal PATCH actions after its existing synthetic actor/organization and target checks. Fresh two suites/192 tests, exact lint/diff, coordinator review and integrated scoped TypeScript pass. Its guard still refuses unrelated mutations; a guard403 is harness evidence, not product authorization. Existing formatting drift was shown syntax-equivalent to the prior source plus the precise allowance. New33/35 are committed but were not loaded for observation20; runtime, browser and mobile acceptance are separate. Publication remains nondurable after-commit work; complete membership/account/organization transition races, durable recovery, broader CAS/audit and operations remain open. Claim37 independently owns the actual UI and fresh selected-record read; no broad I/T/R/B/L stage or task checkbox is completed by this handoff.

### Real personal triage persistence and recipient effects — 2026-10-04

Current verified, bounded API/database/event evidence: [observation21](evidence/2026-10-03-build-inbox-runtime.json), reviewed runner6156 at backend `94d32b547` including lifecycle `1c673c5bd`. All four actual personal commands returned200 with canonical acknowledgement. READ ONLY inspection proves notification313's exact `created_at` remains `2026-10-03 16:53:20.348809+00`, including its submillisecond partition key. Resolve persists archive and moves it into Done; repeated Resolve preserves the archive timestamp. Keyed Restore accepts `{}` and an absent-body retry. Future Snooze persists its deadline and enters Later; archive while snoozed takes Done precedence; Restore before expiry returns Later; explicit bodyless Unsnooze clears the deadline and returns Active. Final Active/Later/Done reads match their canonical response contracts and persisted state.

The same Snooze key with a different valid body returns422. After its deadline and subsequent Unsnooze, the completed keyed retry returns200 without restoring the expired deadline; the same deadline as a new keyed command returns400. Absent login returns401, a same-tenant nonrecipient and existing other-tenant target return404, an above-int32 safe missing ID returns404, and a forged authority body or new past Snooze returns400. No denial was500. The other tenant still reads its own recorded notification312 through the authorized canonical API. Final READ ONLY comparison confirms the other six observed Flow02 rows and watermark307 are unchanged; it does not assert unobserved columns or the other tenant's full database row are unchanged.

Three authenticated streams admitted the owner, same-tenant Member and other-tenant owner. Six changed states produced six owner-only `count_changed` events containing only `type`; the other two streams received zero events during this bounded observation. Repeats, conflict and completed-key replay add no observed effects; all streams were closed. Target313 was already read: global1 and Build0 unread counts remain canonical and unchanged, so a numeric unread badge transition is not proven. Actual physical cache deletion, automatic expiry events, durable publication/audit, controlled concurrent revocation/rollback and the complete current-principal matrix remain Current unverified. Browser/mobile mutations and deployment/operations remain open. Independent artifact review verified prior20 observations unchanged and no credentials or unsupported full-stage claims.

### Canonical optional request contracts and remaining UI review — 2026-10-04

Current verified at source/test level: independent artifact review rejected candidate SHA `8c36bd46f0be015ac2e3827f0fcc320b5e10d547f73442b52ed8f555625d42fa` despite passing byte freshness. It falsely required optional retry keys and absent accepted bodies. Canonical source repair38 at backend `120545d96` carries actual handler/class idempotency optionality and synchronous Zod undefined acceptance. Required headers, strict schemas and required JSON/multipart inputs remain authoritative; bodyless metadata cannot suppress required validation. Unrepresentable/async absence probes produce an explicit unconvertible finding. Stale required/optional/inline header entries are reconciled once in the existing owner.

Real DiscoveryModule/scanner RED8 and builder RED3 preceded the repair; final six suites/88 tests, exact five-path lint/diff, independent review and root scoped/production TypeScript pass. Root's scoped gate first found two unsupported Swagger extension property assertions; the author replaced only those assertions, passed30 owned tests and refroze. The reviewer reconstructed the previous hash from those exact two changes. Official generation from reviewed120545d96 now reports4107 operations,4107 exposure stamps,4092 Zod contracts and zero unconvertible findings. Canonical artifact SHA `1e8635e76e00a9c863db00de88fe655242b2e7a4b59054694b77ec29f3578153` is committed at backend `6d12d99ec` and frontend `8411d5aa0`. Backend and frontend freshness, byte vendor,6 vendor self-tests and93 Build-contract self-tests pass. Independent full semantic review accounts for35 recursive changes across26 routes plus the optional-header component:13 optional keys match actual decorators;10 duplicate mandatory headers are deduplicated while408 mandatory operations remain required; only strict default-empty bodies become optional. All12 multipart contracts and1549 other required bodies are preserved. Generated frontend TypeScript changes only the canonical hash. Prior and rejected artifacts remain preserved in ignored scratch.

Exact independent artifact inventory versus preserved0da95 (source repair changes published metadata; unrelated runtime controllers are not changed):

| Method | Path | Verified artifact change |
| --- | --- | --- |
| POST | `/build/{projectId}/updates` | Optional retry key; body unchanged |
| POST | `/timesheets/entries` | Optional retry key; body unchanged |
| POST | `/timesheets/entries/{entryId}/void` | Optional retry key; body unchanged |
| POST | `/timesheets/entries/from-attendance` | Optional retry key; body unchanged |
| POST | `/timesheets/exceptions/run-detection` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/{timerId}/convert` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/{timerId}/discard` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/{timerId}/stop` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/start` | Optional retry key; body unchanged |
| POST | `/hr/attendance/break` | Deduplicate required retry header |
| POST | `/hr/attendance/check-in` | Deduplicate required retry header |
| POST | `/hr/attendance/check-out` | Deduplicate required retry header |
| POST | `/me/attendance/break` | Deduplicate required retry header |
| POST | `/me/attendance/check-in` | Deduplicate required retry header |
| POST | `/me/attendance/check-out` | Deduplicate required retry header |
| POST | `/hr/expenses/email-report` | Deduplicate required retry header |
| POST | `/hr/expenses/export/jobs` | Deduplicate required retry header |
| POST | `/hr/export/jobs` | Deduplicate required retry header |
| POST | `/payroll/runs/export/jobs` | Deduplicate required retry header |
| DELETE | `/hr/documents/{documentId}/kb-link` | Publish actual strict default-empty body as optional |
| POST | `/inventory/packages/{packageId}/close` | Publish actual strict default-empty body as optional |
| POST | `/inventory/shipments/{shipmentId}/ship` | Publish actual strict default-empty body as optional |
| PATCH | `/notifications/{notificationId}/archive` | Optional key and strict empty body; archive command metadata |
| PATCH | `/notifications/{notificationId}/unarchive` | Optional key and strict empty body; restore command metadata |
| PATCH | `/notifications/{notificationId}/snooze` | Optional key; required snoozedUntil body preserved |
| PATCH | `/notifications/{notificationId}/unsnooze` | Sole new authenticated universal operation; safe-int ID, optional key/strict empty body, canonical ACK/errors |


UI37 initially passed212 focused tests but independent reviews found mobile loading/error hiding Back and inherited desktop Escape immediately reopening automatic selection. The three claimed navigation files were repaired through meaningful RED3, then22 suites/215 tests and exact lint/diff. Further standards review found new interactive static icons against FE-107 and accent-sensitive primary tab colors against the accepted neutral selected-tab behavior. Those bounded corrections are independently reviewed: neutral foreground/background tokens preserve selected tabs across accent themes; new interactive controls use installed canonical animated icons. A final Resolve-only repair passed14 focused tests, with the other19 claimed paths unchanged. Root scoped TypeScript then found two real integration errors: unsupported LoadingState compact and an options object passed to get where the API accepts an AbortSignal. Simply dropping expectedIdentity would weaken dispatch fencing; the author is adapting the existing request/response seam and real argument-shape coverage inside the same claim. The final four-path repair now uses supported LoadingState list/rows3 and the existing request GET/native signal/expectedIdentity plus canonical parseApiResponse seam. Meaningful request-shape/cancellation/malformed-response RED3 preceded repair; author8 suites/82 tests and coordinator22 suites/216 tests pass. Exact18 TS/TSX lint/diff, all20 matching hashes, independent precise-delta review, scoped TypeScript and production TypeScript pass at frontend `71efa13b4`. Fresh full frontend spec TypeScript session18049 failed only in the same six unowned Calendar/Chat/Wiki/KB/Mail paths, with no claim37 diagnostic; the full gate is failed. Matching browser/mobile and full approval detail acceptance remain open; source/test counts do not close the broad task.

### Build Inbox triage source handoff — 2026-10-04

Current verified at source/test level: frontend `71efa13b4` commits exactly20 claim37 paths. The global NotificationCardActions is promoted into the shared layer with its global callbacks, Snooze presets and defaults retained; the [cleanup manifest](cleanup-manifest.md#shared-notification-action-promotion--2026-10-04) records the removed path, both byte-format hashes, migrated content, updated imports and independent review. New Build Active/Later/Done tabs use accent-independent neutral selected styling. Row actions are siblings of activation, and the selected preview has shared personal triage controls. Resolve archives the notice; these controls do not mutate linked tickets or decide approvals.

Selected detail stores an ID and performs a new bounded Build-only read through the existing query owner, native cancellation, captured expectedIdentity and canonical response contract. Prior-owner or denied/missing content is redacted; 503 uses retry. Read ACK preserves a permitted preview, and triage dismisses only after a current-owner success. Mobile loading/error retains Back; explicit Escape does not reopen automatic selection. Focus/reconnect and the existing fallback policy remain authoritative; the nearest loaded Snooze expiry invalidates the list but does not prove unseen-record or durable expiry delivery.

Focused current proof: coordinator22 suites/216 tests, author8 suites/82 tests for final request/parser repair, exact18 TS/TSX lint with zero warnings, tracked diff check, root scoped `tsc --noEmit -p .scratch/tsconfig-notification-triage-ui.json`, production `pnpm -C frontend type-check`, and independent20-path/precise-delta review all pass. All TS/TSX source/test paths respect the current300-line package limit; UI-KIT is an existing Markdown registry. Fresh `pnpm -C frontend type-check:specs` fails in six unowned paths (two Calendar tests, Chat message-input-format, Wiki kb-conversation-list, KB children error policy and Mail action cache); no claim37 error remains. Prior backend full test TypeScript OOM and full release size gates remain failed.

Repeatable focused command from repository root (the exact22-suite stable run above):

```powershell
$buildInboxVerificationTests = @(
  "features/build/inbox/inbox-page.test.tsx",
  "features/build/inbox/inbox-list-type-filter.test.tsx",
  "features/build/inbox/inbox-notification-item.test.tsx",
  "features/build/inbox/use-inbox-url-state.test.ts",
  "features/build/inbox/inbox-filter-bar.test.tsx",
  "components/shared/notification-card-actions.test.tsx",
  "features/build/inbox/inbox-triage.test.tsx",
  "hooks/api/notifications-inbox-selection.test.ts",
  "features/build/inbox/inbox-offline-and-chat-gap.test.tsx",
  "features/build/inbox/inbox-list-denied.test.tsx",
  "features/build/inbox/inbox-list-shortcut-help.test.tsx",
  "features/build/inbox/inbox-keyboard-nav.test.ts",
  "features/build/inbox/inbox-bulk-toolbar.test.tsx",
  "features/notifications/notification-card-copy.test.ts",
  "features/notifications/notification-bell.test.tsx",
  "features/notifications/notification-bell-unified.test.tsx",
  "features/notifications/unified-inbox/inbox-shell.test.tsx",
  "features/notifications/unified-inbox/inbox-offline.test.tsx",
  "hooks/api/notifications-inbox-unified-sync.test.ts",
  "hooks/api/notifications-inbox-lifecycle.test.ts",
  "hooks/api/notifications-mark-all-scope.test.ts",
  "hooks/api/notifications-inbox-queries.test.ts"
)
pnpm -C frontend exec jest --runInBand --runTestsByPath @buildInboxVerificationTests
```

Current unverified: matching local desktop/mobile actions, physical cache deletion, unseen Snooze expiry, positive personal Member notification/unread transitions, full current authority/revocation races, immutable approval detail and deployment/operations. Read-only source inventory confirms both existing synthetic notification fixtures target only the acting owner and reject recipient overrides; ticket assignment requires project membership. Assigned approvals can support a no-project-reach notice only with the required approval permission, but their producer needs shared outbox dispatch disabled by this runner. Admin emit and cron dispatch are forbidden, while activation dispatch admits only the exact setup event. No unscoped dispatcher or arbitrary-recipient fixture is used as a shortcut. Existing Member/tenant denials and read target313 are bounded evidence, not a positive unread transition. These prerequisites need their own reviewed scope; no full BT stage or checkbox advances.

### Selected-read Query ownership gate — 2026-10-04

Current verified gate finding: after source37 commit71efa13b4 and bounded tests/type/review, coordinator rechecked FE-16. Official `pnpm -C frontend check:effect-fetches:self-test` passes25 self-tests; the real `check:effect-fetches` fails exactly `hooks/api/notifications-inbox.ts:51` for an API call in a fetch effect. This is a package-owned standards defect, not an unrelated baseline failure. Prior216 tests, scoped/production TypeScript and precise-delta reviews remain valid for the paths/scopes they tested, and they did not verify this gate. Claim39 reserves the existing query/factory source and three existing tests with disjoint ownership. It requires meaningful RED and Query-owned state/freshness/cancellation with actual identity/response contracts, compatible global/list data shapes and no duplicate helper/key/API owner. The standards gate, full task and browser/deployment acceptance remain open; no checkbox advances.


Current verified correction: frontend `1e0ac5bab` contains exactly the two existing query/factory sources and three existing tests of claim39; no new tracked file, schema, API, helper or source comment. A serializable per-mount lease receipt uses the existing notification-list prefix and scoped QueryClient, settles exact cancellation before enabling the current owner, combines native Query/owner abort signals, binds canonical expectedIdentity and parses the existing list contract. Query owns focus/reconnect/fallback/invalidation. Old cache, same-account reauthentication, stale completion/error and delayed Retry cannot expose a prior title or target. Ordinary global/list shapes remain compatible. Independent reviewer client_activation_design matched all five SHA256 values and cleared the complete delta.

Verification: meaningful initial RED10 with28 positive controls and later stale-title Retry RED1 preceded GREEN39. Coordinator ran the three owned suites (39 tests), exact five-file ESLint with zero warnings, diff, ignored exact-file spec TypeScript and official production `pnpm -C frontend type-check`: all pass. Effect self-tests25 plus8383-file scan and abort-signal self-tests19 plus1270 blocks/549 files pass. Compatibility run is11 suites/125 tests passed with1 suite/1 test failed at `lib/query-scope-isolation.test.tsx:133`. An independently verified Jest mapper loading byte-for-byte pre39 platform-core/base snapshots from HEAD reproduces the identical failure with8 other tests passing. The unchanged provider chooses LOADING_SCOPE and remounts during loading without initialScope; this is recorded as a failed compatibility gate, not a passed package or inferred baseline success.

Additional failed gates: response-contract self-tests13 pass but the real scan reports nine unresolved URL expressions in `notifications-inbox-actions.ts` and two in `notifications-inbox.ts`; claim40 owns the existing route expressions without expanding an allowlist or changing endpoints. Query-scope self-tests20 pass but the real scan fails the unowned inline key in `hooks/api/kb/pages.ts`; no baseline change. Full frontend spec gate remains failed in six previously recorded unowned paths; full backend spec TypeScript remains failed by10GB exhaustion. The freeze/gate receipt is retained in ignored `frontend/.scratch/notification-selected-query-freeze-20261004.json`; root confirms44 outer and47 backend unrelated changed-file hashes are preserved.

Current unverified: no new real API, database, browser/mobile, deployment or operations result was produced by39. Matching local frontend approval remains pending and the reviewed runner is stopped. Numeric unread, positive Member/object visibility, full current authority/tenant/revocation, physical cache/durable events/expiry and exact-version approvals remain open. BT-801e948e8a67 retains D proven and I/T/R/B partial/open, L open; no task checkbox advances.


Current verified route-expression correction40: frontendde5c50b2e preserves every notification URL/method/body/config/ACK and scoped/global branch, replacing only ten row URL concatenations with templates and one conditional path argument with two explicit contracted calls. Root independently reviewed both matching SHA256 values. Seven focused suites/79 tests, exact two-file lint/diff, scoped/production TypeScript and the unchanged contract scanner pass after meaningful real-gate RED. The final gate parses2531/3058 calls with527 unparsed (baseline533) and four pre-existing unresolved sites in three files; its13 self-tests pass. No allowlist/baseline/schema/key/API/helper/comment/newfile change. Query-scope KB, baseline provider compatibility, full spec and release-size failures remain recorded. No new API/database/browser/deployment proof, full BT stage or task checkbox is claimed.


### Explicit expired person module-assignment source correction — 2026-10-04

Current verified source: backendd2863e8d8 changes exactly two existing person assignment services and three existing tests under claim41. The existing unconditional org/membership/role unique key plus DO NOTHING allowed an expired requested assignment to survive a successful explicit add. Eight genuine REDs reproduce past/boundary/conflict-time expiry through actual public addMember/addGroupMember commands. Conditional conflict handling now clears only expiresAt when the exact stored tuple expires by database clock_timestamp(), including expiry during the conflict wait; existing UUID/assigner/reason/createdAt and live NULL/future expiries survive. The six-role structure, complete role/PAT/owner ceilings, tenant predicates, replacement, module deny restoration and canonical audit/version/cache owners remain unchanged.

The initial duplicate-positive assumption is disproved by canonical policy: duplicate group IDs already return400 before writes. Tests preserve this negative and no deduplication or policy relaxation is implemented. Existing one-batch coverage retains value/count behavior while removing its obsolete private DO NOTHING assertion. No new tracked file, controller, API, schema, DTO, permission key, helper, migration, code comment or live Ticket comment. The two source files stay299/218 lines; focused spec/fixture stay255/241 and the pre-existing large compatibility spec shrinks666→664.

Coordinator verification:11 focused/compatibility suites181 tests, exact five-file ESLint zero warnings/diff, scoped test TypeScript and official production `pnpm -C backend typecheck` pass. The focused set includes83 authority/renewal tests, seeded role rank/security/preservation/audit, flat revocation/write-gates, tenant group writes, grant-sampling and batch ceilings. Author10/168 and test-owner3/117 sets overlap and are not summed. Independent reviewer module_grants_resume and coordinator matched all five frozen SHA256 values and cleared the full source/test delta. Official backend freshness self-test/check passes4107 operations/4092 Zod/4107 exposure stamps; frontend vendor6 self-tests/check and generated Build93 self-tests/fresh310 hook-called operations pass at unchanged SHA1e8635e76e00a9c863db00de88fe655242b2e7a4b59054694b77ec29f3578153. No generated artifact needed regeneration or hand editing.

Current unverified: the fixture interprets compiled SQL and models assignment/grant/journal/rollback state; it proves no live PostgreSQL unique-index readiness, lock wait, effective Access, permission-version change, physical cache/event or persistence result. No API/database/browser/mobile/deployment/operations call was performed for41. Root preserves44 outer and47 backend unrelated changed-file hashes. Standing and invitation expiry writers remain excluded follow-ups; this two-command correction cannot close ARC-01 or all BLD-MODULE-REGRANT-02 clauses. Full backend test TypeScript remains failed by its recorded10GB exhaustion and was not rerun; full frontend spec, unowned KB/provider and release size gates remain open/failed. No full D/I/T/R/B/L stage or task checkbox advances.

Reproduce focused root command:

```powershell
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/module-access/__tests__/module-assignment-authority.spec.ts src/modules/module-access/__tests__/module-access-groups-rank.spec.ts src/modules/module-access/__tests__/module-access-groups-security.spec.ts src/modules/module-access/__tests__/module-access-preservation.spec.ts src/modules/module-access/__tests__/module-access-new-capabilities.spec.ts src/modules/module-access/__tests__/module-access-audit.spec.ts src/modules/module-access/__tests__/flat-member-revocation.spec.ts src/modules/module-access/__tests__/flat-member-write-gates.spec.ts src/modules/module-access/module-access-group-members-tenant-isolation.spec.ts src/modules/rbac/__tests__/role-assignment-grant-sampling.spec.ts src/modules/rbac/__tests__/role-assignment-batch.spec.ts
```

## Testing Decisions

For every closure record: frontend/backend/worker revisions; environment and synthetic tenants; actor/principal and exact role/grant; initial state; action; persisted DB/API result; console/network; audit/outbox/job/cache evidence; unauthorized/cross-tenant negative; responsive path. Existing focused tests support closure but cannot substitute browser/persistence/deployment evidence.

Gate sequence: invite acceptance → module assignment → client grant. Then membership discovery/Member contribution → filters/current cycle → release/program links → usable triage/forms/reports. Advanced whiteboard/ops breadth stays Deferred.

## Out of Scope

Claiming any bug fixed by documentation or running destructive production tests. Missing target-environment proof stays open.

## Further Notes

Detailed authorization risks remain separately documented in [RBAC review](../governance/rbac/README.md). Evidence cleanup removes duplicate copies only, never the sole report supporting an open finding.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Preserve the historical BUG/PM/UX chronology and map each named finding to a planned seam and closure evidence in [Implementation Decisions](#implementation-decisions) and [research traceability](./research-traceability.md#adopted-decisions-and-bug-hooks).
- [x] Record the enqueue-time delivery correction at backend `9046fc768` and focused 8-suite/170-test evidence; replay, manual resend, worker failure, and runtime closure stay open.
- [x] Correct BLD-INVITE-ATOMIC-02 after tracing the tenant-aware database proxy and passing four focused commit/rollback service tests; target database and worker concurrency proof remain open.
- [x] Correct the BLD-INVITE-REPLAY-03 source hypothesis after tracing the outer consumer transaction, nested savepoint, and unique inbox completion fence; target database crash proof remains open.
- [x] Trace PM-001 from internal invite through grant, guest acceptance, and external reads in the [client portal activation source audit](./client-portal-activation-gap.md); deployed behavior remains unverified.
- [x] Record the setup plan-eligibility source gap and backend `9fd0b94d2` correction with five suites/109 focused tests, typecheck, and lint; target plan/browser proof remains open.
- [x] Record the revocation source correction at backend `f3d962afe` with 343 module-access tests plus focused access/snapshot checks; group-grant and runtime proof stay open.
- [x] Record the direct role and accepted ownership-transfer regrant correction at backend `876b6f1e1` with 7 suites/84 focused tests, typecheck, and lint; group-grant and runtime proof stay open.
- [x] Record backend `9dc80badb` manual resend queue-truth source slice: 31 focused and 44 related tests, typecheck, and lint pass; owner status, worker, and target database proof remain open.
- [x] Publish the resend queue-outcome OpenAPI at backend `d6bf011f5` and validate the frontend contract at `a48b731cb` with two suites/eight tests, scoped lint, and vendor diff checks; delivery proof remains open.
- [x] Require an exact resend response at frontend `306b0a636` and present queue acceptance, provider/suppression failure, and confirmed join-link recovery at `1f608bc96`; focused contract/UI tests and scoped lint pass, browser and worker proof remain open.
- [x] Add event-scoped setup recipient receipts at backend `e1001a934` with a journalled, reversible migration and same-org references; 104 setup tests, 38 migration-integrity tests, production typecheck, and lint pass. Database and browser proof remain open.
- [ ] Reproduce each open high-priority finding on a named current frontend/backend/worker revision, actor, tenant, and initial state; keep contested BUG-007 unattributed until its original condition is reviewed.
- [ ] Verify invite acceptance, Build standing, and client grant activation in that order with actual membership/grant rows, usable entry, retry, and wrong-identity/project negatives.
- [ ] Close BLD-INVITE-DELIVERY-01, BLD-INVITE-ATOMIC-02, BLD-INVITE-REPLAY-03, BLD-INVITE-RESEND-04, BLD-INVITE-STATUS-PROVENANCE-05, BLD-MODULE-REVOKE-01, and BLD-MODULE-REGRANT-02 with exact source corrections or disproval, focused negatives, persisted event/access state, cache behavior, and owner/member browser paths.
- [ ] Resolve BLD-MIGRATION-CHAIN-01 before claiming cold database reliability; verify the `0965` prerequisite against a disposable database and preserve migration history.
- [ ] Attach network/console, audit/outbox/cache, target DB, responsive, and unauthorized-role evidence before marking an individual bug closed.

### Invitation acceptance automatically activates Build Member standing — 2026-10-04

Claim42 (cd0cd105a), supporting BT-cdb5efcb8a3a and BT-b62ed948b0cd, adds observation22 to the existing [sanitized runtime artifact](evidence/2026-10-03-build-inbox-runtime.json). Reviewed local runner15000 at isolated backend120545d96 used synthetic-only writes and local captured mail, with providers/workers disabled, and is now stopped. Current main backendd2863e8d8 separately passes13 existing invitation/auth suites and152 tests; this older runtime does not prove source41 expiry renewal. No application files, generated artifacts, migrations or code comments changed.

Current verified: one fresh reserved Member invitation with explicit Build MEMBER standing returned201; completed key replay retained its ID and a valid changed request returned422. The invalid ADMIN enum probe correctly returned400 and is distinct from that conflict. Canonical pinned Zod response schemas parsed the owned invitation/join/OTP/accept/magic/session/identity/Access/empty-Build responses. Missing OTP returned400; wrong OTP returned401 and persisted attempts1 with zero user/membership/grant/accepted-event/magic/session side effects. Correct OTP returned200; the stored invitation attributes acceptance to ACTIVE, nonowner MEMBER142. READ ONLY streamline_app proof finds structural Member2048 and Build Member2068 only, one ACCEPTED event, one accepted-seat receipt (delta0, billed count3), used OTP11/attempts2, used org-bound magic receipt and one live returned session. Replays return invitation404 and magic401 without duplicate records or assignment identities. Audit933 correlates the module grant; permissions version13→15 matches fresh Access.

Fresh /me and /me/access identify the actual human Member142, Build enabled/build:view=all, no organization-management permission, and stable repeat reads; /build returns200/empty. No project membership or module ownership is created. Private project54 returns real403, while its owner control returns200. Other synthetic owner receives404 for that same positive project and omits the exact invitation in its normal200 list. Member invitation management read/write returns real403. A valid session proof targeting the other reserved organization returns product403; a fresh nonce targeting the invited organization returns200. Other-tenant READ ONLY RLS hides the exact invitation, intent and assignment rows.

Current verified catalog: app is non-superuser/non-BYPASSRLS and cannot inherit table ownership; required indexes are ready/valid and FKs/checks validated. Invitations support tenant/public-token lookup with tenant-only writes; invitation_module_access and role_assignments have tenant RLS. OTP/magic/session tables intentionally use global identity/capability boundaries; exact joined locators do not prove tenant RLS for them. OTP DELETE is present beyond1611 explicit SELECT/INSERT/UPDATE grants. IMA has separate organization/invitation FKs, not a same-org composite FK. Current pending-invitation index follows0667 status=PENDING, while Drizzle declares accepted_at IS NULL; record this existing drift for its owning future package. No schema change belongs to42.

Current unverified: matching desktop/mobile (frontend1002 approval pending;1000 uses deployed API), portal1730/1731/client grant activation, OrgAdmin/multi-module/existing-user and authority/disable/concurrency cases, rollback after OTP consumption, physical cache/worker/provider/crash recovery and deployment/operations. Auxiliary nonempty invitation/owner-project JSON controls were checked by status/envelope/identity, not raw backend z.date parsing. The other owner has no visible project, so a new Member read of a positive foreign project remains unproven. Whole BT tasks and every broad stage remain partial/open;110 checked/412 open. Independent sanitized-artifact/source review is CLEAR at snapshot6ad13f906287cb808d546a47c609afec504b9c18c38b3d257a83797842c1c03b; earlier21 observations and all top-level metadata are preserved. Review does not repeat the database/API/browser run.
