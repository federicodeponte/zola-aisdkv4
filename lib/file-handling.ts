import { toast } from "@/components/ui/toast"
import { SupabaseClient } from "@supabase/supabase-js"
import * as fileType from "file-type"
import { DAILY_FILE_UPLOAD_LIMIT } from "./config"
import { createClient } from "./supabase/client"
import { isSupabaseEnabled } from "./supabase/config"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  // Check if the file type is in our allowed list
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    // Special handling for text-based files that might not have a MIME type
    const textExtensions = ['.txt', '.csv', '.md', '.json']
    const hasTextExtension = textExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!hasTextExtension) {
      return {
        isValid: false,
        error: "File type not supported",
      }
    }
  }

  // For binary files, verify the magic bytes match the extension
  const binaryTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  if (binaryTypes.includes(file.type)) {
    const buffer = await file.arrayBuffer()
    const type = await fileType.fileTypeFromBuffer(
      Buffer.from(buffer.slice(0, 4100))
    )
    
    if (!type || type.mime !== file.type) {
      return {
        isValid: false,
        error: "File content doesn't match its extension",
      }
    }
  }

  return { isValid: true }
}

export async function uploadFile(
  supabase: SupabaseClient,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `uploads/${fileName}`

  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(filePath, file)

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("chat-attachments").getPublicUrl(filePath)

  return publicUrl
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: file.name,
    contentType: file.type,
    url,
  }
}

export async function processFiles(
  files: File[],
  chatId: string,
  userId: string
): Promise<Attachment[]> {
  const supabase = isSupabaseEnabled ? createClient() : null
  const attachments: Attachment[] = []

  for (const file of files) {
    const validation = await validateFile(file)
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error)
      toast({
        title: "File validation failed",
        description: validation.error,
        status: "error",
      })
      continue
    }

    try {
      let url: string
      
      if (supabase) {
        url = await uploadFile(supabase, file)
        const { error } = await supabase.from("chat_attachments").insert({
          chat_id: chatId,
          user_id: userId,
          file_url: url,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })

        if (error) {
          throw new Error(`Database insertion failed: ${error.message}`)
        }
      } else {
        // Use temporary upload endpoint for testing without Supabase
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/temp-upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error('Failed to upload file temporarily')
        }
        
        const { url: tempUrl } = await response.json()
        url = tempUrl
      }

      attachments.push(createAttachment(file, url))
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
    }
  }

  return attachments
}

export class FileUploadLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_FILE_LIMIT_REACHED"
  }
}

export async function checkFileUploadLimit(userId: string) {
  if (!isSupabaseEnabled) return 0

  const supabase = createClient()

  if (!supabase) {
    toast({
      title: "File upload is not supported in this deployment",
      status: "info",
    })
    return 0
  }

  const now = new Date()
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )

  const { count, error } = await supabase
    .from("chat_attachments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfToday.toISOString())

  if (error) throw new Error(error.message)
  if (count && count >= DAILY_FILE_UPLOAD_LIMIT) {
    throw new FileUploadLimitError("Daily file upload limit reached.")
  }

  return count
}
