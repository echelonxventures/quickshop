/**
 * Manual verification test.
 * Run with: node test-capabilities.js
 */

const { bootstrapCapabilities } = require('./bootstrap');
const { capabilityRegistry } = require('./registry');

console.log('BOOTSTRAP');
bootstrapCapabilities();

console.log('LIST');
console.log(capabilityRegistry.list());

console.log('TEST add_to_cart (expected true)');
console.log(
  capabilityRegistry.isEnabled(
    'commerce',
    'add_to_cart',
    { businessId: 'amazon-like', country: 'IN' }
  )
);

console.log('TEST invalid capability (expected false)');
console.log(
  capabilityRegistry.isEnabled('commerce', 'hack_system')
);
