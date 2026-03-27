/** A flag that is simply on or off. */
export type SimpleFlag = boolean;

/**
 * A flag with targeting rules. Evaluation follows a strict priority chain:
 * overrides → users → groups → percentage → enabled.
 */
export type RuleBasedFlag = {
  enabled: boolean;
  /** Deterministic percentage rollout (0–100). Same userId always gets the same result. */
  percentage?: number;
  /** User IDs or emails that always see this flag as enabled. */
  users?: string[];
  /** Groups/roles — flag is enabled if the user belongs to any listed group. */
  groups?: string[];
  /** Per-user explicit overrides. Highest priority — supports both true and false. */
  overrides?: Record<string, boolean>;
};

/** A flag definition — either a simple boolean or a rule-based object. */
export type FlagDefinition = SimpleFlag | RuleBasedFlag;

/** A map of flag names to their definitions. */
export type FlagMap = Record<string, FlagDefinition>;

/**
 * User context for flag evaluation. Propagated automatically via AsyncLocalStorage
 * or passed explicitly to `isEnabled()`.
 */
export type UserContext = {
  userId?: string;
  email?: string;
  groups?: string[];
  /** Extensibility hook for future custom rules. */
  attributes?: Record<string, unknown>;
};
