import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { findApprovedUser, recordSuccessfulLogin } from "@/lib/auth/google-sheets-store";

function profileEmail(profile: Record<string, unknown> | undefined, fallback?: string | null) {
  const value = profile?.email || profile?.preferred_username || fallback || "";
  return String(value).trim().toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!account || !["google", "microsoft-entra-id"].includes(account.provider)) return false;
      const email = profileEmail(profile as Record<string, unknown>, user.email);
      if (!email) return false;
      if (account.provider === "google" && profile?.email_verified !== true) return false;
      const approved = await findApprovedUser(email);
      return Boolean(approved?.active);
    },
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.provider = account.provider;
        token.email = profileEmail(profile as Record<string, unknown>, user.email);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.provider = typeof token.provider === "string" ? token.provider : undefined;
      if (typeof token.email === "string") session.user.email = token.email;
      const approved = session.user.email ? await findApprovedUser(session.user.email) : null;
      session.user.role = approved?.role;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!account) return;
      const email = profileEmail(profile as Record<string, unknown>, user.email);
      if (email) await recordSuccessfulLogin(email, account.provider, user.name || "");
    },
  },
});
