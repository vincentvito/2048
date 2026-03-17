/** Canonical user type used throughout the app. */
export interface AppUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Derive a display name from a user object. */
export function getDisplayName(user: AppUser | null | undefined): string {
  if (!user) return "Player";
  return user.username || user.name || user.email?.split("@")[0] || "Player";
}
