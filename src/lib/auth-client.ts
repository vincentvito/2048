"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [emailOTPClient()],
});

// Export hooks and methods for easy use
export const { useSession, signOut } = authClient;

// Extended user type with our custom fields
export interface BetterAuthUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
