import { NextRequest, NextResponse } from "next/server"

import { validateUserIdentity } from "@/lib/server/api"

type CancelRequestBody = {
  queueId: string
  userId: string
  isAuthenticated: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CancelRequestBody>
    const { queueId, userId, isAuthenticated } = body

    if (!queueId || !userId || typeof isAuthenticated !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await validateUserIdentity(userId, isAuthenticated, req)

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase unavailable" },
        { status: 503 }
      )
    }

    const { data: job, error: fetchError } = await (supabase as any)
      .from("prompt_queue")
      .select("status")
      .eq("id", queueId)
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("Failed to fetch queue job", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch queued prompt" },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 }
      )
    }

    if (job.status !== "pending") {
      return NextResponse.json(
        { error: "Queue item is no longer pending" },
        { status: 409 }
      )
    }

    const { error: updateError } = await (supabase as any)
      .from("prompt_queue")
      .update({
        status: "cancelled",
        finished_at: new Date().toISOString(),
        error: { reason: "cancelled_by_user" },
      })
      .eq("id", queueId)
      .eq("user_id", userId)

    if (updateError) {
      console.error("Failed to cancel queue job", updateError)
      return NextResponse.json(
        { error: "Failed to cancel queued prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Unexpected error cancelling queue", error)
    return NextResponse.json(
      { error: (error as Error).message ?? "Unexpected error" },
      { status: 500 }
    )
  }
}

