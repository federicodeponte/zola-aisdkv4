import { validateUserIdentity } from "@/lib/server/api"
import { checkUsageByModel } from "@/lib/usage"

type CreateChatInput = {
  userId: string
  title?: string
  model: string
  isAuthenticated: boolean
  projectId?: string
  request?: Request
}

export async function createChatInDb({
  userId,
  title,
  model,
  isAuthenticated,
  projectId,
  request,
}: CreateChatInput) {
  const supabase = await validateUserIdentity(userId, isAuthenticated, request)
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      title,
      model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  await checkUsageByModel(supabase as any, userId, model, isAuthenticated)

  const insertData: {
    user_id: string
    title: string
    model: string
    project_id?: string
  } = {
    user_id: userId,
    title: title || "New Chat",
    model,
  }

  if (projectId) {
    insertData.project_id = projectId
  }

  const { data, error } = await (supabase as any)
    .from("chats")
    .insert(insertData)
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error creating chat:", error)
    return null
  }

  return data
}
