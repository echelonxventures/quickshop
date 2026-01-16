-- CAT: REGISTRY / BUSINESS
-- EOF

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS business_registry (
    business_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,

    type VARCHAR(64) NOT NULL
        CHECK (type IN ('marketplace', 'service', 'subscription', 'platform')),

    status VARCHAR(32) NOT NULL
        CHECK (status IN ('draft', 'active', 'frozen', 'retired')),

    owner_org VARCHAR(255) NOT NULL,

    default_country CHAR(2) NOT NULL,
    default_currency CHAR(3) NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    version INT NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_registry_status
    ON business_registry(status);
