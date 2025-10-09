"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ConnectorProvider } from "@/lib/types/agentic"
import { useEffect, useState } from "react"
import { IntegrationCard } from "./integration-card"

type ConnectorStatus = {
  id: string
  provider: ConnectorProvider
  status: string
  masked_identifier: string | null
  last_synced_at: string | null
}

const CONNECTOR_METADATA: Record<
  ConnectorProvider,
  { name: string; description: string }
> = {
  hubspot: {
    name: "HubSpot",
    description: "Sync contacts and companies into BigQuery.",
  },
  instantly: {
    name: "Instantly",
    description: "Sync outreach campaign performance data.",
  },
  phantombuster: {
    name: "PhantomBuster",
    description: "Sync automation run logs and performance metrics.",
  },
}

export function IntegrationList() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/integrations/status")
        if (!response.ok) {
          throw new Error("Failed to load connectors")
        }
        const payload = await response.json()
        setConnectors(payload.connectors ?? [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load connectors"
        )
      }
    }
    void loadStatus()
  }, [])

  const handleConnect = async (
    provider: ConnectorProvider,
    payload: Record<string, unknown>
  ) => {
    const response = await fetch(`/api/integrations/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload.error ?? "Connection failed")
    }
    const payloadJson = await response.json()
    setConnectors((prev) => {
      const others = prev.filter((c) => c.provider !== provider)
      return [...others, payloadJson.connector]
    })
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load integrations</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(CONNECTOR_METADATA) as ConnectorProvider[]).map(
          (provider) => {
            const status = connectors.find((c) => c.provider === provider)
            const meta = CONNECTOR_METADATA[provider]
            return (
              <IntegrationCard
                key={provider}
                connector={{
                  provider,
                  name: meta.name,
                  description: meta.description,
                  status: status?.status,
                }}
                onConnect={handleConnect}
              />
            )
          }
        )}
      </div>
    </div>
  )
}
