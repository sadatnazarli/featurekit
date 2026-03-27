// Public API
export { createFlags } from "./featurekit.js";
export type { FeatureKitConfig, FeatureKit } from "./featurekit.js";

// Evaluation engine
export { evaluateFlag, fnv1a32 } from "./evaluate.js";

// Context propagation
export { getContext, runWithContext, createMiddleware } from "./context.js";

// Adapters
export { fileAdapter } from "./adapters/file.js";
export { envAdapter } from "./adapters/env.js";
export { memoryAdapter } from "./adapters/memory.js";

// Types
export type {
  SimpleFlag,
  RuleBasedFlag,
  FlagDefinition,
  FlagMap,
  UserContext,
} from "./flags.js";
export type { SourceAdapter } from "./adapters/interface.js";
