export type ConnectorProvider = "hubspot" | "instantly" | "phantombuster"

export interface TenantDataset {
  userId: string
  tenantId: string
  datasetId: string
  projectId: string
  location: string
  createdAt: string
  updatedAt: string
}

export interface Connector {
  id: string
  userId: string
  provider: ConnectorProvider
  status: "connected" | "pending" | "error" | "disconnected"
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
  maskedIdentifier: string | null
}

export interface ConnectorRun {
  id: string
  connectorId: string
  provider: ConnectorProvider
  status: "queued" | "running" | "success" | "failed"
  startedAt: string
  finishedAt: string | null
  rowsProcessed: number | null
  warnings: string[] | null
  error: string | null
}

export interface HubspotFieldMetadata {
  name: string
  label: string
  type: string
  group?: string
  fieldType?: string
}

export interface HubspotConnectPayload {
  hubspotPrivateAppToken: string
  contactsProperties?: string[]
  companiesProperties?: string[]
  dealsProperties?: string[]
  runAsync?: boolean
  testContactsLimit?: number
}

export interface InstantlyConnectPayload {
  apiKey: string
  runAsync?: boolean
}

export interface PhantomBusterConnectPayload {
  apiKey: string
  runAsync?: boolean
}

export type ConnectorPayload =
  | HubspotConnectPayload
  | InstantlyConnectPayload
  | PhantomBusterConnectPayload

export interface AgentPromptRequest {
  message: string
  sessionId?: string
}

export interface AgentResponse {
  user_id: string
  session_id: string
  output: string
  tenant_id: string
  dataset_id: string
}

export interface AgentErrorResponse {
  error: string
  detail?: unknown
}


