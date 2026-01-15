# Yang Chun Comment

**Yang Chun** (陽春 — meaning simple and unadorned) Comment is a simple, lightweight, privacy-first commenting system. The frontend uses [Lit](https://lit.dev/), making it easy to embed into various frontend frameworks. The backend uses [Hono](https://hono.dev/) and is designed to run on the [Cloudflare Workers](https://workers.cloudflare.com/) serverless platform. It is perfect for personal blogs or small websites (sometimes people just want to simply reply: _Cool!_).

✨ For commenters, it features:

- No registration or login required
- No real names, Emails, IP addresses, User-Agents, or Cookies are collected.
- No browser fingerprinting
- Supports Markdown syntax
- RSS Feed notifications

## Architecture

This monorepo uses pnpm workspace and contains four packages:

- `server`: Backend built with Hono for Cloudflare Workers
- `client`: Frontend web component built with Lit
- `shared`: Common types and utilities (Zod)
- `docs`: Website

## Usage

Refer to <https://ycc.ziteh.dev> or [get-started](./docs/src/content/docs/guides/get-started.mdx)

> [!WARNING]  
> The system design is not guaranteed to comply with any data and privacy regulations, including but not limited to GDPR (General Data Protection Regulation).

## Todo

- [x] ~~Using PoW (proof of work) to replace IP-based bot attack prevention to reduce the impact on different users with the same IP address, and further eliminate the need to store IP hash values on the backend server (storing hashed IPs may be considered a lightweight user tracking method)~~
- [ ] Add a page explaining personal data collection and prompts.
- [ ] Redesign the comment editing and deletion tokens to make them more durable and user-friendly, aligning with rights of erasure.
- [ ] Improve the Administrator Page.
