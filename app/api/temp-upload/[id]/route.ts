import { NextRequest, NextResponse } from "next/server"
import { tempFiles } from "@/lib/temp-storage"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id || !tempFiles.has(id)) {
    return new NextResponse("Not found", { status: 404 })
  }
  
  const content = tempFiles.get(id)!
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv',
      'Cache-Control': 'no-cache',
    }
  })
}
