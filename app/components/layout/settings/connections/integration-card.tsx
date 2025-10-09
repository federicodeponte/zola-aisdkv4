"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ConnectorProvider } from "@/lib/types/agentic"
import { useState } from "react"

type ConnectorInfo = {
  provider: ConnectorProvider
  name: string
  description: string
  status?: string
}

interface IntegrationCardProps {
  connector: ConnectorInfo
  onConnect: (
    provider: ConnectorProvider,
    payload: Record<string, unknown>
  ) => Promise<void>
}

export function IntegrationCard({
  connector,
  onConnect,
}: IntegrationCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [token, setToken] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const payload =
        connector.provider === "hubspot"
          ? { hubspotPrivateAppToken: token }
          : { apiKey: token }
      await onConnect(connector.provider, payload)
      setIsDialogOpen(false)
      setToken("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeholder =
    connector.provider === "hubspot"
      ? "hsu_..."
      : connector.provider === "instantly"
        ? "instantly_..."
        : "pb_..."

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          {connector.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">{connector.description}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
        >
          Connect
        </Button>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connector.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-foreground text-sm font-medium">
                {connector.provider === "hubspot"
                  ? "Private App Token"
                  : "API Key"}
              </label>
              <Input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={placeholder}
                type="password"
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!token || isSubmitting}>
              {isSubmitting ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
