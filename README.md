# Yang Chun Comment

**Yang Chun** (陽春 — meaning “simple and unadorned”) Comment is a lightweight, privacy-first commenting system built with [Lit](https://lit.dev/) and [Hono](https://hono.dev/), designed to run on [Cloudflare Workers](https://workers.cloudflare.com/). No registration required and no personal data is stored—ideal for small sites and blogs.

- No login
- No cookies
- No personal data collection
- No browser fingerprinting (if you don't think the hashed IP is a fingerprint)

## Architecture

This monorepo uses pnpm workspace and contains four packages:

- `server`: Backend API built with Hono for Cloudflare Workers
- `client`: Frontend widget, outputs ESM and UMD bundles
- `shared`: Common types and utilities
- `docs`: Website

## Usage

Refer to <https://ycc.ziteh.dev>

## TODO

- [ ] Using PoW (proof of work) to replace IP-based bot attack prevention to reduce the impact on different users with the same IP address, and further eliminate the need to store IP hash values on the backend server (storing hashed IPs may be considered a lightweight user tracking method)
