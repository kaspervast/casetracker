# CaseGraph LE — AI Build Prompt

## Objective

Build a self-hosted law-enforcement investigation case-management and link-analysis web application.

The app is for an investigation officer handling multiple cases at the same time. The officer must be able to store structured records such as:

- Case details
- Accused details
- Suspects
- Complainants
- Victims
- Witnesses
- Mobile numbers
- Bank accounts
- UPI IDs
- Email IDs
- Addresses
- Vehicles
- Devices
- Social media accounts
- Transactions
- Documents
- Evidence items
- Investigation notes
- Case diary entries
- Tasks and reminders

The app must also show relationships between all entities as an interactive graph.

This is not a public-facing app. It is an internal, self-hosted investigation record system. Security, audit logs, role-based access control, and data integrity are mandatory.

---

## Working Product Name

Use working name:

```text
CaseGraph LE
```

---

## Preferred Tech Stack

Use this stack unless there is a strong reason to change:

```text
Frontend: React + TypeScript + Vite
UI: Tailwind CSS + shadcn/ui
Graph visualization: Cytoscape.js or React Flow
Backend: FastAPI + Python
Database: PostgreSQL
ORM: SQLAlchemy
Migration: Alembic
Authentication: local username/password
Password hashing: Argon2id or bcrypt
File storage: local filesystem first, optional MinIO later
Search: PostgreSQL full-text search first, optional Meilisearch/OpenSearch later
Deployment: Docker Compose
Reverse proxy: Nginx or Caddy, optional
Export: PDF, CSV, JSON
Import: CSV/XLSX
```

Design the system so Keycloak/LDAP/SAML can be added later, but do not require it for MVP.

Build this as a production-grade MVP, not a demo.

---

## Example Data Hierarchy

The app should allow this kind of structure:

```text
Case FIR/CR No. 112/2026
├── Accused 1
│   ├── Mobile No. 98765xxxxx
│   ├── Bank Account 1234567890
│   ├── UPI ID accused1@upi
│   ├── Address A
│   ├── Vehicle GJ-xx-xx-xxxx
│   ├── Device IMEI
│   └── Social Media Account
├── Accused 2
│   ├── Mobile No.
│   ├── Bank Account
│   └── Linked to Accused 1 through transaction/contact/address
├── Suspects
├── Complainant
├── Victim
├── Witnesses
├── Evidence
├── Documents
├── Case diary
├── Tasks
└── Timeline of events
```

---

# Core Product Requirements

## 1. Dashboard

Create a dashboard showing:

- Total cases
- Active cases
- Closed cases
- Cases assigned to current officer
- Total accused
- Total suspects
- Total complainants
- Total witnesses
- Total linked mobile numbers
- Total bank accounts
- Total uploaded evidence items
- Recently updated cases
- Upcoming reminders/follow-ups
- High-priority cases
- Cases with missing required fields
- Recent audit activity
- Quick search bar

Quick action buttons:

- New Case
- Add Person
- Add Bank Account
- Add Mobile Number
- Add Evidence
- Import CSV/XLSX
- Open Graph View
- Generate Report

---

## 2. Case Management Module

Create full CRUD for cases.

### Case Fields

```text
case_id UUID
case_number / FIR number / CR number
police_station
district
city
case_title
case_type
sections_acts_applied
date_of_registration
incident_datetime
reporting_datetime
complainant_summary
investigating_officer
supervising_officer
case_status
priority
short_summary
detailed_case_narrative
tags
confidentiality_level
created_by
created_at
updated_by
updated_at
deleted_at
deleted_by
delete_reason
```

### Case Type Options

```text
Cyber fraud
Financial fraud
Narcotics
Theft
Assault
Missing person
Organized crime
Forgery
Extortion
Harassment
Banking fraud
Social media offence
Other
```

### Case Status Options

```text
Draft
Active
Under verification
Investigation in progress
Chargesheet pending
Chargesheet submitted
Closed
Transferred
Archived
```

### Priority Options

```text
Low
Medium
High
Critical
```

### Confidentiality Level

```text
Normal
Sensitive
Highly sensitive
Restricted
```

---

