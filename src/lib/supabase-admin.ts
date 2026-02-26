import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Creates a Supabase admin client with secret key.
 * This bypasses RLS and should only be used server-side.
 *
 * Supports both new (SUPABASE_SECRET_KEY / sb_secret_...) and
 * legacy (SUPABASE_SERVICE_ROLE_KEY) environment variable names.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both new and legacy env var names
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    console.error("[supabase-admin] Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
    return null;
  }

  if (!adminClient) {
    adminClient = createSupabaseClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
