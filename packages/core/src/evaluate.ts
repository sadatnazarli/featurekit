import type { FlagDefinition, RuleBasedFlag, UserContext } from "./flags.js";

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

/**
 * FNV-1a 32-bit hash. Zero dependencies, fast, good distribution.
 * Used for deterministic percentage rollouts — same input always produces the same bucket.
 *
 * @example
 * ```ts
 * fnv1a32("newDashboard:usr_123") % 100 // → deterministic 0–99
 * ```
 */
export function fnv1a32(input: string): number {
  const bytes = new TextEncoder().encode(input);
  let hash = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]!;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

function isRuleBased(flag: FlagDefinition): flag is RuleBasedFlag {
  return typeof flag === "object" && flag !== null;
}

/**
 * Evaluates a flag for a given context using a strict priority chain:
 *
 * 1. Simple boolean → return directly
 * 2. `enabled: false` → return false, skip all rules
 * 3. `overrides[userId]` → explicit per-user override
 * 4. `users` array → userId or email match
 * 5. `groups` array → any group intersection
 * 6. `percentage` → deterministic FNV-1a hash (acts as a gate — non-matching users get false)
 * 7. Fall back to `enabled`
 *
 * @example
 * ```ts
 * evaluateFlag("beta", { enabled: true, percentage: 20 }, { userId: "usr_1" })
 * ```
 */
export function evaluateFlag(
  flagName: string,
  definition: FlagDefinition,
  context?: UserContext,
): boolean {
  if (!isRuleBased(definition)) return definition;

  if (!definition.enabled) return false;

  const userId = context?.userId;
  const email = context?.email;

  // Explicit per-user override — highest priority
  if (userId && definition.overrides) {
    const override = definition.overrides[userId];
    if (override !== undefined) return override;
  }

  // User list match — userId or email
  if (definition.users) {
    if (userId && definition.users.includes(userId)) return true;
    if (email && definition.users.includes(email)) return true;
  }

  // Group match — any intersection
  if (definition.groups && context?.groups) {
    for (const group of definition.groups) {
      if (context.groups.includes(group)) return true;
    }
  }

  // Percentage rollout — deterministic per userId
  if (definition.percentage !== undefined) {
    if (!userId) return false;
    const bucket = fnv1a32(flagName + ":" + userId) % 100;
    return bucket < definition.percentage;
  }

  return definition.enabled;
}
