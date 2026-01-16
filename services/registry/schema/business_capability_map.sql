-- CAT: REGISTRY / BUSINESS-CAPABILITY MAP
-- EOF

CREATE TABLE IF NOT EXISTS business_capability_map (
    map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    business_code VARCHAR(64) NOT NULL
        REFERENCES business_registry(code)
        ON DELETE CASCADE,

    capability_code VARCHAR(128) NOT NULL
        REFERENCES capability_registry(code)
        ON DELETE CASCADE,

    enabled BOOLEAN NOT NULL DEFAULT false,

    policy_ref VARCHAR(128),

    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (business_code, capability_code)
);

CREATE INDEX IF NOT EXISTS idx_bcm_enabled
    ON business_capability_map(business_code, enabled);
