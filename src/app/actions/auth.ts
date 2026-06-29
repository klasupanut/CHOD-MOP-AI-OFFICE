"use server";

import { signIn, signOut } from "@/auth";
import { cookies } from "next/headers";

async function clearTransientOAuthCookies() {
  const store = await cookies();
  const names = [
    "authjs.pkce.code_verifier",
    "authjs.state",
    "authjs.nonce",
    "authjs.callback-url",
    "__Secure-authjs.pkce.code_verifier",
    "__Secure-authjs.state",
    "__Secure-authjs.nonce",
    "__Secure-authjs.callback-url",
  ];

  for (const name of names) {
    store.delete(name);
  }
}

export async function signInWithGoogle() {
  // Prevent stale PKCE/state cookies after AUTH_SECRET or OAuth credentials rotate.
  await clearTransientOAuthCookies();
  await signIn("google", { redirectTo: "/" });
}

export async function signInWithMicrosoft() {
  await clearTransientOAuthCookies();
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
