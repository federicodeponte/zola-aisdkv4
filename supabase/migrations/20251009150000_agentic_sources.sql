-- Agentic data integrations schema

CREATE TABLE IF NOT EXISTS tenant_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'US',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tenant_id)
);

ALTER TABLE tenant_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_datasets_owner_policy
  ON tenant_datasets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tenant_datasets_updated_at
  BEFORE UPDATE ON tenant_datasets
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hubspot','instantly','phantombuster')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','error','disconnected')),
  masked_identifier TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY connectors_owner_policy
  ON connectors
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER connectors_updated_at
  BEFORE UPDATE ON connectors
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS connector_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hubspot','instantly','phantombuster')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','success','failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  rows_processed INTEGER,
  warnings TEXT[] DEFAULT '{}',
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE connector_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY connector_runs_owner_policy
  ON connector_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM connectors c
      WHERE c.id = connector_runs.connector_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_connector_runs_connector ON connector_runs(connector_id);
CREATE INDEX idx_connector_runs_status ON connector_runs(status);

CREATE TABLE IF NOT EXISTS connector_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL CHECK (object_type IN ('contacts','companies','deals')),
  property_name TEXT NOT NULL,
  label TEXT,
  data_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connector_id, object_type, property_name)
);

ALTER TABLE connector_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY connector_properties_owner_policy
  ON connector_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM connectors c
      WHERE c.id = connector_properties.connector_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM connectors c
      WHERE c.id = connector_properties.connector_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_connector_properties_connector ON connector_properties(connector_id);


