# Claude Code Instructions

> **Note:** This file works alongside `AGENTS.md` (universal AI agent instructions). AGENTS.md contains the core intelligence rules for reuse, code style, and bug understanding. This file contains Claude Code-specific integrations.

## Core Intelligence Rules

**Read `AGENTS.md` first** - It contains critical rules for:
- Anti-duplication (search before creating)
- Code style patterns
- Bug understanding protocol
- Self-improvement guidelines

@./AGENTS.md

## Project-Specific Patterns

**Read `docs/PROJECT_RULES.md`** for project-specific:
- Technology stack choices
- Component patterns
- Service patterns
- Testing conventions

@./docs/PROJECT_RULES.md

## Task Master AI Integration

**Import Task Master's development workflow commands and guidelines.**

@./.taskmaster/CLAUDE.md

## Claude Code-Specific Features

### MCP Tools (Preferred)

Use MCP tools instead of CLI when available:

```javascript
// Task management
get_tasks          // View all tasks
next_task          // Get next task to work on
get_task           // Show specific task details
set_task_status    // Mark task complete

// Task operations
expand_task        // Break down into subtasks
update_subtask     // Log implementation notes
```

### Custom Slash Commands

Create reusable workflows in `.claude/commands/`:

- `/project:taskmaster-next` - Find and show next task
- `/project:taskmaster-complete` - Complete current task

### Tool Allowlist

Configure in `.claude/settings.json`:

```json
{
  "allowedTools": [
    "Edit",
    "Bash(task-master *)",
    "Bash(git commit:*)",
    "Bash(git add:*)",
    "Bash(npm run *)",
    "mcp__task_master_ai__*"
  ]
}
```

### Session Management

- Use `/clear` between unrelated tasks to maintain focus
- This file auto-loads on every Claude Code session
- Use `@file` syntax to pull additional context

## Progress Tracking (MANDATORY)

**Update `progress-project.md` after EVERY task completion.**

This file is the single source of truth for project state. See AGENTS.md for full protocol.

```
Before work:  Read progress-project.md → Update "In Progress"
After work:   Update "Completed Work" → Clear "In Progress" → Update other sections
```

## Your Role

As Claude Code with this project:

1. **Check AGENTS.md first** - Follow anti-duplication rules
2. **Check PROJECT_RULES.md** - Follow project patterns
3. **Use Task Master** - Track work with task commands
4. **Update progress-project.md** - **MANDATORY** after every task (non-negotiable)
5. **Update docs** - Improve PROJECT_RULES.md when you discover patterns
6. **Log progress** - Use `update_subtask` to document findings

**Key Principle:** Behave like a senior engineer who knows this codebase and documents their work.
