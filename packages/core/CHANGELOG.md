# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-03-27

### Fixed

- Include README, LICENSE, and CHANGELOG in published npm package
- Add repository, homepage, and bugs metadata to package.json

## [0.1.0] - 2026-03-27

### Added

- `createFlags()` factory with typed flag names inferred from defaults
- Evaluation engine with priority chain: overrides → users → groups → percentage → default
- FNV-1a 32-bit deterministic hashing for percentage rollouts
- AsyncLocalStorage-based context propagation with `middleware()` and `runWithContext()`
- File adapter with hot-reload via `fs.watch`
- Environment variable adapter
- Memory adapter for testing
