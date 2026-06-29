import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const providers: Provider[] = [Google];

if (process.env.AUTH_MICROSOFT_ENABLED === "true") {
  providers.push(MicrosoftEntraID);
}

export default {
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user?.email);
    },
  },
} satisfies NextAuthConfig;
