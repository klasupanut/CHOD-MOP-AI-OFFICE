# Supabase RLS Policy Plan

This is a policy plan only. Do not apply until reviewed.

## Required rules

- Enable RLS on every exposed table.
- No anonymous write access.
- `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Do not use editable `user_metadata` for authorization.
- Use `profiles.role`, `profiles.is_active`, and `approval_permissions`.
- UPDATE policies need both `USING` and `WITH CHECK`.

## Role model

- `director`: Tammasit, final approval authority.
- `engineer`: Kla / Film.
- `electrical_engineer`: Moss.
- `foreman`: Foreman.
- `admin`: system administration.

## Policy concept

### profiles

- Authenticated users can read active profiles.
- Users can read their own profile.
- Only admin/director can update team role/is_active/agent mapping.

### projects

- Authenticated active team can read projects.
- Director/admin can create/edit all projects.
- Engineers can create/edit fit-out/renovation/engineering projects.
- Moss can create/edit solar/electrical projects.
- Foreman can update site progress fields if assigned.

### tasks

- Authenticated active team can read tasks.
- Any active team member can update task status/progress/note because tasks are team memo/tracking.
- Assignments and destructive edits remain restricted to director/admin or permitted project owners.

### quotations

- Authenticated active team can read allowed quotation rows.
- Quotation staff/engineers can create quotation drafts.
- Internal approval status is controlled by quotation approval flow.
- Customer signing status is separate and updated by signing flow.

### quotation_approvals

- Authenticated active team can read quotation approval requests.
- Only users allowed by `approval_permissions` can approve/reject/recommend.
- Tammasit/director/admin can final approve.

### approval_permissions

- Active team can read enough permission information for UI display.
- Only Tammasit/director/admin can update.

### documents

- Prepared for future.
- No public writes.

### activity_logs

- Active team can read operational logs if permitted.
- Server-side code inserts logs.
- Client should not directly mutate logs.

## Cost guardrail

- Email OTP is only for customer quotation sign links.
- Team login should use Google/Supabase Auth.
- SMS OTP is disabled unless explicitly approved because it can create cost.
- Paid SMTP/provider changes require approval.
