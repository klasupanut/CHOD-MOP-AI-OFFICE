# CHOD AI OFFICE Permission Model

## Current phase

- Runtime still uses Auth.js + Google Sheet approved-user list.
- Supabase Auth/RLS is prepared but not active.
- Approval Permission page is mock state until Supabase migration is approved.

## Team login

- Google login preferred.
- Email must exist in approved team list.
- Email comparison is case-insensitive.
- Public signup is not allowed.
- OTP is not the normal team login method.

## Customer quotation signing

- OTP/sign link is only for customers receiving quotation signing links.
- Internal approval by Tammasit/super admin is separate from customer signed status.
- SMS OTP is disabled until approved because it can cost money.

## Role responsibilities

### Tammasit / Director

- View all.
- Create/edit projects.
- Assign team members.
- Approve all quotations.
- Edit approval permissions.
- Final approval authority.

### Kla / Engineer

- View all tasks/projects.
- Engineering, renovation, fit-out review.
- Can update any task status/progress/note as team memo.
- Quotation approval only if Settings allows.

### Film / Engineer

- Quotation/document/data center.
- Submit quotation for approval.
- Can update any task status/progress/note as team memo.
- Quotation approval only if Settings allows.

### Moss / Electrical Engineer

- Solar/electrical data.
- Electrical quotation.
- Fit-out electrical scope.
- Can update any task status/progress/note as team memo.
- Electrical/solar quotation approval only if Settings allows.

### Foreman

- Assigned/site/PM tasks.
- PM/site/renovation progress.
- Can update any task status/progress/note as team memo.
- Cannot approve quotation by default.
- Cannot edit approval permissions.

## Approval button behavior

- If user has final approval permission: show Approve / Reject.
- If user can review but Tammasit final is required: show Recommend Approval.
- If user has no permission: show disabled reason.

## Settings menu

Required sections:

- General
- Team & Role
- Approval Permission
- Data Connector
- System

Only Tammasit/admin can edit Approval Permission.
