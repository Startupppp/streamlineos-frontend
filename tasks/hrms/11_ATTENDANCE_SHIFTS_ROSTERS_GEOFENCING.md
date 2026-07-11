# Attendance, Shifts, Rosters And Geofencing

## Replace Hardcoded Logic
Attendance rules must come from policies.

## Features
- Check-in/out
- Missed punch
- Regularization
- Late arrival
- Early exit
- Breaks
- Shifts
- Rotational rosters
- Weekly offs
- Grace period
- Geofencing
- Biometric imports
- Remote/WFH attendance
- On-duty attendance
- Attendance anomalies

## Configurations
- shift start/end
- grace minutes
- half-day threshold
- absent threshold
- overtime threshold
- allowed locations
- device/biometric mapping

## Acceptance Criteria
- Late/absent calculation is configurable.
- Roster overrides shift default.
- Regularization uses workflow engine.
- Approved attendance summary is available for payroll.
- Payroll receives only finalized attendance, approved regularizations, payable days, unpaid absence, overtime hours, weekend/holiday work, shift allowance eligibility, and attendance penalties where configured.
- Attendance corrections after payroll lock require a payroll adjustment workflow.
