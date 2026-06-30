# StreamlineOS Product Bible

# Workflow & Automation Platform

# 12_Workflow_Scheduler_And_Cron_Jobs.md

## Purpose

Define the scheduling subsystem responsible for recurring workflows, delayed execution, cron jobs, business calendars, and time-zone aware automation.

---

# Objectives

- Reliable scheduling
- Time-zone awareness
- High availability
- Distributed execution
- Business calendar support
- Fault tolerance

---

# Scheduling Types

- Immediate
- Delayed
- One-Time
- Recurring
- Cron Expression
- Event + Time Hybrid

---

# Supported Frequencies

- Every Minute
- Hourly
- Daily
- Weekly
- Monthly
- Quarterly
- Yearly
- Custom Cron

---

# Scheduler Flow

Workflow Published

↓

Scheduler Service

↓

Execution Queue

↓

Worker Pool

↓

Workflow Engine

↓

Execution History

↓

Audit Log

---

# Business Calendar

Support:

- Working Days
- Working Hours
- Public Holidays
- Organization Holidays
- Department Calendars
- Regional Calendars

---

# Time Zone Support

Store:

- UTC Timestamp
- Organization Time Zone
- User Time Zone

Always execute using the configured schedule policy.

---

# Cron Management

Features:

- Validate expressions
- Preview next executions
- Pause schedule
- Resume schedule
- Clone schedule
- Disable schedule

---

# Delayed Jobs

Support:

- Wait Until Date
- Wait Duration
- Business Day Delay
- Approval Timeout
- Reminder Delay

---

# Retry Strategy

- Configurable retry count
- Exponential backoff
- Retry window
- Dead-letter queue
- Manual replay

---

# High Availability

- Clustered schedulers
- Leader election
- Distributed locks
- Automatic failover
- Graceful shutdown

---

# Monitoring

Track:

- Upcoming jobs
- Missed executions
- Scheduler latency
- Queue depth
- Failed schedules
- Retry rate

---

# Audit Events

Track:

- Schedule Created
- Schedule Updated
- Schedule Paused
- Schedule Resumed
- Schedule Executed
- Schedule Failed
- Schedule Deleted

---

# Acceptance Criteria

- Time-zone aware
- Business calendar aware
- Cluster safe
- Highly reliable
- Production ready
