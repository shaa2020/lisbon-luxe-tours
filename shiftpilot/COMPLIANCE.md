# Dutch staffing compliance support

> **Important.** ShiftPilot records registrations, checks and decisions and enforces the restrictions you configure.
> It does **not** provide legal advice, does not verify registrations with public registers, and does not guarantee
> compliance with Dutch or EU law. All compliance configuration and the employee/freelancer classification policy
> must be reviewed by a qualified legal professional before commercial launch.

## Supported capabilities

| Topic | How ShiftPilot supports it | Status |
| --- | --- | --- |
| Waadi registration | Agency registration number and verification date (`agency_settings`) | Schema + settings UI ✅ |
| Wtta authorisation | Status (`unknown`, `not_required`, `applied`, `authorised`, `suspended`, `revoked`), reference, last status change | Schema + settings UI ✅ |
| Work eligibility | Verification status and expiry per worker (`worker_private_details`); evidence documents (sensitive type); assignments require `active` workers | Schema ✅ · UI Phase 2/6 |
| Employment classification | Separate employee and freelancer pathways enforced by the database; positions declare which pathways may be offered | Schema ✅ · UI Phase 2/3 |
| Freelancer classification review | `freelancer_businesses.classification_status` is controlled by staff with `compliance.review` only (never self-set, never inferred from a KvK registration); `compliance_reviews` with approve / restrict / reject, rationale and validity; agreements link to the review | Schema ✅ · UI Phase 6 |
| Regulated positions | `job_positions.is_regulated` and regulated qualifications/certificates require manual review; never auto-approved | Schema ✅ · matching Phase 3 |
| CAO configuration | `cao_configurations` (name, version, effective dates, source reference, settings) linked to employment contracts | Schema ✅ · UI Phase 5 |
| Minimum wage | `minimum_wage_rates` by age and effective date — entered by the agency with a source reference; **no values are pre-loaded** | Schema ✅ · checks Phase 5 |
| Working time and rest | `compliance_rules` with configurable parameters (e.g. maximum shift length, minimum rest) used by matching | Schema ✅ · enforcement Phase 3 |
| Holiday allowance, pension | `employment_terms` (holiday allowance %, pension applicability/scheme) | Schema ✅ |
| Equal treatment | Contract terms category `equal_treatment`; compliance review type `equal_treatment` | Schema ✅ |
| Health and safety | `incidents` (type `health_safety`), position safety requirements, required certificates | Schema ✅ · UI Phase 6 |
| Required certificates | Position requirements (mandatory / optional), worker certificates with expiry and verification | Schema ✅ · UI Phase 2 |

## Versioning

`compliance_rules` are versioned: an active rule cannot be edited, only retired and replaced by a new version, so
historical eligibility checks remain explainable. `eligibility_checks` and decided `compliance_reviews` are immutable.

## Payroll

ShiftPilot exports approved hours and configured wage data to a payroll provider. It does **not** calculate statutory
payroll (wage tax, social security, pension contributions). Employer costs are configurable **estimates** used only
for estimated contribution margin reporting, clearly labelled as such.
