# CHOD MOP AI OFFICE

## Run locally

Open PowerShell or Command Prompt in this project folder and keep it open:

```bash
npm install
npx auth secret
npm run dev
```

Copy `.env.example` to `.env.local` and configure OAuth and the Users sheet before signing in.

Open:

http://localhost:3010

Before opening the browser, you can run the local guardrail check:

```bash
npm run preflight
```

If localhost is stuck, repair the dev server automatically:

```bash
npm run dev:repair
```

For same-Wi-Fi testing, use the LAN dev script:

```bash
npm run dev:lan
```

Then other devices on the same Wi-Fi can open the app with this computer's LAN IP:

```bash
http://YOUR-LAN-IP:3010
```

Example:

```bash
http://172.16.140.214:3010
```

If port 3010 is busy and you intentionally want a temporary fallback:

```bash
npm run dev:3001
```

Then open:

http://localhost:3001

Port 3010 is the CHOD MOP OFFICE safe port and avoids clashing with Warehouse Dashboard on `localhost:3000`:

```bash
npm run dev
```

Then open:

http://localhost:3010

## Open from anywhere

`localhost` only works on this computer. `YOUR-LAN-IP:3010` only works on the same Wi-Fi.

To open the webapp from any Wi-Fi / outside the office, use one of these zero-cost-first paths:

### Option A — Cloudflare Tunnel temporary public URL

This exposes the local dev server through a public HTTPS URL while this computer stays on.

```bash
npm run dev
cloudflared tunnel --url http://localhost:3010
```

Or use the shortcut:

```bash
npm run tunnel:chod
```

Requirements:

- Install `cloudflared` first.
- Keep this computer awake.
- Keep both the Next.js terminal and tunnel terminal open.
- Do not put sensitive production data online unless auth is working.
- If Cloudflare asks for billing or paid plan, stop and ask for approval first.

### Option B — Deploy as a real hosted webapp

Use Cloudflare Pages or Vercel free tier for a stable public URL.

This is the correct long-term solution because it does not depend on this computer or Wi-Fi.

Before deployment:

- Do not expose `.env.local`.
- Move secrets to the hosting provider's server-side environment variables.
- Keep `NEXT_PUBLIC_AI_MODE=mock`.
- Keep Microsoft disabled unless needed.
- Use a safe auth fallback while `chod.mopteam@gmail.com` is under Google appeal.
- If any provider asks for billing, card, paid plan, or usage charge, stop and get explicit approval first.

## Verify the project

```bash
npm run typecheck
npm run build
```

After `npm run build`, repair/restart the local dev server before browser testing:

```bash
npm run dev:repair
```

Fast local health endpoint:

```bash
http://localhost:3010/api/health
http://localhost:3010/api/health?deep=1
```

`deep=1` also probes the public Fit-out Google Sheet with a short timeout.

## Troubleshooting

- If the browser cannot open the app, check that the terminal running `npm run dev` is still open.
- If `localhost:3010` is stuck or times out, run `npm run dev:repair`.
- If you want a full preflight check, run `npm run preflight`.
- Do not close the terminal while using the web app.
- If port 3010 is busy, run `npm run dev:3001` and open `http://localhost:3001` only as a temporary fallback.
- If `localhost:3000` shows Warehouse Dashboard, use `npm run dev` and open `http://localhost:3010`.
- If a module is missing, run `npm install`.
- If the app reports a build or TypeScript error, run `npm run typecheck`.
- If an old build behaves incorrectly, stop the server, delete `.next`, then run `npm run dev` again.
- After test/browser QA, dry-run cleanup with `npm run cleanup:test`. To actually delete safe temp artifacts, run the cleanup script with `-Apply`.
- If the browser tab favicon does not update immediately, hard refresh the browser or open the app in an incognito/private window because browsers cache favicons aggressively.

## Project notes

- The project uses npm and keeps `package-lock.json`.
- Mock data is enabled by default.
- OpenAI and Supabase remain optional.
- Character data lives in `src/data/agents.ts`.
- Character assets live in `public/assets/characters/`.
- Office assets live in `public/assets/office/`.

The office uses a clean-room base, separate station layers, exact foreground occlusion, and Thailand-time lighting in UTC+7.

## Real deployment architecture plan

The app is being prepared for Vercel + Supabase, but it must still run locally without Supabase.

Prepared docs:

- `docs/DEPLOYMENT_VERCEL.md`
- `docs/SUPABASE_SCHEMA_PLAN.md`
- `docs/RLS_POLICY_PLAN.md`
- `docs/PERMISSION_MODEL.md`
- `supabase/README.md`

Current phase:

- Supabase schema is drafted only.
- No Supabase migration has been applied.
- Runtime still uses Auth.js + Google Sheet approved users.
- Google Sheet remains a data connector/fallback.
- Approval Permission settings are still mock state until migration approval.
- Quotation customer OTP/sign-link flow is separate from internal team login.

Cost rule:

- Use Google Sheet / Supabase within free tier where possible.
- OTP is only for sending quotation sign links to customers.
- SMS OTP is disabled unless explicitly approved.
- Any paid plan, billing requirement, card request, paid SMTP, paid SMS, AI API usage, or quota overage must be reported and approved before enabling.

## Zero-cost policy

This local MVP must operate without a paid cloud plan:

