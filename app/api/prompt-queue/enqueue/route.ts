import { NextRequest, NextResponse } from "next/server"

import { validateUserIdentity } from "@/lib/server/api"
import { checkUsageByModel } from "@/lib/usage"

type EnqueueRequestBody = {
  userId: string
  chatId: string
  model: string
  messages: Array<{ content: string; role: string }>
  isAuthenticated: boolean
  systemPrompt?: string | null
  attachments?: Array<{ name?: string; url: string; contentType?: string }>
  enableSearch?: boolean
  metadata?: Record<string, unknown>
  priority?: number
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnqueueRequestBody
    const {
      userId,
      chatId,
      model,
      messages,
      isAuthenticated,
      systemPrompt,
      attachments,
      enableSearch = true,
      metadata,
      priority,
    } = body

    if (!userId || !chatId || !model) {
      return NextResponse.json(
        { error: "Missing required fields: userId, chatId, model" },
        { status: 400 }
      )
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required" },
        { status: 400 }
      )
    }

    const supabase = await validateUserIdentity(userId, isAuthenticated, req)

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client unavailable" },
        { status: 503 }
      )
    }

    await checkUsageByModel(supabase as any, userId, model, isAuthenticated)

    const jobPayload = {
      model,
      messages,
      attachments: attachments ?? [],
      systemPrompt: systemPrompt ?? null,
      enableSearch,
      isAuthenticated,
    }

    const insertPayload = {
      user_id: userId,
      chat_id: chatId,
      job: jobPayload,
      status: "pending" as const,
      priority: typeof priority === "number" ? priority : 0,
      metadata: metadata ?? {},
    }

    const { data, error } = await (supabase as any)
      .from("prompt_queue")
      .insert(insertPayload)
      .select("id, status, priority, created_at")
      .single()

    if (error || !data) {
      console.error("Failed to enqueue prompt", error)
      return NextResponse.json(
        { error: "Failed to enqueue prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        queue: {
          id: data.id,
          status: data.status,
          priority: data.priority,
          createdAt: data.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unexpected error enqueuing prompt", error)
    return NextResponse.json(
      { error: (error as Error).message ?? "Unexpected error" },
      { status: 500 }
    )
  }
}