## 3. Person / Entity Management Module

Create flexible person/entity records.

A person can belong to multiple cases. The same person may be accused in one case and witness/suspect in another.

### Person Roles Inside a Case

```text
Accused
Suspect
Complainant
Victim
Witness
Informant
Bank account holder
SIM card holder
Vehicle owner
Relative
Associate
Unknown person
Other
```

### Person Fields

```text
person_id UUID
full_name
alias_or_nickname
father_name
mother_name
spouse_name
gender
date_of_birth
approximate_age
occupation
nationality
id_document_type
id_document_number
photo_file_id
notes
risk_level
verification_status
is_absconding
is_arrested
arrest_date
bail_status
custody_details
created_by
created_at
updated_by
updated_at
deleted_at
deleted_by
delete_reason
```

### ID Document Type Options

```text
Aadhaar
PAN
Passport
Driving licence
Voter ID
Ration card
Other
Unknown
```

### Verification Status

```text
Unverified
Partially verified
Verified
False information
```

### Risk Level

```text
Unknown
Low
Medium
High
Critical
```

### Important Rule

Allow duplicate detection based on:

- Name similarity
- Father name similarity
- Mobile number
- Bank account number
- UPI ID
- ID document number
- Address similarity
- Vehicle number
- Email ID
- Social media handle

---

## 4. Mobile Number Module

Create mobile number records.

### Mobile Fields

```text
mobile_id UUID
mobile_number
country_code
sim_provider
telecom_circle
subscriber_name
kyc_name
kyc_id
activation_date
deactivation_date
imei_used
device_id
current_status
source
verification_status
notes
created_by
created_at
updated_by
updated_at
```

### Mobile Status Options

```text
Active
Inactive
Suspended
Unknown
```

### Mobile Source Options

```text
CDR
CAF
Manual entry
Seizure
Statement
Bank record
Social media
Other
```

### Mobile Relationships

```text
Person HAS_MOBILE MobileNumber
MobileNumber USED_IN_CASE Case
MobileNumber CONTACTED MobileNumber
MobileNumber USED_DEVICE Device
MobileNumber LINKED_TO_BANK_ACCOUNT BankAccount
MobileNumber LINKED_TO_UPI UpiId
```

---

## 5. Bank Account Module

Create bank account records.

### Bank Account Fields

```text
bank_account_id UUID
bank_name
branch_name
ifsc
account_number
account_holder_name
account_type
upi_id
mobile_linked_to_bank
email_linked_to_bank
kyc_document_type
kyc_document_number
opening_date
closing_date
current_status
freeze_request_date
freeze_amount
lien_amount
total_suspicious_credit
total_suspicious_debit
source
notes
created_by
created_at
updated_by
updated_at
```

### Account Status Options

```text
Active
Frozen
Closed
Dormant
Unknown
```

### Account Source Options

```text
Bank statement
NCRP
Manual entry
Court order
Bank reply
Complainant statement
Accused statement
Other
```

### Bank Relationships

```text
Person OWNS_BANK_ACCOUNT BankAccount
Person OPERATES_BANK_ACCOUNT BankAccount
BankAccount RECEIVED_FROM BankAccount
BankAccount SENT_TO BankAccount
BankAccount LINKED_TO_MOBILE MobileNumber
BankAccount LINKED_TO_UPI UpiId
BankAccount USED_IN_CASE Case
```

---

## 6. UPI ID Module

Create UPI ID records.

### UPI Fields

```text
upi_id UUID
upi_handle
provider
linked_mobile
linked_bank_account
display_name
source
verification_status
notes
created_by
created_at
updated_by
updated_at
```

### UPI Relationships

```text
Person USES_UPI UpiId
UpiId LINKED_TO_BANK_ACCOUNT BankAccount
UpiId LINKED_TO_MOBILE MobileNumber
UpiId SENT_MONEY_TO UpiId
UpiId RECEIVED_MONEY_FROM UpiId
```

---

## 7. Transaction Module

Create transaction records.

### Transaction Fields

```text
transaction_id UUID
case_id
from_bank_account_id
to_bank_account_id
from_upi_id
to_upi_id
amount
transaction_datetime
transaction_type
reference_number
narration
source_document_id
suspicious_flag
layer_number
notes
created_by
created_at
updated_by
updated_at
```

