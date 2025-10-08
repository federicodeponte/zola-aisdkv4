import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { processDuePrompts } from "@/lib/scheduled-prompts/processor"
import { Database } from "@/app/types/database.types"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes

// This endpoint should be called by Vercel Cron or similar scheduler
// Protect it with an authorization header
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "change_me_in_production"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create Supabase client with service role for cron job
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Process due prompts
    await processDuePrompts(supabase)

    return NextResponse.json({
      success: true,
      message: "Scheduled prompts processed",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Cron job error:", error)
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    )
  }
}


