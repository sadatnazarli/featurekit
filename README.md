# featurekit

The dotenv of feature flags. Define flags in a JSON file, get typed evaluation anywhere in your codebase — zero infrastructure, zero dependencies.

## Why

You want to roll out a feature to 10% of users, or toggle something off without a redeploy. Your options are LaunchDarkly ($500+/month), self-hosted Unleash (Docker, databases, maintenance), or hardcoded `if` statements scattered across your codebase. None of these work for a small team shipping fast.

featurekit gives you typed feature flags that read from a JSON file or environment variable. Same user always gets the same result. When you outgrow it, swap the adapter — same API, same code.

## Install

```bash
npm install featurekit
# or
pnpm add featurekit
```

## Quick Start

Create a `flags.json`:

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

Use it:

```ts
import { createFlags, fileAdapter } from 'featurekit'

const flags = createFlags({
  source: fileAdapter({ path: './flags.json' }),
  defaults: { newDashboard: false, betaFeature: false },
})

// In an Express app — context is automatic via middleware
app.use(flags.middleware())

app.get('/dashboard', async (req, res) => {
  if (await flags.isEnabled('newDashboard')) {
    return res.json({ dashboard: 'new' })
  }
  res.json({ dashboard: 'classic' })
})
```

Flag names are fully typed — `flags.isEnabled('typo')` is a compile-time error.

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

For rule-based flags, evaluation follows this order:

1. `enabled: false` → flag is off, skip everything
2. `overrides[userId]` → explicit per-user override (true or false)
3. `users` array → match on userId or email
4. `groups` array → match on any group the user belongs to
5. `percentage` → deterministic hash of `flagName:userId`, same user always gets the same result
6. Fall back to `enabled` value

## Adapters

### File Adapter

Reads from a JSON file. Hot-reloads on file changes — no restart needed.

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

## Context Propagation

featurekit uses `AsyncLocalStorage` to propagate user context automatically. Set it once in middleware, read it anywhere.

### Express / Fastify / Koa

```ts
app.use(flags.middleware())
```

The middleware reads `userId`, `email`, and `groups` from the request. Pass a custom extractor for your auth setup:

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

## Explicit Context Override

Skip the automatic context and pass it directly:

```ts
await flags.isEnabled('betaFeature', { userId: 'usr_123' })
```

## Get All Flags

Useful for bootstrapping a frontend:

```ts
const allFlags = await flags.getAll()
// → { newDashboard: true, betaFeature: false }
```

## License

MIT