### Transaction Type Options

```text
IMPS
NEFT
RTGS
UPI
Cash deposit
Cash withdrawal
Card
Wallet
Crypto
Cheque
Other
```

### Transaction Features

- Bulk import transactions from CSV/XLSX
- Auto-create missing bank accounts if allowed by user
- Auto-create UPI IDs if allowed by user
- Auto-generate relationships between accounts
- Show money-flow graph
- Show total received/sent by account
- Show suspicious flow
- Show layered fund movement
- Show first receiver, second layer, third layer accounts
- Filter by amount, date, account, UPI, bank, case

---

## 8. Address Module

Create address records.

### Address Fields

```text
address_id UUID
full_address
village
city
taluka
district
state
country
pin_code
latitude
longitude
address_type
verification_status
source
notes
created_by
created_at
updated_by
updated_at
```

### Address Type Options

```text
Permanent
Present
Workplace
Hideout
Crime location
Bank branch
Relative address
Rented premises
Other
```

### Address Relationships

```text
Person RESIDES_AT Address
Person WORKS_AT Address
Person VISITED Address
Case OCCURRED_AT Address
Address LINKED_TO Address
BankAccount BELONGS_TO_BRANCH Address
```

---

## 9. Vehicle Module

Create vehicle records.

### Vehicle Fields

```text
vehicle_id UUID
registration_number
vehicle_type
make
model
color
owner_name
owner_person_id
chassis_number
engine_number
registration_state
source
verification_status
notes
created_by
created_at
updated_by
updated_at
```

### Vehicle Relationships

```text
Person OWNS_VEHICLE Vehicle
Person USES_VEHICLE Vehicle
Vehicle USED_IN_CASE Case
Vehicle SEEN_AT Address
```

---

## 10. Device Module

Create device records.

### Device Fields

```text
device_id UUID
device_type
brand
model
imei_1
imei_2
serial_number
mac_address
os
phone_number_used
seizure_status
source
verification_status
notes
created_by
created_at
updated_by
updated_at
```

### Device Relationships

```text
Person OWNS_DEVICE Device
Person USES_DEVICE Device
Device USED_MOBILE MobileNumber
Device USED_IN_CASE Case
Device SEIZED_AS EvidenceItem
```

---

## 11. Email and Social Media Module

Create records for email IDs and social media accounts.

### Email Fields

```text
email_id UUID
email_address
provider
display_name
recovery_mobile
recovery_email
source
verification_status
notes
created_by
created_at
updated_by
updated_at
```

### Social Account Fields

```text
social_account_id UUID
platform
username
profile_url
display_name
linked_mobile
linked_email
source
verification_status
notes
created_by
created_at
updated_by
updated_at
```

### Relationships

```text
Person USES_EMAIL Email
Person USES_SOCIAL_ACCOUNT SocialAccount
Email LINKED_TO_MOBILE MobileNumber
SocialAccount LINKED_TO_MOBILE MobileNumber
SocialAccount LINKED_TO_EMAIL Email
```

---

## 12. Evidence and Document Module

Create evidence/document management.

### Evidence Fields

```text
evidence_id UUID
evidence_title
evidence_type
evidence_number
seizure_memo_number
sha256_hash
file_id
file_size
mime_type
uploaded_by
uploaded_at
chain_of_custody_notes
source
linked_case_id
linked_person_id
linked_mobile_id
linked_bank_account_id
confidentiality_level
notes
created_by
created_at
updated_by
updated_at
```

### Evidence Type Options

```text
Document
Image
Video
Audio
Device
Seized item
Statement
Bank record
CDR
IP log
Social media screenshot
Court order
Bank reply
Telecom reply
Other
```

### Document Features

- Upload PDF, DOCX, XLSX, CSV, images, TXT
- Store metadata
- Generate SHA256 hash
- Allow manual tagging of entities inside documents
- Version files instead of replacing them
- Later optional OCR
- Later optional full-text indexing

### File Storage Rule

Every uploaded file must be stored with:

