import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../app/types/database.types"

type UploadParams = {
  supabase: SupabaseClient<Database>
  file: File
  pathPrefix?: string
}

export async function uploadFileToBucket({
  supabase,
  file,
  pathPrefix = "uploads",
}: UploadParams): Promise<{ publicUrl: string; storagePath: string }> {
  const extension = file.name.split(".").pop() ?? "bin"
  const storagePath = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error } = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET.bucketName).upload(storagePath, file)

  if (error) {
    throw new Error(`Failed to upload file to Supabase storage: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CHAT_ATTACHMENT_BUCKET.bucketName).getPublicUrl(storagePath)

  return { publicUrl, storagePath }
}

type RecordParams = {
  supabase: SupabaseClient<Database>
  chatId: string
  userId: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}

export async function recordFileMetadata({
  supabase,
  chatId,
  userId,
  fileUrl,
  fileName,
  fileType,
  fileSize,
}: RecordParams) {
  const { error } = await supabase.from("chat_attachments").insert({
    chat_id: chatId,
    user_id: userId,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
  })

  if (error) {
    throw new Error(`Failed to persist chat attachment metadata: ${error.message}`)
  }
}

export type BucketInfo = {
  bucketName: string
  suggestedPolicies: string[]
}

export const CHAT_ATTACHMENT_BUCKET: BucketInfo = {
  bucketName: "chat-attachments",
  suggestedPolicies: [
    "Allow uploads for authenticated users",
    "Allow public read access to chat attachments",
  ],
}

