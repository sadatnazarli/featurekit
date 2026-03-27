<p align="center">
  <h1 align="center">featurekit</h1>
</p>

<p align="center">
  <strong>The dotenv of feature flags.</strong><br/>
  Define flags in a JSON file. Get typed evaluation anywhere in your codebase.<br/>
  Zero infrastructure. Zero dependencies.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/featurekit"><img src="https://badge.fury.io/js/featurekit.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript: strict" /></a>
  <a href="#"><img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg" alt="zero dependencies" /></a>
</p>

---

## Why

You want to roll out a feature to 10% of users, or toggle something off without a redeploy. Your options are:

| Option | Problem |
|--------|---------|
| LaunchDarkly | $500+/month |
| Unleash / Flagsmith | Self-hosted — Docker, databases, maintenance |
| Hardcoded `if` statements | Scattered across your codebase, no rollout control |

featurekit gives you typed feature flags that read from a JSON file or environment variable. Same user always gets the same result. When you outgrow it, swap the adapter — same API, same code.

---

## Install

```bash
npm install featurekit
# or
pnpm add featurekit
```

> Requires Node.js 18+

---

## Quick Start

**1. Create a `flags.json`:**

```json
{
  "newDashboard": true,
  "betaFeature": {
    "enabled": true,
    "percentage": 20,
    "users": ["alice@company.com"]
  }
}
```

**2. Use it:**

```ts
import { createFlags, fileAdapter } from 'featurekit'

const flags = createFlags({
  source: fileAdapter({ path: './flags.json' }),
  defaults: { newDashboard: false, betaFeature: false },
})

// Context is automatic via middleware
app.use(flags.middleware())

app.get('/dashboard', async (req, res) => {
  if (await flags.isEnabled('newDashboard')) {
    return res.json({ dashboard: 'new' })
  }
  res.json({ dashboard: 'classic' })
})
```

> Flag names are fully typed — `flags.isEnabled('typo')` is a **compile-time error**.

---

## Flag Schema

Flags can be a simple boolean or a rule-based object:

```json
{
  "simpleFlag": true,

  "percentageRollout": {
    "enabled": true,
    "percentage": 25
  },

  "userTargeted": {
    "enabled": true,
    "users": ["alice@company.com", "usr_vip_001"]
  },

  "groupTargeted": {
    "enabled": true,
    "groups": ["admin", "beta-testers"]
  },

  "combined": {
    "enabled": true,
    "percentage": 10,
    "users": ["always@enabled.com"],
    "groups": ["beta-testers"],
    "overrides": {
      "blocked-user": false
    }
  }
}
```

### Evaluation Priority

For rule-based flags, evaluation follows a strict priority chain:

| Priority | Rule | Behavior |
|----------|------|----------|
| 1 | `enabled: false` | Flag is off — skip everything |
| 2 | `overrides[userId]` | Explicit per-user override (true or false) |
| 3 | `users` array | Match on userId or email |
| 4 | `groups` array | Match on any group the user belongs to |
| 5 | `percentage` | Deterministic hash of `flagName:userId` — same user, same result |
| 6 | Fallback | Return `enabled` value |

---

## Adapters

### File Adapter

Reads from a JSON file. **Hot-reloads on file changes** — no restart needed. If the file becomes invalid JSON, it logs a warning and keeps the previous valid state.

```ts
import { fileAdapter } from 'featurekit'

const source = fileAdapter({ path: './flags.json' })
```

### Environment Variable Adapter

Reads flags from a `FEATUREKIT_FLAGS` environment variable. Works everywhere — serverless, edge, containers.

```ts
import { envAdapter } from 'featurekit'

const source = envAdapter()
// or with a custom env var:
const source = envAdapter({ envVar: 'MY_FLAGS' })
```

### Memory Adapter

Takes a plain object. Ideal for testing.

```ts
import { memoryAdapter } from 'featurekit'

const source = memoryAdapter({
  newDashboard: true,
  betaFeature: false,
})
```

---

## Context Propagation

featurekit uses `AsyncLocalStorage` to propagate user context automatically. Set it once in middleware, read it anywhere — no argument threading through your service layers.

### Express / Fastify / Koa

```ts
app.use(flags.middleware())
```

Pass a custom extractor for your auth setup:

```ts
const flags = createFlags({
  source: fileAdapter({ path: './flags.json' }),
  defaults: { newDashboard: false },
  context: {
    extract: (req) => ({
      userId: req.auth.sub,
      email: req.auth.email,
      groups: req.auth.roles,
    }),
  },
})
```

### Background Jobs / Next.js App Router

Use `runWithContext` when middleware isn't available:

```ts
import { runWithContext } from 'featurekit'

await runWithContext(
  { userId: 'usr_123', groups: ['beta'] },
  async () => {
    const enabled = await flags.isEnabled('betaFeature')
    // ...
  }
)
```

### Explicit Context Override

Skip the automatic context and pass it directly:

```ts
await flags.isEnabled('betaFeature', { userId: 'usr_123' })
```

---

## Get All Flags

Useful for bootstrapping a frontend:

```ts
const allFlags = await flags.getAll()
// → { newDashboard: true, betaFeature: false }
```

---

## Testing

Use the memory adapter to control flag state in tests without touching files or env vars:

```ts
import { createFlags, memoryAdapter } from 'featurekit'

const flags = createFlags({
  source: memoryAdapter({ newDashboard: true, betaFeature: false }),
  defaults: { newDashboard: false, betaFeature: false },
})

// Assert behavior under specific flag states
expect(await flags.isEnabled('newDashboard')).toBe(true)
```

---

## API Reference

| Method | Description |
|--------|-------------|
| `createFlags({ source, defaults })` | Create a typed featurekit instance |
| `flags.isEnabled(name, ctx?)` | Check if a flag is enabled for the current user |
| `flags.getAll(ctx?)` | Evaluate all flags at once |
| `flags.middleware()` | Express/Fastify/Koa middleware for automatic context |
| `flags.runWithContext(ctx, fn)` | Run a function with explicit user context |
| `flags.destroy()` | Stop watching and clean up resources |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](LICENSE)
