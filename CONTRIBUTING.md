# Contributing to featurekit

## Setup

```bash
git clone https://github.com/your-org/featurekit.git
cd featurekit
pnpm install
pnpm build
pnpm test
```

## Project Structure

This is a pnpm monorepo. The core SDK lives in `packages/core/`.

```
packages/core/src/
  flags.ts       — type definitions
  evaluate.ts    — evaluation engine + FNV-1a hash
  context.ts     — AsyncLocalStorage context propagation
  featurekit.ts  — createFlags() public API
  adapters/      — source adapters (file, env, memory)
```

Tests live next to source in `__tests__/` directories and use Vitest.

## The One PR Rule

Every pull request needs:

1. **A test** — if it changes behavior, prove it works.
2. **A README update** — if it changes the public API, document it.

## Running Tests

```bash
pnpm test           # all packages
pnpm --filter @featurekit/core test  # core only
```

## Code Style

- TypeScript strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- Zero runtime dependencies in core
- No comments explaining what — comments explain why
- If it can be done in 10 lines instead of 50, do it in 10
