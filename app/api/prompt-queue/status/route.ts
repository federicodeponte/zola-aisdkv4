import { NextRequest, NextResponse } from "next/server"

import { validateUserIdentity } from "@/lib/server/api"

type StatusRequestBody = {
  userId: string
  isAuthenticated: boolean
  queueIds?: string[]
  chatId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StatusRequestBody>
    const { userId, isAuthenticated, queueIds, chatId } = body

    if (!userId || typeof isAuthenticated !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if ((!Array.isArray(queueIds) || queueIds.length === 0) && !chatId) {
      return NextResponse.json(
        { error: "Provide queueIds or chatId" },
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

    let query = (supabase as any)
      .from("prompt_queue")
      .select("id, status, priority, attempt_count, created_at, started_at, finished_at, metadata")
      .eq("user_id", userId)

    if (Array.isArray(queueIds) && queueIds.length > 0) {
      query = query.in("id", queueIds)
    }

    if (chatId) {
      query = query.eq("chat_id", chatId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Failed to fetch queue status", error)
      return NextResponse.json(
        { error: "Failed to fetch queue status" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        queue: data ?? [],
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Unexpected error fetching queue status", error)
    return NextResponse.json(
      { error: (error as Error).message ?? "Unexpected error" },
      { status: 500 }
    )
  }
}