```text
original_filename
internal_filename
sha256_hash
file_size
mime_type
uploader
timestamp
linked_case
version_number
```

Do not allow silent replacement of files. If file is changed, create a new version.

---

## 13. Generic Relationship / Link Analysis Module

Create a generic relationship system.

### Relationship Fields

```text
relationship_id UUID
source_entity_type
source_entity_id
target_entity_type
target_entity_id
relationship_type
confidence
source_of_relationship
case_id
notes
created_by
created_at
updated_by
updated_at
deleted_at
deleted_by
delete_reason
```

### Confidence Options

```text
Low
Medium
High
Confirmed
```

### Source of Relationship Options

```text
Manual
CDR
Bank statement
Document
Statement
Seizure
Field verification
Digital forensic report
Other
```

### Relationship Types

```text
ACCUSED_IN
SUSPECT_IN
COMPLAINANT_IN
VICTIM_IN
WITNESS_IN
HAS_MOBILE
HAS_BANK_ACCOUNT
HAS_ADDRESS
HAS_EMAIL
HAS_SOCIAL_MEDIA
OWNS_VEHICLE
USES_VEHICLE
USED_DEVICE
SENT_MONEY_TO
RECEIVED_MONEY_FROM
CONTACTED
ASSOCIATED_WITH
FAMILY_OF
WORKS_WITH
RESIDES_AT
OCCURRED_AT
LINKED_TO
MENTIONS
EVIDENCE_AGAINST
OPERATES_ACCOUNT
USES_UPI
SEEN_AT
SEIZED_FROM
RECOVERED_FROM
```

---

## 14. Graph View

Create an interactive graph view.

### Graph Requirements

- Show case as central node
- Show persons, mobile numbers, bank accounts, UPI IDs, addresses, vehicles, devices, documents, evidence, transactions, emails, and social accounts as nodes
- Show relationships as edges
- Different node icons/colors by entity type
- Edge label shows relationship type
- Clicking node opens side panel with entity details
- Clicking edge opens relationship details
- Filters:
  - Entity type
  - Relationship type
  - Confidence
  - Case
  - Date range
  - Source
  - Verified/unverified
  - Suspicious only
- Search inside graph
- Expand one node
- Expand all linked nodes
- Hide unrelated nodes
- Show shortest path between two entities
- Export graph as PNG/PDF
- Save graph workspace/view

### Useful Graph Layouts

```text
Case-centric graph
Person-centric graph
Bank-account money-flow graph
UPI money-flow graph
Mobile/contact graph
Address/location graph
Timeline graph
Cross-case graph
```

### Node Design

```text
Case: folder/file icon
Person: user icon
Mobile: phone icon
Bank account: bank/card icon
UPI ID: payment icon
Address: map pin icon
Vehicle: car icon
Device: laptop/mobile icon
Evidence: paperclip/file icon
Transaction: money/arrow icon
Email: mail icon
Social account: network icon
```

### Edge Design

```text
Solid edge: confirmed relationship
Dashed edge: unverified relationship
Thick edge: high-confidence relationship
Red edge: suspicious/high-risk relationship
```

---

## 15. Timeline Module

Create a case timeline.

### Timeline Event Fields

```text
timeline_event_id UUID
case_id
event_title
event_type
event_datetime
linked_person_id
linked_evidence_id
linked_document_id
linked_mobile_id
linked_bank_account_id
notes
created_by
created_at
updated_by
updated_at
```

### Event Type Options

```text
FIR registered
Statement recorded
Arrest
Bail
Transaction
Call/contact
Evidence collected
Bank freeze request
Bank reply received
Telecom reply received
Court date
Field verification
Search/seizure
Report submitted
Other
```

### Timeline View

- Chronological vertical timeline
- Filter by event type
- Filter by person/entity
- Filter by date
- Add event from case page
- Convert note to timeline event

---

## 16. Notes and Case Diary Module

Create secure notes and case diary.

### Features

- Add note under case
- Add note under person/entity
- Mark note as confidential
- Mention entities using `@entity`
- Attach files
- Convert note to timeline event
- Full audit trail
- No hard delete by normal users
- Rich text support
- Plain text export

