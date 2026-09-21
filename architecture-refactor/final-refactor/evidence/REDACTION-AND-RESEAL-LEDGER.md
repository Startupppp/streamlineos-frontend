# Redaction and re-seal ledger — the superseded (former-head) evidence set

**Written 2026-09-02 by the code-release-10-10 ticket-04b redactor.**
Scope: the 13 files covered by `artifact-hashes.json` in this directory, plus the two notices that
describe them. **Nothing in `bootstrap-head-637/` was read-modified, re-hashed or re-sealed.**

A hash seal exists so that nobody can quietly alter evidence. This ledger exists because **I altered
evidence**, and that must be loud rather than silent. Everything below is here so that a reader who
does not trust me can reconstruct exactly what moved, and check it themselves.

## Why the seal was broken, and why I am replacing it

Two separate defects, both found and reported by the ticket-04 recorder in
[`SUPERSEDED-FORMER-HEAD.md`](SUPERSEDED-FORMER-HEAD.md), neither of which the recorder fixed:

**Defect A — disclosure.** Three of the sealed files carried password-redacted but otherwise
complete connection URIs naming a **real remote endpoint host**, the **database role**, and the
**two real remote database names**. Password-redacted is not removed: the endpoint identity was
still in a repository bound for `main`. The old seal's own `note` stated a weaker rule than the
release rule — *"Connection strings in bootstrap logs are redacted to `postgresql://user:***@host`
before hashing"* — and that weaker rule is what had actually been applied.

**Defect B — a broken seal.** `s02-bootstrap-parity.md` and `s02-tenant-integrity.md` had been
edited after sealing and the hash file was never updated. The ticket-04 recorder then legitimately
prepended a `⛔ SUPERSEDED — FORMER HEAD` banner to each, which moved the hashes again. Verifying
the old seal at the start of this ticket gave **match=11 mismatch=2 missing=0 of 13**.

`SUPERSEDED-FORMER-HEAD.md` left an owner two honest options: **(1)** scrub and re-hash, recording
the pre-scrub hashes and the reason so the edit is itself auditable, or **(2)** delete the
superseded set outright. **Option 1 was taken.** Nothing was deleted. Every hash state that has
ever been recorded for these files is preserved below and inside the new `artifact-hashes.json`.

The old seal's note is also **factually wrong about its own method** and is not carried forward: no
redaction transform was ever applied at hashing time. The eleven `.log` hashes match the raw bytes
on disk exactly, which is only possible if the recorded digests were taken over the files as
written. The redaction it describes was applied to the *log content* when the logs were captured
(the password already appears as `***`), not to the *bytes fed to sha256*. The replacement seal
hashes the exact bytes on disk, with no transform, and says so.

## The redaction convention

Applied uniformly to every connection URI and every bare-host line in the superseded set:

| real identifier | replaced by | why |
|---|---|---|
| the Neon endpoint hostname | `<neon-host>` | names real remote infrastructure |
| the database role in the URI userinfo | `<db-role>` | names a real role on that infrastructure |
| the control-plane database | `<db-control-plane>` | names a real remote database |
| the cell database | `<db-cell>` | names a real remote database |
| `scratch_boot_a` / `_b` / `_c` | **kept, unchanged** | ephemeral throwaway test fixtures, named openly throughout this tree, the release runbooks and `bootstrap-head-637/`; they carry the "which side was compared" meaning that makes each line readable as evidence |

The evidence still reads as evidence. `A: postgresql://<db-role>:***@<neon-host>/scratch_boot_b`
versus `B: …/scratch_boot_c` still shows that two **different** databases were compared and which
was which — the only fact those lines were ever there to establish. Every count, every result,
every command flag and every exit code is untouched.

Loopback identity lines such as `127.0.0.1:5432/scratch_boot_b as tarunchintakunta` were
deliberately **left alone**: they name no remote infrastructure and they are part of the proof that
a given run was local.

## What was changed, line by line

Ten lines in three files. Nothing else in the tree was edited.

| file | lines changed | what was on them |
|---|---|---|
| `parity-boot-b-vs-c.log` | 2, 3, 8, 9 | control-plane URI, cell URI, parity A-side URI, parity B-side URI |
| `parity-boot-b-vs-c-v2.log` | 2, 3, 298, 299 | same four |
| `s02-bootstrap-parity.md` | 20, 87 | `Connection host:` line (bare host), one `COLD_DATABASE_URL=` example |

Replacement counts, machine-produced:

    parity-boot-b-vs-c.log      host=4 role=4 control-plane-db=1 cell-db=1
    parity-boot-b-vs-c-v2.log   host=4 role=4 control-plane-db=1 cell-db=1
    s02-bootstrap-parity.md     host=2 role=1 control-plane-db=0 cell-db=0

`s02-tenant-integrity.md` **needed no redaction** — it contains no connection URI and no endpoint
host. Its hash moved only because of the ticket-04 banner, and again because of the ticket-04b
banner amendment described below.

