# Wonton Comment

A simple and private comment system, runs on Cloudflare Workers.

- No login
- No cookie
- No browser fingerprinting (if you don't think the hashed IP is a fingerprint)

## Architecture

This monorepo contains three packages:

- `server`: Backend API built with Hono for Cloudflare Workers
- `client`: Frontend widget, outputs ESM and UMD bundles
- `shared`: Common TypeScript types and utilities

## Usage

### Server ENV

- `HMAC_SECRET_KEY` - A random string used for HMAC token generation. Select a long and strong random string.
- `CORS_ORIGIN` - The allowed origin for CORS requests.

For **development**, create a `.dev.vars` file in the `server/` directory:

```env
# .dev.vars

HMAC_SECRET_KEY=your-very-long-and-secure-random-string-here
CORS_ORIGIN=*
```

For **production**, use Cloudflare Workers Environment Variables or Secret.

### Development

```bash
# Install dependencies
pnpm install

# Build shared types (required before starting client/server)
pnpm build:shared

# Start development servers
pnpm dev
```

### Individual Package Development

```bash
# Client development
cd client 
pnpm dev

# Server development  
cd server
pnpm dev

# Shared types development (watch mode)
cd shared
pnpm dev
```

## Building for Production

```bash
# Build all packages
pnpm build

# Or build individually
pnpm build:shared  # Build shared types first
pnpm build:client  # Build client library
```

## Using the Client Library

After building, the client package outputs two formats in `client/dist/`:

- **ES Module**: `wonton-comment.es.js`
- **UMD**: `wonton-comment.umd.js`

Take ESM for example

```js
import { initWontonComment } from './path/to/wonton-comment.es.js';

initWontonComment('wtc-app', {
  post: window.location.pathname,
  apiUrl: 'https://your-api-url.com/',
});
```

## Deployment

```bash
# Deploy server to Cloudflare Workers
cd server
pnpm deploy
```