### Note Fields

```text
note_id UUID
case_id
linked_entity_type
linked_entity_id
title
body
is_confidential
created_by
created_at
updated_by
updated_at
deleted_at
deleted_by
delete_reason
```

---

## 17. Task and Reminder Module

Create task management.

### Task Fields

```text
task_id UUID
case_id
title
description
assigned_to
due_date
priority
status
linked_entity_type
linked_entity_id
linked_document_id
notes
created_by
created_at
updated_by
updated_at
```

### Task Status Options

```text
Pending
In progress
Completed
Deferred
Cancelled
```

### Example Tasks

```text
Send bank notice
Verify address
Obtain CDR
Record statement
Follow up with bank
Prepare report
Submit court document
Verify accused identity
Collect CCTV footage
```

---

## 18. Global Search

Create global search across:

- Case number
- Person name
- Alias
- Father name
- Mobile number
- Bank account number
- UPI ID
- Address
- Vehicle number
- Email ID
- Social media username
- Document title
- Evidence title
- Notes
- Tags

Search result should show:

```text
Entity type
Matched field
Linked case
Confidentiality level
Quick open button
```

---

## 19. Duplicate Detection and Cross-Case Alerts

Add duplicate detection suggestions.

Examples:

- Same mobile number used in multiple cases
- Same bank account linked to multiple accused
- Same UPI ID in different cases
- Same address used by multiple persons
- Similar name + same father name
- Same vehicle number
- Same ID document number
- Same email ID
- Same social media handle
- Same IMEI used with multiple SIM cards
- Same bank account receiving money from multiple victims

Show alerts:

```text
Possible existing person found
Possible cross-case link found
Same bank account appears in another case
Same mobile number appears in another case
This entity may already exist
```

Do not auto-merge records. Only suggest duplicates. Merging must require officer confirmation and audit logging.

---

## 20. Reports and Export

Create report generation.

### Report Types

- Case summary report
- Accused profile report
- Suspect profile report
- Complainant profile report
- Witness list report
- Bank account report
- Money trail report
- Mobile number linkage report
- Evidence list report
- Timeline report
- Case diary report
- Graph PDF export
- Court-ready annexure style export
- Cross-case linkage report

### Export Formats

```text
PDF
CSV
JSON
PNG for graph
```

### Report Must Include

```text
Case number
Police station
Generated by
Generated date/time
Page numbers
Entity tables
Relationship summary
Graph image if requested
Audit/export watermark
Disclaimer
```

### Disclaimer Text

```text
Generated from internal investigation database. Verify with original case record before official submission.
```

### Export Security

- Watermark every PDF with username, timestamp, and case number
- Log every export
- Export allowed only based on permission
- Bulk export only for authorized roles

---

# User Roles and Access Control

Implement RBAC.

## Roles

### 1. Super Admin

- Manage users
- Manage roles
- Full system access
- Backup/restore
- View audit logs
- Change system settings

### 2. Admin Officer

- Create cases
- Assign officers
- View all cases under police station/district
- Generate reports
- View audit logs for assigned jurisdiction

### 3. Investigating Officer

- Create/update assigned cases
- Add accused/suspects/evidence
- Generate reports for assigned cases
- Assign tasks to assistant staff

### 4. Assistant Officer / Staff

- Add records to assigned cases
- Add notes/tasks
- Cannot delete
- Cannot view highly sensitive fields unless allowed

### 5. Read-only Viewer

- View assigned cases only
- Export disabled unless specifically allowed

### 6. Auditor

- View audit logs
- View case access logs
- Cannot edit case data

## Security Rule

Users must only see cases they are assigned to or permitted to view.

Every read/write/export/download action must be logged.

Authorization must be checked on the backend for every API call. Do not depend on frontend-only restrictions.

---

# Audit Logging

Audit log is mandatory.

## Log These Events

- Login success
- Login failure
- Logout
- Password change
- User created
- User disabled
- Role changed
- Permission changed
- Case viewed
- Case created
- Case updated
- Case deleted
- Case exported
- Person created
- Person updated
- Person deleted
- Bank account created/updated/deleted
- Mobile number created/updated/deleted
- Evidence uploaded
- Evidence viewed
- Evidence downloaded
- Evidence deleted
- Relationship created
- Relationship updated
- Relationship deleted
- Report generated
- Import performed
- Export performed
- Backup created
- Restore performed

