/**
 * Bootstraps core platform capabilities.
 *
 * This runs ONCE at service startup.
 */

const { randomUUID } = require('crypto');
const { capabilityRegistry } = require('./registry');

function bootstrapCapabilities() {
  const SYSTEM = 'system';

  const capabilities = [
    {
      id: randomUUID(),
      domain: 'commerce',
      name: 'product_listing',
      version: 1,
      status: 'enabled',
      scope: { global: true },
      createdBy: SYSTEM,
      createdAt: new Date().toISOString()
    },
    {
      id: randomUUID(),
      domain: 'commerce',
      name: 'add_to_cart',
      version: 1,
      status: 'enabled',
      scope: { global: true },
      createdBy: SYSTEM,
      createdAt: new Date().toISOString()
    },
    {
      id: randomUUID(),
      domain: 'commerce',
      name: 'checkout',
      version: 1,
      status: 'enabled',
      scope: { global: true },
      createdBy: SYSTEM,
      createdAt: new Date().toISOString()
    },
    {
      id: randomUUID(),
      domain: 'payments',
      name: 'payment_capture',
      version: 1,
      status: 'enabled',
      scope: { global: true },
      createdBy: SYSTEM,
      createdAt: new Date().toISOString()
    }
  ];

  capabilities.forEach(c => capabilityRegistry.register(c));
}

module.exports = {
  bootstrapCapabilities
};
