# GDPR / AVG

> ShiftPilot provides privacy-supporting features. It does not make an agency compliant by itself. The operating agency
> (the controller) must complete its own records, lawful-basis assessments and retention schedule, reviewed by a
> qualified privacy professional before go-live.

## Roles

- **Controller:** the staffing agency operating the deployment.
- **Processors:** hosting (Supabase, Vercel or equivalent), email (Resend), messaging (WhatsApp Business), error
  monitoring (Sentry) and any configured accounting/payroll provider. Data processing agreements are required for each.
- EU-region hosting should be selected for the database and storage (DEPLOYMENT.md).

## Data inventory

| Category | Tables | Subjects | Typical lawful basis* |
| --- | --- | --- | --- |
| Account | profiles, user_sessions | all users | contract / legitimate interest (security) |
| Worker profile | workers, worker_skills, worker_languages, worker_experience, worker_availability | workers | contract / pre-contract |
| Sensitive worker data | worker_private_details (DOB, address, emergency contact, verification statuses) | workers | legal obligation (work eligibility), contract |
| Documents | documents, document_versions | workers, freelancers, clients | legal obligation / contract |
| Employment | employment_contracts, employment_terms, wage_rates, leave_records, payslips | employees | contract, legal obligation (payroll records) |
| Freelance | freelancer_businesses, freelancer_agreements, freelancer_invoices | freelancers | contract, legal obligation (bookkeeping) |
| Recruitment | applications, interviews, screening_records | applicants | pre-contract steps / consent (talent pool) |
| Attendance | attendance_events (optional location), timesheets | workers | contract; location: legitimate interest or consent, after assessment |
| Client contacts | client_contacts, client_memberships | client staff | legitimate interest / contract |
| Communication | notifications, messages, notification_deliveries | all users | contract / legitimate interest |

\* To be confirmed by the controller in `processing_activities`.

**Data minimisation decisions:** no BSN or identity-document numbers are stored (payroll providers collect statutory
identifiers directly); identity and work eligibility are recorded as verification statuses; clients see only a minimal
worker projection; location is never tracked continuously.

## Features

| Requirement | Support |
| --- | --- |
| Records of processing | `processing_activities` (purpose, lawful basis, categories, recipients, retention, measures; versioned) |
| Consent records | `consent_records` — append-only, per purpose and notice version (location verification, talent pool, WhatsApp, marketing) |
| Privacy notices | Public `/privacy` page; applications store the notice version and acknowledgement time; location verification requires an agency notice (DB constraint) |
| Data subject requests | `data_subject_requests` (access, export, rectification, erasure, restriction, objection) with a one-month due date and a list of records retained under legal obligations |
| Retention | `data_retention_records` per data category and table; applications carry `retention_until`; `document_types.retention_months` |
| Access logs | `audit_logs` (changes), `user_sessions` (sign-in activity) |
| Breach response | `breach_records` (detection, risk assessment, authority notification within 72 h, subject notification, measures) |
| Security of processing | See SECURITY.md |

The DSR/retention **user interfaces and automated export/anonymisation jobs are Phase 6 work** (see DEVELOPMENT_STATUS.md).

## Retention guidance (to be confirmed)

Dutch law commonly requires payroll and bookkeeping records to be kept for 7 years and copies of identity documents
for employees for 5 years after employment ends. Applicant data is typically deleted within 4 weeks after the
procedure unless consent for a talent pool is given. These are indications only — the controller must confirm the
applicable periods.

## Breach response procedure

1. Contain (revoke keys/sessions, block access) and record in `breach_records`.
2. Assess risk to data subjects within 24 hours.
3. Notify the Autoriteit Persoonsgegevens within 72 hours where required; notify affected individuals if the risk is high.
4. Record measures taken and lessons learned; close the record.