## Audit Fields

```text
audit_id UUID
user_id
username
role
ip_address
user_agent
action
entity_type
entity_id
case_id
old_value_json
new_value_json
timestamp
success
failure_reason
```

---

# Data Security Requirements

Implement:

- Strong password hashing using Argon2id or bcrypt
- Session timeout
- Optional 2FA design
- HTTPS-ready deployment
- CSRF protection where applicable
- Input validation
- Server-side authorization on every API
- No trust in frontend-only permissions
- File upload validation
- File hash generation
- Encrypted backups
- Audit logs
- Soft delete for most records
- Hard delete only for Super Admin
- Database migration support
- Environment variables for secrets
- No secrets in git
- Rate limit login attempts
- Account lockout after repeated failed logins
- Inactive user disable option
- Password reset by admin
- Configurable password policy

---

# Database Design

Use PostgreSQL with UUID primary keys.

## Main Tables

```text
users
roles
permissions
user_roles
cases
case_assignments
persons
case_person_roles
mobile_numbers
person_mobile_numbers
bank_accounts
person_bank_accounts
upi_ids
person_upi_ids
addresses
person_addresses
vehicles
person_vehicles
devices
person_devices
emails
person_emails
social_accounts
person_social_accounts
transactions
evidence_items
documents
file_versions
notes
tasks
timeline_events
relationships
tags
entity_tags
audit_logs
import_jobs
import_job_rows
saved_graph_views
system_settings
```

## Common Columns for Important Tables

```text
id UUID PRIMARY KEY
created_at
created_by
updated_at
updated_by
deleted_at
deleted_by
delete_reason
```

## Soft Delete Rule

Use soft delete for normal delete operations:

```text
deleted_at
deleted_by
delete_reason
```

Hard delete should be restricted to Super Admin and should also be audited.

---

# API Requirements

Create REST API.

## Auth

```text
POST /auth/login
POST /auth/logout
POST /auth/change-password
GET /auth/me
```

## Cases

```text
GET /cases
POST /cases
GET /cases/{id}
PUT /cases/{id}
DELETE /cases/{id}
GET /cases/{id}/graph
GET /cases/{id}/timeline
GET /cases/{id}/report
GET /cases/{id}/audit
```

## Persons

```text
GET /persons
POST /persons
GET /persons/{id}
PUT /persons/{id}
DELETE /persons/{id}
GET /persons/{id}/graph
GET /persons/{id}/cases
```

## Mobile Numbers

```text
GET /mobile-numbers
POST /mobile-numbers
GET /mobile-numbers/{id}
PUT /mobile-numbers/{id}
DELETE /mobile-numbers/{id}
```

## Bank Accounts

```text
GET /bank-accounts
POST /bank-accounts
GET /bank-accounts/{id}
PUT /bank-accounts/{id}
DELETE /bank-accounts/{id}
GET /bank-accounts/{id}/transactions
```

## UPI IDs

```text
GET /upi-ids
POST /upi-ids
GET /upi-ids/{id}
PUT /upi-ids/{id}
DELETE /upi-ids/{id}
```

## Transactions

```text
GET /transactions
POST /transactions
GET /transactions/{id}
PUT /transactions/{id}
DELETE /transactions/{id}
POST /transactions/import
```

## Evidence

```text
GET /evidence
POST /evidence/upload
GET /evidence/{id}
PUT /evidence/{id}
DELETE /evidence/{id}
GET /evidence/{id}/download
```

## Relationships

```text
GET /relationships
POST /relationships
GET /relationships/{id}
PUT /relationships/{id}
DELETE /relationships/{id}
```

## Graph

```text
GET /graph/case/{case_id}
GET /graph/person/{person_id}
GET /graph/bank-account/{bank_account_id}
GET /graph/mobile-number/{mobile_id}
GET /graph/search-path?from_entity_type=&from_entity_id=&to_entity_type=&to_entity_id=
POST /graph/saved-views
GET /graph/saved-views
```