Both `s02-*.md` files also received a **second banner paragraph**, immediately under the ticket-04
banner, recording this redaction and the re-seal. That amendment was required for honesty: the
ticket-04 banner asserts *"Nothing below it was altered"*, which stopped being true of
`s02-bootstrap-parity.md` the moment I redacted line 20 and line 87. Leaving a now-false statement
standing in evidence would be a worse defect than the edit it describes.

## Hash ledger — every state, for every affected file

`shasum -a 256` over the exact bytes on disk. No transform.

### The two narrative documents — four states each

| state | `s02-bootstrap-parity.md` | `s02-tenant-integrity.md` |
|---|---|---|
| **(1)** recorded in the original `artifact-hashes.json` | `a6e9b72647e856775232f2b0e4e1c45dcc0274489d2c11c7a99b50e9b05c1b4d` | `0403ee05d49c9434cce0b3a69ab347eff8b8e222f1fca6d70927ddd4548a68af` |
| **(2)** actually on disk before the ticket-04 banner *(recorded by ticket 04, not re-observable here)* | `adb0d5dc5e42c0b21c7f3baee9baa18acb35fe89cd3c9c7cdffc90cbd304910a` | `bcb9714f8aed67daa3531a3801e43b4ad3efa7f0d8798bdc807aa72314f713c4` |
| **(3)** after the ticket-04 banner — **verified by me at the start of this ticket** | `2e49745b16054ce136ee84472f4a73c311c7ab9135683d0ddc3bbd5efaf7a300` | `87555306baa4c33506665bb18c6a96bbcb03695787cdb27da01affd35bc93013` |
| **(3a)** after redaction, before the ticket-04b banner amendment | `4b4f2b386adee7dd15fa3707d369ada0e610a8c7e411a57c65f1e6a258fd7e8f` | *(no redaction — unchanged from (3))* |
| **(4)** current, and what the new seal records | `de6b8a6e26925440e4ab68f31916c639fbe9cdf49b71075ebef2dec562b55eb2` | `dcdf2a48c50431f0b9334d53b0145c8aabb0b561ded25bccddb091a970529520` |

State **(1) → (2)** is an edit **nobody has an audit record for** — it happened before this session,
between sealing and ticket 04's arrival, and the hash file was not updated. It is the original sin
here and it is **not** closed by this ledger; it is only made visible by it. States (2), (3), (3a)
and (4) are each attributable to a named actor and reason.

The (2) values are quoted from `SUPERSEDED-FORMER-HEAD.md`. They are the one row here I did **not**
observe myself: by the time this ticket started, the banner was already applied, so the pre-banner
bytes no longer existed on disk. I verified the (3) values independently and they match ticket 04's
table exactly, which is the strongest corroboration of the (2) row available without the original
bytes.

### The two redacted logs — two states each

| file | before redaction (= the original sealed value, verified intact) | after redaction (= new sealed value) |
|---|---|---|
| `parity-boot-b-vs-c.log` | `045b2f87d0b7d5550b66cd9283f8daebcf45678acb489607ef9cc06740482cb2` | `5254020bdff3a444e8a1ba66601a3e380eb3abec503fc174b56ab972c127b738` |
| `parity-boot-b-vs-c-v2.log` | `3bbe1680dc30a3955229d2625fb9ee1eeac868dbbe05ad71bbc4e1217c53f20e` | `a53c1bcdc302327887abb30f5bafaf16bd3d57d253f24c05a3c43317b39c87d1` |

Both of these **matched their original seal immediately before I edited them**. The chain of custody
on the log bodies is therefore unbroken from the original sealing right up to the redaction, and the
redaction itself is the only discontinuity.

### The nine untouched logs — byte-identical across the whole affair

Their original sealed digests are carried into the new seal **unchanged**, which is the check that
this re-seal did not quietly rewrite anything it was not supposed to:

    eb68b97b5b42ba7404427d43d678ed4136478ae899b0e9de58b424798c8aa042  apply-0000-b2-v2.log
    3339672e09bf095033628116e1f0abdfb131f715c4b8183ea6226f4756f15bb2  apply-0000-b2.log
    3372e417874d8368ab4aac6e81529fe7f1b1b320081d7f67ef67b33b5eb8894d  apply-0000-c2.log
    292466e4b3a56498830ffd99690d3c433a6a46f15af4e61e09e06444f2b4fb65  replay-boot-b-partial-v2.log
    cd53a1917df20a9e08b9a70f508c650a8571bc4481eb8762c00d8518d5cbc48d  replay-boot-b-partial.log
    18ba985d6c8eec7205927a3601f1aeb7e6509da1d65faf8333f116853ad60555  replay-boot-b-resume-v2.log
    7f80f7c26c86812349679d1cdec15a6158d700674f84ba712f1045d3afafcb6e  replay-boot-b-resume.log
    13735a381ab2329436248a549d189430af946dec906c0c3e8a6921422b7d456f  replay-scratch-boot-c-v2.log
    3e569f17cfa951f58857814955d6d0159af988705f93b2ddd99aacae7bd7aa67  replay-scratch-boot-c.log

