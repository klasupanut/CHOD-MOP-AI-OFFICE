import Link from "next/link";
import { logout } from "@/app/actions/auth";

export default function AccessDeniedPage() {
  return (
    <main className="login-shell">
      <section className="login-card access-card">
        <span className="secure-kicker">ACCESS CONTROL</span>
        <h1>Access denied</h1>
        <p>Your account is not active or does not have permission to open this module.</p>
        <div className="login-actions">
          <Link className="oauth-button centered-button" href="/">Return to Office</Link>
          <form action={logout}><button className="text-button" type="submit">Sign out</button></form>
        </div>
      </section>
    </main>
  );
}

