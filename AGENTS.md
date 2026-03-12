# Epress Development Guide

This document provides project development standards and guidelines for AI agents.

## Project Overview

"epress" is a decentralized Web3 blog and social network built on the Ethereum ecosystem. The goal is to create a truly decentralized content and social network where users have full control over their data and identity. The project is a monorepo containing a Next.js frontend and a Fastify backend.

## Tech Stack

- **Backend**: Swiftify (based on Fastify and Objection.js)
- **Frontend**: Next.js (React), Chakra UI
- **Database**: SQLite (default)
- **API**: GraphQL, RESTful (EWP)
- **Testing**: Ava.js
- **Code Style**: Biome

## Project Structure

- `client/`: Frontend (Next.js)
- `server/`: Backend (Swiftify, Fastify)
- `commands/`: Core CLI tools (install, migrate, start)
- `config/`: Configuration management
- `docs/`: Design and specification docs
- `test/`: Test cases (Ava.js)

## Build and Run Commands

```bash
# Install dependencies
npm install

# Run setup wizard
node commands/install.mjs

# Development server (hot reload) - runs server and client in parallel
npm run dev

# Build the project
npm run build

# Production start (runs both server and client)
npm start

# Standalone server/client
npm run start:server   # Run server only (port 8544)
npm run start:client   # Run client only (port 8543)

# Run tests
npm test

# Run a single test file
npx ava test/routes/ewp/profile.test.mjs

# Run tests with match pattern
npx ava test/models/content.test.mjs --match="create: should create POST"

# Lint the code
npm run lint

# Auto-fix lint errors
npm run lint:fix
```

## Code Style Guidelines

### Formatting Rules (Biome)

- Use Biome for code linting and formatting
- Indentation: 2 spaces
- Quotes: double quotes `""`
- Semicolons: as-needed
- Run `npm run lint` to check code
- Run `npm run lint:fix` to auto-fix

### Import Guidelines

- Use Node protocol for built-in modules: `import path from "node:path"`
- Import order: built-in modules → third-party modules → project modules
- Use absolute imports: `import { Content } from "../../server/models/index.mjs"`

### Naming Conventions

- File names: kebab-case (e.g., `my-file.mjs`)
- Class names: PascalCase (e.g., `class Content`)
- Functions/Variables: lowerCamelCase
- Constants: UPPER_CASE_SNAKE_CASE

### GraphQL Design Guidelines

- **Prioritize strong types**: Avoid using generic `JSON` type
- **Mutations must use Input types**: Encapsulate mutation arguments in an Input type
- **Strive for semantic clarity**: Use distinct types for different concepts
- **Naming conventions**:
  - Fields: `lowerCamelCase`
  - Types: `PascalCase`
  - Enums: `UPPER_CASE_SNAKE_CASE`

### Error Handling Guidelines

- Use custom error codes: `error.code = "VALIDATION_FAILED"`
- Throw error objects containing error codes
- Example:
```javascript
const error = new Error("Content type is required.")
error.code = "VALIDATION_FAILED"
throw error
```

### Logging Guidelines

- Use `request.log` for logging in route layer
- Model layer should not log (keep it simple)
- Example:
```javascript
request.log.debug("Fetching profile")
request.log.error("Self node not found")
```

### Comment Guidelines

- Do not add any comments unless explicitly requested by user
- Code should be self-explanatory

## Testing Guidelines

- Use Ava.js for testing
- Test files are located in `test/` directory
- Test file naming: `*.test.mjs`
- `test/setup.mjs` sets up an in-memory SQLite database for testing
- Use `test.beforeEach` to clean up data
- Use `test.serial` for tests with dependencies
- Test example:
```javascript
import test from "ava"
import "../setup.mjs"

test.beforeEach(async () => {
  await Content.query().delete()
})

test("create: should create POST content", async (t) => {
  const result = await Content.create({ type: "post", body: "test" })
  t.truthy(result, "Should return created content")
})
```

## Issue and PR Workflow

### Issue Creation Workflow

When asked to create an Issue:
1. Determine Issue type (bug / improvement / feature) based on the Chinese description
2. Read the corresponding template from `.github/ISSUE_TEMPLATE/` directory
3. Organize the English title and content according to the template
4. **Confirm the Issue title and content with the user before creation**
5. After confirmation, use GitHub MCP's issue write tool to create the Issue on GitHub

### Before Working on an Issue

When asked to work on an Issue together:
1. **Read `CONTRIBUTING.md`** to understand the workflow and branch naming conventions
2. Create the corresponding branch based on the Issue information
3. **Do NOT make any code changes** - code changes will be made by the user manually
4. After the user confirms code changes are complete, proceed with the remaining workflow (commit, PR creation, etc.)

## Language Guidelines

- This is a globalized project, all documentation, comments, and Issues must use English by default unless there are special circumstances

## Commit Guidelines

- **Do not** use any markdown syntax in commit messages
- **Must** get user confirmation for commit message before committing
- Commit messages should describe changes in detail
- Review `git diff` to understand specific changes
- If creating an Improvement type Issue, determine if it is a good first issue; if not, remove the `good first issue` label from the labels
