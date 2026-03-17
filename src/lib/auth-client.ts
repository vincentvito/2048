"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export { type AppUser, getDisplayName } from "@/features/auth/types";
// Keep BetterAuthUser as alias for backward compat during migration
export type { AppUser as BetterAuthUser } from "@/features/auth/types";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [emailOTPClient()],
});

export const { useSession, signOut } = authClient;
