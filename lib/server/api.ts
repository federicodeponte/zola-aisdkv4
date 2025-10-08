import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { isSupabaseEnabled } from "../supabase/config"
import type { Database } from "@/app/types/database.types"

/**
 * Validates the user's identity
 * @param userId - The ID of the user.
 * @param isAuthenticated - Whether the user is authenticated.
 * @returns The Supabase client.
 */
export async function validateUserIdentity(
  userId: string,
  isAuthenticated: boolean,
  req?: Request
) {
  if (!isSupabaseEnabled) {
    return null
  }

  const bypassToken = process.env.TEST_AUTH_BYPASS_TOKEN
  const requestToken = req?.headers.get("x-test-auth-token")

  if (
    bypassToken &&
    requestToken &&
    requestToken === bypassToken &&
    userId &&
    isAuthenticated
  ) {
    const { createServerClient } = await import("@supabase/ssr")

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
        auth: {
          persistSession: false,
        },
      }
    )
  }

  const supabase = isAuthenticated
    ? await createClient()
    : await createGuestServerClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  if (isAuthenticated) {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user?.id) {
      throw new Error("Unable to get authenticated user")
    }

    if (authData.user.id !== userId) {
      throw new Error("User ID does not match authenticated user")
    }
  } else {
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("anonymous", true)
      .maybeSingle()

    if (userError || !userRecord) {
      throw new Error("Invalid or missing guest user")
    }
  }

  return supabase
}
