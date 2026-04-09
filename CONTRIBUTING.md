# Contributing to engram

Thanks for your interest in improving engram. Here's how to help.

## Quick Start

```bash
git clone https://github.com/NickCirv/engram.git
cd engram
npm install
npm run build
npm test
```

## What's Most Valuable

**Worked examples** are the highest-impact contribution. Run `engram init` on a real codebase, evaluate what the graph got right and wrong, and share the results in an issue or PR.

**Language extraction bugs** — if engram misses a function, class, or import in a language it supports, open an issue with the source file and what was missed.

**New language support** — add regex patterns to `src/miners/ast-miner.ts` following the existing pattern. Include test fixtures.

## Development

```bash
npm run dev          # Watch mode (auto-rebuild)
npx vitest           # Run tests in watch mode
npx vitest run       # Run tests once
npm run build        # Production build
```

## Before Submitting a PR

1. `npm run build` passes
2. `npx vitest run` passes
3. If you changed extraction logic, add a test fixture and test case
4. Keep PRs focused — one change per PR

## Code Style

- TypeScript strict mode
- ESM imports (`import`, not `require`)
- Immutable patterns (spread, not mutation)
- Functions under 50 lines
- No `console.log` in library code (only in CLI)

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
