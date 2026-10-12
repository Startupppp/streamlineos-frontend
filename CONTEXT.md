# StreamlineOS domain language

StreamlineOS combines business records from several modules. The Calendar presents authorized time commitments while each originating module remains authoritative for its records.

## Calendar

**Calendar-native event**:
A meeting, appointment, or work block created and owned by Calendar.
_Avoid_: Generic event when the owner matters

**Source commitment**:
A time-bound obligation or milestone projected from a record owned by another module, such as a Build ticket due date or Finance close task.
_Avoid_: Copied event

**Calendar projection**:
The display-safe, actor-authorized representation of a Calendar-native event or source commitment in a requested time window. It is not an independent business record.

**Occurrence**:
One identifiable instance of a recurring event or commitment, including an exception moved away from its original time.

**Availability constraint**:
A permitted busy/free, working-time, absence, or resource-capacity fact used to evaluate a proposed slot. Its existence need not disclose its private source details.

**Source owner**:
The module or external provider authoritative for a source commitment's record, visibility, and allowed actions.