### The two notices, which are not in the sealed set but which I also changed

| file | before this ticket | after this ticket |
|---|---|---|
| `SUPERSEDED-FORMER-HEAD.md` | `b79e3bb853493e7941fdcc650f62b4ab87418b64a8f52ed46206091a15f79e59` | `6f0601ba990cec5f2931e142da58f1a200be30f278d340e04c5047c7f5c31375` |
| `artifact-hashes.json` | `4cdbc40abc14bc48196e593d9e7a1a9a233226c8d6ea8d1208f3cce2a415f0ee` | *(the seal cannot record its own digest; compute it directly)* |

`SUPERSEDED-FORMER-HEAD.md` changed in exactly two places: the two `## Open finding —` headings became
`## RESOLVED 2026-09-02 by ticket 04b — …`, and a quoted resolution paragraph was inserted under each.
**Both finding bodies are left below their headings word for word.** Nothing the ticket-04 recorder
wrote about what they found was edited, softened or removed.

Neither notice was in the original seal and neither is in the replacement seal's `hashes` map — the
seal's scope is deliberately still the same 13 files, so that `match=13` is directly comparable with
the `match=11 mismatch=2 of 13` measured before this ticket. Both are instead anchored by digest in
the seal's `attestation` block.

### The old seal file itself

    4cdbc40abc14bc48196e593d9e7a1a9a233226c8d6ea8d1208f3cce2a415f0ee  artifact-hashes.json (as it stood before this ticket)

Its full contents — `generatedAt`, `note`, `fileCount` and all 13 recorded digests — are copied
verbatim into the `previousSeal` block of the replacement `artifact-hashes.json`, so the replacement
is self-contained: a reader needs no history and no other file to see what the previous seal claimed.

## Who, and on whose authority

Changed by the **code-release-10-10 ticket-04b redactor** (an automated agent), on 2026-09-02, under
a ticket that explicitly directed option 1 of the two options `SUPERSEDED-FORMER-HEAD.md` put to an
owner. No git command was run by this agent; the orchestrator owns git. No source file, migration,
script, schema or PRD line was touched — only files under
`architecture-refactor/final-refactor/evidence/` outside `bootstrap-head-637/`, plus this ticket's
own report.

## How to check this yourself

    cd architecture-refactor/final-refactor/evidence

    # 1. the replacement seal verifies over the current bytes
    node -e '
      const {createHash}=require("crypto"),fs=require("fs");
      const s=JSON.parse(fs.readFileSync("artifact-hashes.json","utf8"));
      let m=0,x=0;
      for(const [f,h] of Object.entries(s.hashes)){
        const a=createHash("sha256").update(fs.readFileSync(f)).digest("hex");
        a===h?m++:(x++,console.log("MISMATCH",f));
      }
      console.log(`match=${m} mismatch=${x} of ${Object.keys(s.hashes).length}`);
    '

    # 2. nine of the thirteen digests are identical in previousSeal and hashes
    node -e '
      const fs=require("fs"), s=JSON.parse(fs.readFileSync("artifact-hashes.json","utf8"));
      const same=Object.keys(s.hashes).filter(k=>s.previousSeal.hashes[k]===s.hashes[k]);
      console.log("carried forward unchanged:",same.length,same.sort().join(" "));
    '

    # 3. no remote endpoint survives anywhere in the tree
    grep -rEn "neon\.tech|\.aws\.|ep-[a-z0-9]+-[a-z0-9]+" . ; echo "exit=$?  (1 == clean)"

    # 4. ticket 04's bundle is untouched and still self-verifies 28/28
    cd bootstrap-head-637 && find . -type f ! -name artifact-hashes.json | sort | xargs shasum -a 256

## What this ledger does not fix

- The **(1) → (2)** edit still has no author and no reason. This ledger records that the gap exists;
  it cannot close it.
- Re-sealing does **not** make the superseded evidence current. Everything in
  `SUPERSEDED-FORMER-HEAD.md` still stands: a 634-entry journal, a name-only parity comparator, and
  tenant gates with measured blind spots. A verifying seal proves the bytes have not moved since
  2026-09-02; it proves nothing about whether the measurements inside them are still true.
- Database names in **prose** (`neondb`, `cell2` written as words in a sentence, e.g. "the
  side-effect cell comparison, neondb vs cell2") were deliberately **not** redacted. They are not
  endpoints, they carry the technical narrative, and `bootstrap-head-637/` — which is freshly sealed
  and must not be rewritten — names them the same way throughout. Redacting them here alone would
  break the parallel between the two documents while removing nothing that is actually reachable.
  This is a judgement call and it is recorded here so it can be overturned rather than discovered.
