import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGoogle, signInWithMicrosoft } from "@/app/actions/auth";
import { CHOD_LOGO_DATA_URI } from "@/lib/brand/chod-logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (session?.user?.email) redirect("/");
  const denied = params.error === "AccessDenied";
  const configurationError = params.error === "Configuration";

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <img alt="CHOD" className="login-brand-logo" src={CHOD_LOGO_DATA_URI} />
          <div><strong>CHOD MOP OFFICE</strong><span>SECURE OPERATIONS WORKSPACE</span></div>
        </div>
        <div className="login-copy">
          <span className="secure-kicker">IDENTITY VERIFIED ACCESS</span>
          <h1>Welcome to CHOD MOP OFFICE</h1>
          <p>Sign in with an approved team email. Google authentication alone does not grant access; the email must also be active in the CHOD approved-user list.</p>
        </div>
        {denied ? (
          <div className="login-alert">
            <strong>Access pending approval</strong>
            <span>Your email is not approved or your account has been disabled. Contact the CHOD Super Admin.</span>
          </div>
        ) : null}
        {configurationError ? (
          <div className="login-alert">
            <strong>Previous sign-in session expired</strong>
            <span>Press Sign in with Google again. CHOD will clear the old secure OAuth session automatically.</span>
          </div>
        ) : null}
        <div className="login-actions">
          <form action={signInWithGoogle}>
            <button type="submit" className="oauth-button"><span className="provider-icon google-icon">G</span>Sign in with Google</button>
          </form>
          {process.env.AUTH_MICROSOFT_ENABLED === "true" ? (
            <form action={signInWithMicrosoft}>
              <button type="submit" className="oauth-button"><span className="provider-icon microsoft-icon">M</span>Sign in with Microsoft</button>
            </form>
          ) : null}
        </div>
        <p className="login-footnote">Only active users approved by the Super Admin can enter. CHOD never requests or stores your provider password.</p>
      </section>
    </main>
  );
}
