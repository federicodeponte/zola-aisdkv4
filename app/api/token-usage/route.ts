import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserTokenStats } from "@/lib/tools/token-tracking"

export const dynamic = "force-dynamic"

// GET /api/token-usage - Get user's token usage statistics
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const period = (req.nextUrl.searchParams.get("period") as
      | "today"
      | "week"
      | "month"
      | "all") || "month"

    const stats = await getUserTokenStats(supabase, user.id, period)

    return NextResponse.json({
      success: true,
      period,
      stats,
    })
  } catch (error: any) {
    console.error("Error fetching token usage:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch token usage" },
      { status: 500 }
    )
  }
}