## Reports

```text
GET /reports/case/{case_id}/pdf
GET /reports/person/{person_id}/pdf
GET /reports/money-trail/{case_id}/pdf
GET /reports/evidence/{case_id}/pdf
GET /reports/timeline/{case_id}/pdf
```

## Import

```text
POST /imports/upload
POST /imports/preview
POST /imports/validate
POST /imports/confirm
GET /imports/{id}
```

## Audit

```text
GET /audit-logs
GET /audit-logs/case/{case_id}
GET /audit-logs/user/{user_id}
```

---

# Frontend Pages

Create these pages:

```text
1. Login
2. Dashboard
3. Cases list
4. Case detail
5. Create/edit case
6. Person list
7. Person detail
8. Create/edit person
9. Bank account detail
10. Mobile number detail
11. UPI detail
12. Address detail
13. Vehicle detail
14. Device detail
15. Evidence/document library
16. Graph workspace
17. Timeline view
18. Case diary/notes
19. Tasks/reminders
20. Reports page
21. Import CSV/XLSX page
22. Audit log page
23. User management
24. Role/permission management
25. Settings
```

---

# Case Detail Page Layout

Case detail page should have tabs:

```text
Overview
Persons
Accused
Suspects
Complainant
Victims
Witnesses
Mobile Numbers
Bank Accounts
UPI IDs
Transactions
Addresses
Vehicles
Devices
Emails
Social Accounts
Evidence
Documents
Timeline
Notes / Case Diary
Tasks
Graph
Reports
Audit
```

---

# Import Features

Create CSV/XLSX import wizard.

## Import Types

```text
Persons
Mobile numbers
Bank accounts
UPI IDs
Transactions
Addresses
Vehicles
Devices
Generic relationships
```

## Import Wizard Steps

```text
1. Upload file
2. Preview rows
3. Map columns to fields
4. Validate data
5. Show duplicate warnings
6. Confirm import
7. Generate import summary
8. Save import log
```

Do not silently overwrite existing records.

Imports must be transaction-safe. If validation fails, do not partially import unless user explicitly chooses partial import.

---

# Validation Rules

Add validation:

```text
Mobile number format
IFSC format
Bank account number length configurable
UPI ID format
Email format
Vehicle registration format
Required case number
Required case title
Required reason for delete
Required reason for changing sensitive fields
Prevent duplicate exact mobile number
Prevent duplicate exact bank account number unless explicitly linked
Prevent duplicate exact UPI ID unless explicitly linked
```

---

# Privacy and Operational Safety

Add these warnings/features:

- Display confidentiality banner for sensitive cases
- Watermark PDF exports with username and timestamp
- Log every export
- Log every evidence download
- Disable bulk export for low-privilege roles
- Add session timeout
- Add inactive user disable option
- Add failed login lockout
- Add backup reminder
- Add database health check
- Add app version display
- Add emergency admin account recovery process

---

# Backup and Deployment

Create Docker Compose with:

```text
frontend
backend
postgres
optional nginx reverse proxy
```

Provide:

```text
.env.example
README.md
backup.sh
restore.sh
```

## Backup Requirements

Backup must include:

```text
PostgreSQL database dump
Uploaded files
Environment configuration template
Restore instructions
```

## Deployment Requirements

Deployment must work on Ubuntu server.

Do not expose directly to the public internet.

Recommend:

```text
VPN-only access
HTTPS
Firewall
Daily encrypted backups
Restricted server access
```

---

# Seed Data

Create seed data with:

```text
Super admin user
Admin officer user
Investigating officer user
Sample police station
Sample case
3 accused
1 complainant
2 witnesses
3 mobile numbers
3 bank accounts
2 UPI IDs
5 transactions
2 addresses
1 vehicle
1 device
2 evidence records
Relationship graph between them
```

---

# Non-Functional Requirements

## Performance

```text
Must handle at least 10,000 persons
Must handle at least 100,000 transactions
Must handle at least 50,000 mobile numbers
Must handle at least 10,000 bank accounts
Graph page should lazy-load large graphs
Search should be indexed
Imports should process large CSV/XLSX files safely
```

