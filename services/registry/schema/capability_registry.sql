-- CAT: REGISTRY / CAPABILITY
-- EOF

CREATE TABLE IF NOT EXISTS capability_registry (
    capability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(128) NOT NULL UNIQUE,
    domain VARCHAR(64) NOT NULL,

    description TEXT NOT NULL,

    risk_level VARCHAR(16) NOT NULL
        CHECK (risk_level IN ('low', 'medium', 'high')),

    idempotent BOOLEAN NOT NULL DEFAULT true,
    versioned BOOLEAN NOT NULL DEFAULT true,

    owner_team VARCHAR(128) NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capability_domain
    ON capability_registry(domain);
