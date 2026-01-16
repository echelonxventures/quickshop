-- CAT: REGISTRY / BOOTSTRAP
-- EOF

BEGIN;

-- ============================================================
-- Business: Amazon (v1)
-- ============================================================

INSERT INTO business_registry (
    code,
    name,
    type,
    status,
    owner_org,
    default_country,
    default_currency
)
VALUES (
    'amazon',
    'Amazon Marketplace',
    'marketplace',
    'active',
    'Amazon Inc',
    'US',
    'USD'
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Core Capabilities
-- ============================================================

INSERT INTO capability_registry
(code, domain, description, risk_level, idempotent, owner_team)
VALUES
('catalog.search',   'catalog', 'Search products',               'low',    true,  'catalog'),
('catalog.read',     'catalog', 'Read product detail',           'low',    true,  'catalog'),
('order.create',     'order',   'Create customer order',         'medium', false, 'order'),
('payment.authorize','payment', 'Authorize payment',             'high',   true,  'payments'),
('payment.capture',  'payment', 'Capture authorized payment',    'high',   true,  'payments'),
('refund.initiate',  'payment', 'Initiate refund',               'high',   true,  'payments'),
('ledger.post',      'ledger',  'Post immutable ledger entry',   'high',   true,  'ledger')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Amazon Capability Mapping
-- ============================================================

INSERT INTO business_capability_map
(business_code, capability_code, enabled, policy_ref)
VALUES
('amazon', 'catalog.search',    true, 'default'),
('amazon', 'catalog.read',      true, 'default'),
('amazon', 'order.create',      true, 'amazon_checkout'),
('amazon', 'payment.authorize', true, 'amazon_payment'),
('amazon', 'payment.capture',   true, 'amazon_payment'),
('amazon', 'refund.initiate',   true, 'amazon_refund'),
('amazon', 'ledger.post',       true, 'immutable_ledger')
ON CONFLICT (business_code, capability_code) DO NOTHING;

COMMIT;