## Usability

```text
Mobile responsive
Fast add forms
Keyboard-friendly
Clear breadcrumbs
Gujarati/English label support design, even if English is implemented first
Dark mode optional
Printable reports
Clear empty states
```

## Reliability

```text
No data loss on refresh
Transaction-safe imports
Migration-safe schema
Error logs
Health check endpoint
Automatic database migration command
```

---

# Development Phases

## Phase 1 — MVP Foundation

Build:

```text
Authentication
Dashboard
Case CRUD
Person CRUD
Mobile number CRUD
Bank account CRUD
Manual relationships
Case graph view
Audit logs
Docker Compose
Basic RBAC
```

## Phase 2 — Investigation Workflow

Build:

```text
Evidence upload
Notes
Timeline
Tasks
CSV/XLSX import
PDF reports
Duplicate detection
UPI module
Address module
Vehicle module
Device module
```

## Phase 3 — Advanced Intelligence

Build:

```text
Advanced graph filters
Money-flow graph
Full-text document search
OCR
Saved graph workspaces
Role-level field masking
Cross-case alerts
Optional Neo4j integration
Optional MinIO storage
Optional OpenSearch/Meilisearch
```

---

# AI Development Instructions

Follow these instructions strictly:

```text
Do not build everything in one messy file.
Use clean architecture.
Create backend tests for permissions, case access, and relationship creation.
Create frontend components reusable across modules.
Use environment variables for secrets.
Do not commit secrets.
Write migration files.
Write seed scripts.
Write clear README.md.
Provide Docker Compose.
Provide API documentation.
Use strict TypeScript on frontend.
Use Pydantic schemas on backend.
Use proper error handling.
Use backend authorization checks for every protected endpoint.
```

---

# Expected Final Deliverables

Deliver:

```text
1. Complete source code
2. Docker Compose setup
3. .env.example
4. Database migrations
5. Seed data
6. README.md with installation steps
7. API documentation
8. Screenshots or UI preview
9. Backup/restore guide
10. Security checklist
11. Test cases
12. Example import templates
```

---

# Recommended Project Structure

## Backend

```text
backend/
├── app/
│   ├── api/
│   ├── auth/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── security/
│   ├── utils/
│   └── main.py
├── alembic/
├── tests/
├── requirements.txt
└── Dockerfile
```

## Frontend

```text
frontend/
├── src/
│   ├── api/
│   ├── components/
│   ├── features/
│   ├── pages/
│   ├── routes/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── main.tsx
├── package.json
├── vite.config.ts
└── Dockerfile
```

## Root

```text
casegraph-le/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── README.md
├── scripts/
│   ├── backup.sh
│   └── restore.sh
└── docs/
```

---

# First Build Task for AI Coding Agent

Start by creating the full project skeleton.

Then implement in this order:

```text
1. Docker Compose with PostgreSQL, backend, frontend
2. FastAPI backend bootstrapping
3. PostgreSQL connection
4. SQLAlchemy models for users, roles, cases, persons, relationships, audit logs
5. Alembic migrations
6. Auth system
7. RBAC system
8. React frontend login page
9. Dashboard shell
10. Case CRUD
11. Person CRUD
12. Relationship creation
13. Basic graph view
14. Audit logging
15. README setup guide
```

After each phase, ensure the app runs with:

```bash
docker compose up -d --build
```

---

# Important Safety and Compliance Notes

This app is for lawful internal investigation record management.

It must not include features for:

```text
Unauthorized surveillance
Credential theft
Hacking
Covert device access
Illegal interception
Unlawful tracking
```

The system should only store information that the agency/officer is legally authorized to collect and process.

Add a visible administrative notice:

```text
This system is intended only for authorized official use. All access, exports, and evidence downloads are logged.
```

---

# Final Instruction to AI Coding Agent

Build a secure, self-hosted, production-grade MVP called CaseGraph LE. Focus first on correct data structure, permissions, audit logs, and graph relationships. UI should be clean, practical, and fast. Do not overcomplicate the first version, but design the architecture so advanced search, OCR, Neo4j, and external integrations can be added later.
