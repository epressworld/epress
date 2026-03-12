# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

epress is a decentralized content and social network built on Ethereum identity. Each user runs their own self-hosted node with a blog/CMS and peer-to-peer connections to other nodes. Content is cryptographically signed and distributed via the EWP (epress Web Protocol).

## Development Commands

```bash
# Development server (hot reload) - runs server and client in parallel
npm run dev

# Production build
npm run build

# Production start (uses PM2)
npm run start

# PM2 management
npm run stop      # Stop all processes
npm run restart   # Restart all processes
npm run logs      # View PM2 logs

# Standalone server/client
npm run start:server   # Run server only (port 8544)
npm run start:client   # Run client only (port 8543)

# Run tests
npm test

# Run single test file
npm test -- test/graphql/publication.test.mjs

# Linting
npm run lint          # Check issues
npm run lint:fix      # Auto-fix issues

# Database migrations
npm run migrate       # Run migrations
npm run seed          # Run seeds
```

## Architecture

### Backend (server/)
- **Framework**: Fastify via solidify.js
- **ORM**: Objection.js (Model base class from solidify.js)
- **Database**: SQLite by default, supports PostgreSQL and MySQL
- **APIs**: GraphQL (`/api/graphql`) and REST EWP routes (`/ewp/*`)
- **Auth**: JWT with SIWE (Sign-In With Ethereum)

Key files:
- `server/index.mjs` - Fastify server setup, JWT hooks, request decorators
- `server/models/index.mjs` - Database connection and model exports
- `server/graphql/` - GraphQL schema (queries, mutations)
- `server/routes/` - REST API routes (EWP protocol + install API)

### Frontend (client/)
- **Framework**: Next.js 16 with App Router
- **UI**: Chakra UI v3
- **State**: Apollo Client for GraphQL, React Context for global state
- **Web3**: wagmi + viem for Ethereum wallet connections

Route groups:
- `(main)/` - Main application pages
- `(installer)/` - Installation wizard at `/install`

Components follow atomic design:
- `components/ui/` - Base UI components
- `components/features/` - Business feature components
- `components/layout/` - Page structure components
- `components/providers/` - Context providers

### Commands (commands/)
CLI tools that run the application:
- `server.mjs` - Starts server, scheduler, and sync services (used by PM2 and dev mode)
- `migrate.mjs` - Database migrations via Knex
- `sync.mjs` - Content synchronization from followed nodes
- `clean.mjs` - Cleanup of stale content

### Configuration
- `config/index.mjs` - Environment loading via dotenv with yup validation
- `.env` - Infrastructure settings (ports, database path)
- Application settings stored in database (configured via web UI)

## Key Patterns

### Database Models
Models extend `Model` from solidify.js and use Objection.js relations. Connection is established centrally in `server/models/index.mjs`.

### JWT Authentication
- JWT secret stored in database (set during installation)
- Three audience types: `client`, `integration`, `nonce`
- Token verification includes database lookup via `Token.verify()`
- Request decorated with `cani(permission)` for permission checks

### Request Config Cache
Each request has a `config` object caching database queries:
```javascript
request.config.getSelfNode()
request.config.getSetting(key, defaultValue)
```

### Frontend Data Fetching
- Server Components fetch data directly
- Client Components use Apollo Client hooks
- Form state managed by react-hook-form

## Testing

Tests use Ava.js with in-memory SQLite database. Test environment setup in `test/env.mjs` configures test accounts using Hardhat's default private keys.

Run specific test categories:
```bash
npm test -- test/graphql/      # GraphQL tests
npm test -- test/routes/ewp/   # EWP protocol tests
npm test -- test/models/       # Model tests
```

## Conventional Commits

Follow the format: `<type>(<scope>): <subject>`

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
- `feat(client): add user profile page`
- `fix(server): correct avatar upload path validation`
