# CHOD AI OFFICE — Vercel Deployment Plan

This document prepares deployment only. Do not deploy until the project owner approves.

## Zero-cost rule

- Start with Vercel Hobby only.
- Do not add paid team seats, paid analytics, paid storage, or paid add-ons without approval.
- If Vercel asks for billing, card, upgrade, or paid usage, stop and report before continuing.

## GitHub to Vercel

1. Push the repo to GitHub when the owner approves.
2. In Vercel, import the GitHub repository.
3. Framework preset: Next.js.
4. Install command: `npm install`
5. Build command: `npm run build`
6. Output directory: Next.js default.

## Required scripts

```json
{
  "dev": "next dev -p 3000",
  "build": "next build",
  "start": "next start -p 3000",
  "typecheck": "tsc --noEmit"
}
```

## Environment variables

Set secrets in Vercel Project Settings. Never commit `.env.local`.

```env
NEXT_PUBLIC_APP_NAME=CHOD AI OFFICE
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_AUTH_PROVIDER=google

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=

GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID_TASK_PROJECT=
GOOGLE_SHEET_ID_QUOTATION=
GOOGLE_SHEET_ID_SOLAR=
GOOGLE_SHEET_ID_DOCUMENTS=
```

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Never prefix service role key with `NEXT_PUBLIC_`.
- Keep mock mode available until Supabase migration is verified.
- Quotation customer OTP/sign-link flow is separate from team login.
- SMS OTP is disabled unless explicitly approved.

## Preview test checklist

1. Preview deployment builds successfully.
2. Login flow works with approved email.
3. Office menu renders.
4. Tasks, Projects, Quotations, Approvals load without server errors.
5. Approvals remain quotation-only.
6. Quotation customer signing status remains separate from internal approval status.
7. No secret appears in browser source, console, or network payload.

## Rollback

- Use Vercel previous deployment rollback.
- Set `NEXT_PUBLIC_USE_SUPABASE=false` if Supabase connection fails.
- Keep Google Sheet/mock fallback working during migration.
