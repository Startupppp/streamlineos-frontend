# Session map

S1-S6 run concurrently against exclusive territories. S7 grounds and asks its questions concurrently, then implements only at its dependency frontier. Every session reads `PROTOCOL.md` first and asks all remaining questions in one opening batch before edits.

| Session | Primary blockers received from | Primary dependents |
|---|---|---|
| S1 | None | S2, S3, S4, S5, S7 |
| S2 | S1 ticket 06 | S6, S7 |
| S3 | S1 ticket 06; S5 ticket 27 | S6, S7 |
| S4 | S1 tickets 03/06/12; S5 ticket 27 | S6, S7 |
| S5 | S1 tickets 02/03 | S3, S4, S6 |
| S6 | S2-S5 delivery evidence | S7 ticket 45 |
| S7 | S1-S6 and existing c28-34 | Final release evidence |
