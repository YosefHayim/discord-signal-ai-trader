# Project Intelligence Guide for AI Agents

> **Purpose**: Make AI coding assistants behave like senior engineers who understand this codebase, reuse existing patterns, and follow established conventions.
>
> **Standard**: This file follows the [agents.md](https://agents.md/) universal specification, supported by Claude Code, Cursor, Cline, Gemini CLI, and 20+ AI tools.

---

## Quick Navigation

- [Project Architecture](#project-architecture)
- [Anti-Duplication Rules](#anti-duplication-rules-critical)
- [Code Style & Patterns](#code-style--patterns)
- [Bug Understanding Protocol](#bug-understanding-protocol)
- [Self-Improvement Protocol](#self-improvement-protocol)
- [Progress Tracking Protocol](#progress-tracking-protocol-mandatory)
- [Task Master Workflow](#task-master-workflow)

---

## Project Architecture

### Directory Structure

<!-- TEMPLATE: This is the recommended structure. Customize for your project. -->

```
{{PROJECT_NAME}}/
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React/framework hooks
│   ├── utils/             # Helper functions and utilities
│   ├── lib/               # Third-party integrations
│   ├── services/          # API calls and business logic
│   └── types/             # TypeScript type definitions
├── tests/                 # Test files (mirror src/ structure)
├── docs/
│   └── PROJECT_RULES.md   # Project-specific patterns (YOU CUSTOMIZE THIS)
├── .taskmaster/           # Task Master AI configuration
└── AGENTS.md              # This file - AI agent instructions
```

### Key Files Reference

| File | Purpose | When to Check |
|------|---------|---------------|
| `progress-project.md` | **Single source of truth** for project state | **After EVERY task completion** |
| `docs/PROJECT_RULES.md` | Project-specific patterns & conventions | Before implementing ANY feature |
| `src/components/index.ts` | Component exports registry | Before creating new components |
| `src/utils/index.ts` | Utility function exports | Before creating helper functions |
| `src/types/index.ts` | Shared TypeScript types | Before defining new types |
| `CHANGELOG.md` | Version history | After completing features |

---

## Anti-Duplication Rules (CRITICAL)

> **Philosophy**: Every line of duplicated code is a future bug waiting to happen.
> Senior engineers don't copy-paste; they abstract and reuse.

### Mandatory Pre-Implementation Checklist

Before writing ANY new code, complete this checklist:

```
┌─────────────────────────────────────────────────────────────────┐
│  MANDATORY SEARCH CHECKLIST                                     │
│                                                                 │
│  [ ] Search for existing components in src/components/          │
│  [ ] Search for similar utilities in src/utils/ and src/lib/    │
│  [ ] Check type definitions in src/types/                       │
│  [ ] Review docs/PROJECT_RULES.md for established patterns      │
│  [ ] Search codebase for similar functionality                  │
└─────────────────────────────────────────────────────────────────┘
```

### Search Commands

```bash
# Find similar components
grep -ri "ComponentName" src/components/
find src/components -name "*.tsx" | xargs grep -l "similar-keyword"

# Find similar utilities
grep -r "export function\|export const" src/utils/ src/lib/

# Find similar types
grep -r "interface\|type " src/types/

# General codebase search
grep -ri "keyword" src/
```

### Decision Matrix

| Similarity to Existing | Action |
|------------------------|--------|
| 0-30% | Create new (document why) |
| 30-70% | Consider composition or wrapper |
| 70-90% | Extend existing with new props/options |
| 90-100% | **USE EXISTING** - do not create |

### The Reuse Hierarchy

Always prefer options higher in this list:

1. **Use existing** - Exact or near-exact match exists
2. **Configure existing** - Pass different props/options
3. **Compose existing** - Combine multiple existing pieces
4. **Extend existing** - Add new capability to existing code
5. **Fork and modify** - Copy then customize (document why)
6. **Create new** - Truly novel requirement (document why)

### Required Documentation for New Code

When creating new components/utilities (options 5-6 above), include:

```typescript
/**
 * @description Brief description of what this does
 * @rationale Why existing code couldn't be used or extended
 * @see RelatedComponent - for similar functionality
 */
```

### The "Three Strikes" Rule

If you find yourself writing similar code for the **third time**:

1. **STOP** - This is now a pattern
2. **EXTRACT** - Create a reusable abstraction
3. **DOCUMENT** - Add to `docs/PROJECT_RULES.md`
4. **REFACTOR** - Update the first two instances

---

## Code Style & Patterns

> **Full Reference**: See `docs/PROJECT_RULES.md` for project-specific patterns.
> This section provides the template structure.

### Technology Stack

<!-- TEMPLATE: Update in docs/PROJECT_RULES.md -->

| Layer | Technology |
|-------|------------|
| Frontend Framework | `{{FRONTEND_FRAMEWORK}}` |
| Styling | `{{STYLING_SOLUTION}}` |
| State Management | `{{STATE_MANAGEMENT}}` |
| Backend Framework | `{{BACKEND_FRAMEWORK}}` |
| Database | `{{DATABASE}}` |
| Testing | `{{TEST_FRAMEWORK}}` |

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfileCard.tsx` |
| Hooks | camelCase with `use` prefix | `useUserAuth.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types/Interfaces | PascalCase | `UserResponse`, `CreateUserInput` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files (non-components) | kebab-case | `api-client.ts` |

### Import Order

```typescript
// 1. External packages
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal aliases (@/)
import { Button } from '@/components';
import { useAuth } from '@/hooks';

// 3. Relative imports
import { formatDate } from './utils';
import type { UserProps } from './types';
```

### Anti-Patterns to Avoid

```typescript
// WRONG: Copy-paste with minor modifications
const formatUserName = (user) => `${user.firstName} ${user.lastName}`;
const formatAuthorName = (author) => `${author.firstName} ${author.lastName}`;

// CORRECT: Create reusable utility
const formatFullName = (person: { firstName: string; lastName: string }) => 
  `${person.firstName} ${person.lastName}`;
```

---

## Bug Understanding Protocol

> **Philosophy**: A bug fix that doesn't understand the root cause is just another bug waiting to resurface.

### Before Fixing ANY Bug

```
┌─────────────────────────────────────────────────────────────────┐
│  BUG ANALYSIS CHECKLIST                                         │
│                                                                 │
│  1. REPRODUCE: Can you consistently trigger the bug?            │
│  2. ISOLATE: What is the minimal code path that causes it?      │
│  3. UNDERSTAND: WHY does this code behave unexpectedly?         │
│  4. ROOT CAUSE: Is this a symptom or the actual problem?        │
│  5. IMPACT: What else might be affected by this fix?            │
└─────────────────────────────────────────────────────────────────┘
```

### The "5 Whys" Technique

Before implementing a fix, ask "why" five times:

```
Bug: User sees stale data after update

Why 1: The UI doesn't refresh after mutation
Why 2: The cache isn't invalidated after the API call
Why 3: The mutation doesn't call queryClient.invalidateQueries()
Why 4: The developer copied from another mutation that didn't need invalidation
Why 5: There's no standard pattern documented for mutations

ROOT CAUSE: Missing mutation pattern in PROJECT_RULES.md
FIX: Add pattern + fix this instance + audit other mutations
```

### Bug Classification

| Type | Symptoms | Investigation Focus |
|------|----------|---------------------|
| **Logic Error** | Wrong output for valid input | Trace data flow, check conditionals |
| **State Error** | Inconsistent UI/data | Check state mutations, race conditions |
| **Timing Error** | Works sometimes, fails others | Check async operations, dependencies |
| **Data Error** | Fails with specific data | Check edge cases, validation |
| **Integration Error** | Fails at boundaries | Check API contracts, type mismatches |

### Fix Quality Categories

| Category | Quality | Example |
|----------|---------|---------|
| **Symptom Fix** | Avoid | Adding `!important` to override CSS |
| **Local Fix** | Sometimes OK | Fixing one broken function |
| **Pattern Fix** | Preferred | Fixing the pattern + all instances |
| **Architectural Fix** | Best | Preventing the bug class entirely |

### Post-Fix Requirements

After fixing a bug:

1. **Add regression test** - Prevent it from returning
2. **Audit similar code** - Find other instances: `grep -ri "similar-pattern" src/`
3. **Update docs** - If pattern was unclear, update `PROJECT_RULES.md`
4. **Log in task** - Use `task-master update-subtask` to document findings

---

## Self-Improvement Protocol

### When to Update PROJECT_RULES.md

You are **authorized and encouraged** to update `docs/PROJECT_RULES.md` when:

- [ ] You discover a pattern used 3+ times that isn't documented
- [ ] You find a better way to do something already documented
- [ ] You encounter a bug that could be prevented by a rule
- [ ] You make an architectural decision that affects future code
- [ ] A new library or tool is adopted

### Update Process

1. **Identify the pattern** - What should be standardized?
2. **Find examples** - Where is this pattern already used?
3. **Document clearly** - Include DO and DON'T examples
4. **Cross-reference** - Link to related patterns

### Always Update CHANGELOG.md

After completing a feature or significant fix:

```markdown
## [Unreleased]

### Added
- New UserProfile component with avatar support (#task-id)

### Changed
- Refactored Button to support icon prop (#task-id)

### Fixed
- Cache invalidation in user mutations (#task-id)
```

---

## Progress Tracking Protocol (MANDATORY)

> **CRITICAL**: `progress-project.md` is the **single source of truth** for project state and context.
> Updates are **MANDATORY** after every task completion. No exceptions.

### Why This Matters

- Ensures continuity across sessions and agents
- Provides instant context for any agent starting work
- Tracks what's done, what's pending, and what's blocked
- Eliminates redundant work by documenting completed features

### When to Update progress-project.md

You **MUST** update `progress-project.md`:

```
┌─────────────────────────────────────────────────────────────────┐
│  MANDATORY UPDATE TRIGGERS                                      │
│                                                                 │
│  [x] After completing ANY task (no matter how small)            │
│  [x] After implementing a new feature                           │
│  [x] After fixing a bug                                         │
│  [x] After making architectural decisions                       │
│  [x] After discovering blockers or issues                       │
│  [x] At the end of every work session                           │
│  [x] When starting work (update "In Progress" section)          │
└─────────────────────────────────────────────────────────────────┘
```

### What to Update

| Section | When to Update | What to Include |
|---------|----------------|-----------------|
| **Current Features** | New feature completed | Feature name, status, brief description |
| **Completed Work** | After every task | Date, task description, implementation notes |
| **Pending Tasks** | New tasks identified | Priority, task description, context |
| **In Progress** | Starting/ending work | Task name, start date, agent name |
| **Repository Structure** | Files/folders added | Updated directory tree |
| **Technical Decisions** | Architecture choices | Decision, rationale, date |
| **Known Issues** | Bugs discovered | Issue, severity, status |
| **Session Notes** | End of session | What was done, what's next |

### Update Format

When adding to **Completed Work**, use this format:

```markdown
### YYYY-MM-DD

- [x] Task description - Brief notes on what was done
- [x] Another task - Implementation details or relevant context
```

### Pre-Task Checklist

Before starting ANY work:

1. **Read `progress-project.md`** - Understand current state
2. **Check "In Progress" section** - Avoid duplicate work
3. **Update "In Progress"** - Mark what you're starting
4. **Review "Pending Tasks"** - Prioritize appropriately

### Post-Task Checklist

After completing ANY work:

1. **Update "Completed Work"** - Log what you did with date
2. **Update "Current Features"** - If new feature was added
3. **Clear "In Progress"** - Remove completed task
4. **Update "Session Notes"** - Context for next session
5. **Update other sections** - As applicable (issues, decisions, etc.)

### Example Update Flow

```bash
# 1. Starting work - Update In Progress
| Task | Started | Agent | Notes |
|------|---------|-------|-------|
| Implement user login | 2024-01-15 | Claude | JWT-based auth |

# 2. After completion - Update Completed Work
### 2024-01-15

- [x] Implement user login endpoint - POST /api/auth/login with JWT tokens
- [x] Add password hashing - Using bcrypt with salt rounds=12

# 3. Clear In Progress and update Features
| Feature | Status | Description |
|---------|--------|-------------|
| User Authentication | Complete | JWT-based auth with bcrypt hashing |
```

### Enforcement

- **This is not optional** - All agents must comply
- **No task is too small** - Even config changes get logged
- **Context is king** - Future sessions depend on accurate tracking
- **When in doubt, update** - Over-documentation beats under-documentation

---

## Task Master Workflow

> **Full Reference**: See `.taskmaster/CLAUDE.md` for complete Task Master documentation.

### Quick Commands

```bash
# Start your day
task-master next                    # What should I work on?
task-master show <id>               # Get full context

# During implementation
task-master update-subtask --id=<id> --prompt="Found that..."

# Complete work
task-master set-status --id=<id> --status=done
```

### Integration with Anti-Duplication

Before starting ANY task:

1. Run `task-master show <id>` to understand requirements
2. **Search codebase** for existing similar implementations
3. Log findings with `task-master update-subtask`
4. Only then begin implementation

### MCP Tools (Preferred over CLI)

```javascript
// Project setup
initialize_project    // = task-master init
parse_prd            // = task-master parse-prd

// Daily workflow  
get_tasks            // = task-master list
next_task            // = task-master next
get_task             // = task-master show <id>
set_task_status      // = task-master set-status

// Task management
expand_task          // = task-master expand
update_subtask       // = task-master update-subtask
```

---

## Agent-Specific Notes

### Claude Code
- AGENTS.md and CLAUDE.md auto-load into context
- Use `/clear` between unrelated tasks
- MCP tools preferred over CLI commands

### Cursor
- Rules in `.cursor/rules/` auto-load based on globs
- Use `@file` to reference specific files
- MDC format for custom rules

### Cline
- Rules in `.clinerules/` auto-load
- Markdown format for rules
- Same MCP tools as Claude Code

### Gemini CLI
- See `GEMINI.md` for specific features
- Uses Google Search for research
- No custom slash commands supported

---

## Quick Decision Trees

### "Should I create a new component?"

```
Does similar component exist?
├── Yes → Can it be extended with props?
│         ├── Yes → EXTEND existing
│         └── No → Is it 70%+ similar?
│                  ├── Yes → REFACTOR to be generic
│                  └── No → CREATE new (document why)
└── No → CREATE new (add to index.ts)
```

### "Should I create a new utility?"

```
Does similar function exist?
├── Yes → Same signature?
│         ├── Yes → USE existing
│         └── No → Can existing accept options?
│                  ├── Yes → EXTEND existing
│                  └── No → CREATE new (different name)
└── No → CREATE new (add to index.ts)
```

### "How should I fix this bug?"

```
Is this a symptom or root cause?
├── Symptom → Find root cause first
└── Root cause → Is this a pattern problem?
                 ├── Yes → Fix pattern + all instances + update docs
                 └── No → Fix locally + add regression test
```

---

*This file is the source of truth for AI agent instructions. Update this file when adding or modifying agent guidance.*
