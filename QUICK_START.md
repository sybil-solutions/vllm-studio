<!-- CRITICAL -->
# Quick Start: Dependency & Code Quality Tools

This repository now has **comprehensive dependency and code quality detection**.

## Installation

First, install the new dependencies in each app:

```bash
# Controller
cd controller && bun install

# CLI
cd cli && bun install

# Frontend
cd frontend && npm install
```

## Run All Checks

```bash
# Controller (6 checks total)
cd controller && bun run check
# ✅ Type check (tsc)
# ✅ Lint (ESLint)
# ✅ Dead code detection (knip)
# ✅ Duplicate code detection (jscpd)
# ✅ Unused dependencies (depcheck)
# ✅ Tests (vitest)

# CLI (6 checks total)
cd cli && bun run check
# Same 6 checks

# Frontend (4 checks)
cd frontend && npm run check
# ✅ Type check (Next.js)
# ✅ Dead code detection (knip)
# ✅ Duplicate code detection (jscpd)
# ✅ Unused dependencies (depcheck)
# Tests run separately: npm test
```

## What Each Tool Does

| Tool | Detects | Auto-Fix |
|------|---------|----------|
| **knip** | Unused files, exports, dependencies | ✅ `knip --fix` |
| **depcheck** | Unused npm packages | ❌ Manual removal |
| **jscpd** | Duplicate code blocks | ❌ Refactor needed |
| **ESLint** | Code quality issues | ✅ `lint:fix` |

## CI Pipeline

All checks run automatically on every PR:

```
Pull Request → CI Pipeline → 6 Checks → Pass/Fail
                                    ↓
                        2-3 minutes (parallel jobs)
```

## Quick Commands

```bash
# Check for issues before committing
bun run check

# Auto-fix what's possible
bun run check:fix

# Run specific tools
bunx knip           # Dead code
bunx depcheck        # Unused deps
bunx jscpd src       # Duplication
bun run lint:fix     # Code style
```

## What Gets Checked

### Dead Code (knip)
- Unused exports
- Unused files
- Unused dependencies
- Unlisted dependencies (used but not in package.json)

### Unused Dependencies (depcheck)
- npm packages not imported in code
- Missing dependencies (used but not listed)

### Duplicate Code (jscpd)
- Copy-pasted functions
- Similar logic blocks
- Repeated patterns

## Stats

**Before**: No automated dependency detection
**After**: 3 tools, 6 checks per app, 100% coverage

## Next Steps

1. Install dependencies: `cd controller && bun install`
2. Run checks: `bun run check`
3. Fix any issues found
4. Commit with confidence! 🚀

---

*Generated: 2025-01-25*
