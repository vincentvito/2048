import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string | null;
}

/**
 * Resolve the authenticated user from the request session (cookies).
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      username: (session.user as Record<string, unknown>).username as string | null ?? null,
    };
  } catch {
    return null;
  }
}
