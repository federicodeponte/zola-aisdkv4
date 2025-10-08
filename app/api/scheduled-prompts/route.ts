import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateSchedule } from "@/lib/scheduled-prompts/processor"

export const dynamic = "force-dynamic"

// GET /api/scheduled-prompts - List user's scheduled prompts
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: prompts, error } = await supabase
      .from("scheduled_prompts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      prompts: prompts || [],
    })
  } catch (error: any) {
    console.error("Error fetching scheduled prompts:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch scheduled prompts" },
      { status: 500 }
    )
  }
}

// POST /api/scheduled-prompts - Create a new scheduled prompt
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      prompt,
      schedule_type,
      schedule_time,
      schedule_date,
      delivery_method = "chat",
      delivery_config,
    } = body

    // Validate required fields
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!schedule_type) {
      return NextResponse.json({ error: "Schedule type is required" }, { status: 400 })
    }

    // Validate schedule
    const validation = validateSchedule(schedule_type, schedule_time, schedule_date)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Create scheduled prompt
    const { data: newPrompt, error } = await supabase
      .from("scheduled_prompts")
      .insert({
        user_id: user.id,
        prompt,
        schedule_type,
        schedule_time,
        schedule_date,
        delivery_method,
        delivery_config,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      prompt: newPrompt,
    })
  } catch (error: any) {
    console.error("Error creating scheduled prompt:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create scheduled prompt" },
      { status: 500 }
    )
  }
}

// PATCH /api/scheduled-prompts - Update a scheduled prompt
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 })
    }

    // Validate schedule if being updated
    if (updates.schedule_type || updates.schedule_time || updates.schedule_date) {
      const validation = validateSchedule(
        updates.schedule_type,
        updates.schedule_time,
        updates.schedule_date
      )
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    // Update prompt (RLS will ensure user owns it)
    const { data: updatedPrompt, error } = await supabase
      .from("scheduled_prompts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!updatedPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      prompt: updatedPrompt,
    })
  } catch (error: any) {
    console.error("Error updating scheduled prompt:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update scheduled prompt" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduled-prompts - Delete a scheduled prompt
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 })
    }

    // Delete prompt (RLS will ensure user owns it)
    const { error } = await supabase
      .from("scheduled_prompts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Scheduled prompt deleted",
    })
  } catch (error: any) {
    console.error("Error deleting scheduled prompt:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete scheduled prompt" },
      { status: 500 }
    )
  }
}


