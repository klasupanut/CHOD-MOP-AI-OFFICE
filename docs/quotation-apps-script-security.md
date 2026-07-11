# Quotation Apps Script security rollout

The CHOD webapp now sends a server-only `QUOTATION_APPS_SCRIPT_INTERNAL_SECRET` for internal quotation actions. Customer signing actions remain public only through their existing signing-token and OTP checks.

## Safe activation order

1. Deploy the updated `Code.gs` from the Auto Quotation project as a new Apps Script web-app version.
2. In **Apps Script → Project Settings → Script properties**, create a long random `INTERNAL_API_SECRET` value.
3. Add exactly the same value to Vercel as `QUOTATION_APPS_SCRIPT_INTERNAL_SECRET` for Production and Preview.
4. Confirm that an authenticated user can list quotations, save a draft, and create a signing link. Do not send a customer OTP for this check.
5. Set the Apps Script property `ENFORCE_INTERNAL_API_SECRET` to `true`.
6. Re-test internal quotation actions and one existing customer signing link.

If step 4 fails, keep `ENFORCE_INTERNAL_API_SECRET` unset/false. This preserves the existing deployment while the configuration is corrected.

## Protected actions

Internal actions such as quotation list/save/delete, settings, template/signature management, PDF upload, and signing-link creation require the internal secret once enforcement is enabled.

## Customer signing actions

The public signing path remains limited to signing-token and OTP operations: token validation, OTP request/verification, client quotation retrieval, signed-PDF upload, and signature submission. The Apps Script already retains OTP expiry, resend cooldown, maximum attempt, verified-session expiry, signing-link expiry, and used/revoked-token checks.
