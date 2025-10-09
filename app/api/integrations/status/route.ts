import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  if (!supabase) {
    return NextResponse.json({ connectors: [] })
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ connectors: [] }, { status: 401 })
  }

  const { data, error: fetchError } = await supabase
    .from("connectors")
    .select("id, provider, status, last_synced_at, masked_identifier")
    .eq("user_id", user.id)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ connectors: data ?? [] })
}