- Do not enable Google Cloud Billing or start a Google Cloud free trial.
- Do not attach a credit/debit card to the project.
- Google Sign-In, the Google Sheets API, and a service account are used only within their no-cost quotas.
- Microsoft Entra app registration is used without a paid Microsoft Entra subscription.
- OpenAI, Supabase, hosted databases, and paid deployment services remain disabled by default.
- If a provider changes its free limits, requires billing, or presents a chargeable option, stop setup and obtain the project owner's explicit approval before proceeding.
- Keep `NEXT_PUBLIC_AI_MODE=mock` and `NEXT_PUBLIC_SHOW_AI_HQ=false`; AI must never run automatically on page load.

The Google Cloud project and team-owned spreadsheet should be controlled by `chod.mopteam@gmail.com`. A personal account must not be the long-term owner.

## Authentication and approved users

The app uses Auth.js with Google as the active primary provider. Microsoft Entra ID support is implemented but disabled until the team has a Microsoft account. OAuth verifies identity, then the server checks the same case-insensitive approved-user list in a team-owned Google Sheet. A successful provider login does not grant access by itself.

Required `.env.local` values:

```env
AUTH_SECRET=
AUTH_URL=http://localhost:3010
NEXTAUTH_URL=http://localhost:3010
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_MICROSOFT_ENABLED=false
AUTH_MICROSOFT_ENTRA_ID_ID=
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/common/v2.0/
SUPER_ADMIN_EMAIL=chod.mopteam@gmail.com
NEXT_PUBLIC_AI_MODE=mock
NEXT_PUBLIC_SHOW_AI_HQ=false
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID_USERS=
```

`chod.mopteam@gmail.com` is always treated as the active Super Admin and cannot be disabled or demoted.

### Google Cloud OAuth setup

1. Sign in to Google Cloud using `chod.mopteam@gmail.com`.
2. Create or select a team-owned Google Cloud project.
3. Configure the OAuth consent screen.
4. Create an **OAuth client ID → Web application**.
5. Add authorized JavaScript origin `http://localhost:3010`.
6. Add redirect URI `http://localhost:3010/api/auth/callback/google`.
7. Put the client ID and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
8. Add the production origin and production callback URL before deployment.

The current Google OAuth app is published as **In production** and requests only `openid`, `profile`, and `email`. Google proves the email identity; CHOD access remains controlled by the active approved-user row in the team sheet.

### Microsoft Entra ID setup

This provider is optional and currently disabled. Keep `AUTH_MICROSOFT_ENABLED=false`; no Microsoft account or paid subscription is required for the Google-only MVP.

1. Open Microsoft Entra admin center and create an App registration.
2. Choose the account type needed. To support Outlook/Hotmail and Microsoft 365, allow organizational directories and personal Microsoft accounts.
3. Add Web redirect URI `http://localhost:3010/api/auth/callback/microsoft-entra-id`.
4. Create a client secret.
5. Set the Application (client) ID and secret in `AUTH_MICROSOFT_ENTRA_ID_ID` and `AUTH_MICROSOFT_ENTRA_ID_SECRET`.
6. Keep the `common` issuer for personal and work accounts, or replace it with a tenant-specific issuer to restrict Microsoft sign-in to one organization.
7. Set `AUTH_MICROSOFT_ENABLED=true` only after the credentials are configured and tested.

### Team-owned Users sheet

1. Create a Google Sheet owned by `chod.mopteam@gmail.com`.
2. Enable **Google Sheets API** in the team Google Cloud project.
3. Create a service account and private key.
4. Share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as Editor.
5. Put the spreadsheet ID in `GOOGLE_SHEET_ID_USERS`.
6. Run `node scripts/initialize-users-sheet.mjs` once to verify the service account and create/initialize the `Users` and `Audit` tabs.
7. Sign in as the Super Admin and open **Settings → Users & Permissions**.

Google Apps Script does **not** need to be updated or deployed. The app uses the Google Sheets REST API from the server with a service account.

If Google returns `InvalidCheck` after OAuth credentials or `AUTH_SECRET` are rotated, return to `/login` and press **Sign in with Google** again. The app clears stale transient OAuth cookies before starting a new sign-in.

### Roles and testing

- **Super Admin:** can assign every role, including Super Admin, and manage all permissions.
- **Admin:** can manage lower roles but cannot create, edit, disable, or assign Super Admin.
- **Management:** broad operational and quotation access without Settings.
- **Quotation Staff:** quotation workflow access without destructive/settings permissions by default.
- **Operations:** operational modules with quotation view only.
- **Viewer:** read-oriented modules; no Settings or quotation access by default.

To test each role, add a separate approved email in **Users & Permissions**, assign the role, sign out, then sign in with that email. Also test:

1. An email absent from the sheet receives Access pending approval.
2. Disabling an approved user blocks the next protected page/API request even if an old OAuth session cookie exists.
3. Viewer cannot see or directly open `/settings/users`.
4. A user without `quotation.view` cannot see or directly open `/quotations`.
5. Logout returns to `/login`; refresh preserves a valid signed session.
6. Unauthenticated requests to internal APIs return HTTP 401.

### Current security limitations

- Google Sheets is suitable for this first small-team version but is not transactional and is slower than a database under concurrent administration.
- Audit writes are best-effort; a temporary Google API outage can prevent an audit row from being appended.
- OAuth provider secrets and the Google service-account private key must be protected as server-only environment variables and rotated if exposed.
- No invitation email, SCIM provisioning, MFA enforcement policy, or centralized session revocation dashboard is included yet.
