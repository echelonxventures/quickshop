/**
 * Capability Registry
 *
 * WHY THIS EXISTS:
 * Central authority that controls what the platform can execute.
 *
 * IMPACT:
 * If this registry denies a capability, the feature MUST NOT run.
 */

class CapabilityRegistry {
  constructor() {
    this.capabilities = new Map();
  }

  _key(domain, name, version) {
    return domain + ':' + name + ':v' + version;
  }

  register(capability) {
    const key = this._key(
      capability.domain,
      capability.name,
      capability.version
    );

    if (this.capabilities.has(key)) {
      throw new Error('Capability already registered: ' + key);
    }

    this.capabilities.set(key, capability);
  }

  get(domain, name, version = 1) {
    return this.capabilities.get(this._key(domain, name, version));
  }

  isEnabled(domain, name, context = {}, version = 1) {
    const cap = this.get(domain, name, version);
    if (!cap) return false;
    if (cap.status !== 'enabled') return false;

    if (cap.scope.global === true) return true;

    if (
      cap.scope.businessIds &&
      context.businessId &&
      !cap.scope.businessIds.includes(context.businessId)
    ) return false;

    if (
      cap.scope.countries &&
      context.country &&
      !cap.scope.countries.includes(context.country)
    ) return false;

    return true;
  }

  list() {
    return Array.from(this.capabilities.values());
  }
}

module.exports = {
  capabilityRegistry: new CapabilityRegistry()
};
