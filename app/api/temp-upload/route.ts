import { NextRequest, NextResponse } from "next/server"
import { tempFiles } from "@/lib/temp-storage"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    
    const content = await file.text()
    const id = Math.random().toString(36).substring(7)
    const url = `${req.nextUrl.origin}/api/temp-upload/${id}`
    
    // Store in memory (will be lost on server restart)
    tempFiles.set(id, content)
    
    // Clean up after 5 minutes
    setTimeout(() => tempFiles.delete(id), 5 * 60 * 1000)
    
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Temp upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
