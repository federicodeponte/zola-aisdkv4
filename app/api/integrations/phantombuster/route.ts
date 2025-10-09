import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isBigQueryEnabled } from "@/lib/bigquery/env"
import { BigQueryClient } from "@/lib/bigquery/client"
import { PhantomBusterIntegrationService } from "@/lib/integrations/phantombuster-service"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const service = new PhantomBusterIntegrationService({
      supabase,
      bigquery: isBigQueryEnabled()
        ? new BigQueryClient({
            projectId: process.env.GOOGLE_PROJECT_ID!,
            location: process.env.BIGQUERY_DEFAULT_LOCATION ?? "US",
          })
        : null,
    })

    const connector = await service.connect(user.id, body)

    return NextResponse.json({ success: true, connector })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


