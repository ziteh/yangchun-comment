---
title: Security
---

:::caution
These configurations are intentionally strict but can **NOT** cover all potential vulnerabilities.

I am not an expert in the field of information security. This document merely provides a technical explanation of the system's design and operation.
:::

🚧 Work in progress 🚧

This page describes the attacks and risks that may be encountered when using Yang Chun Comment, as well as the existing mechanisms. Defense against attacks sometimes cannot rely solely on the design of Yang Chun Comment itself; the settings of the parent page also affect the possibility of attacks, such as [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) settings.

## XSS Attacks

Cross-Site Scripting is a very dangerous and difficult-to-eradicate attack, and there are many different types. For a comment system that allows user input like Yang Chun Comment, the risk of XSS is greater.

**Potential Risks**:

- Commenter's editing permission Token is stolen, leading to their comments being destroyed or deleted.
- Failure of other defense mechanisms.
- Affecting other functions of the parent page.

**Existing Mechanisms**:

Yang Chun Comment has 3 input fields: comment content, nickname, and Email.

Among them, comment content is sanitized using [DOMPurify](https://github.com/cure53/DOMPurify) on the frontend and [sanitize-html](https://github.com/apostrophecms/sanitize-html) on the backend respectively (for RSS Feed XML). Nicknames are processed on the frontend into combined pseudonyms from a custom fixed word bank, sanitized and filtered on the backend, and are not expanded into HTML when displayed on the frontend. Email is just a Honeypot, directly discarded on the backend, and this information is not displayed on the frontend.

### DOMPurify

- Uses a whitelist of safe tags and attributes.
- Adds `target="_blank"` and `rel="noopener noreferrer"` to all `<a>` links.
- Adds `loading="lazy"` to all `<img>` elements (performance optimization).
- Allows only `http:` and `https:` URLs, removing unsafe protocols (e.g. `javascript:`).
- DOMPurify cannot defend against attacks including parent page CSP settings, browser vulnerabilities, Self-XSS, etc.

[source code](https://github.com/ziteh/yangchun-comment/blob/main/client/src/utils/sanitize.ts)

### sanitize-html

- Used for RSS Feed XML
- Strips all HTML, leaving only plain text.

[source code](https://github.com/ziteh/yangchun-comment/blob/main/server/src/utils/sanitize.ts)

**Recommendations**:

- Enhance the CSP policy for the webpage itself.

## Replay Attacks

**Potential Risks**:

- Legitimate requests are reused, including modifying or deleting comment content.

**Existing Mechanisms**:

- The JWT used for administrator login has JTI, which is added to a blacklist after each logout to prevent reuse.
- FormalPoW Challenge includes an expiration time and is added to a blacklist after use to prevent reuse.
- Commenter's edit Token has an expiration time.

## Timing Attacks on Login

**Existing Mechanisms**:

- For administrator login name and password comparison, a constant-time comparison function is used on the backend, and there is a random delay upon failure.

## CSRF

Cross-Site Request Forgery

**Existing Mechanisms**:

- Hono [CSRF protection middleware](https://hono.dev/docs/middleware/builtin/csrf) (Origin header check)
- GET endpoints have no dangerous operations or side effects.
- Data format uses JSON.

**Recommendations**:

- HttpOnly cookie uses sameSite="Strict" or "Lax". Refer to [`CORS_ORIGIN`](http://localhost:4321/reference/var/#environment-variables).

## Spam Bots

**Existing Mechanisms**:

- For the API endpoint adding comments, Proof-of-Work is used for rate limiting to prevent low-level bots from sending a large number of comments in a short time.
- The frontend has a Honeypot field named Email; requests with a value in this field will not be processed.

## Window.opener

**Existing Mechanisms**:

- Defends against window.opener attacks by adding `rel="noopener noreferrer"` to all `<a>` tags in comment content via DOMPurify.

## Brute Force

Brute force attempts to login

**Potential Risks**:

- Attacker logs in as an administrator.
- Database content is destroyed or deleted.

**Existing Mechanisms**:

- For the administrator login verification endpoint, the IP hash processed by HMAC-SHA256 with a key is used as identification. Failure counts are recorded. If verification fails 5 times within 1 day, this IP hash is blocked for 1 day.

## Rainbow Table Attacks

**Potential Risks**:

- Attacker logs in as an administrator.
- Database content is destroyed or deleted.

**Existing Mechanisms**:

- For administrator passwords, PBKDF2-HMAC-SHA256 is used as the password hashing algorithm, with an output length set to 32 bytes and 100,000 iterations.

## SQL Injection Attacks

Yang Chun Comment uses SQLite-compatible Cloudflare D1 to store all comment content.

**Potential Risks**:

- All stored comment content is seen, but Yang Chun Comment does not store personal data or verification information, and all comment content is inherently considered public information.

**Existing Mechanisms**:

- SQL operations on D1 in the backend use `.bind()` without string concatenation.
- API endpoint input data uses Zod to validate data format.
- API endpoints cannot directly manipulate D1.

## Key Injection Attacks

Yang Chun Comment uses Cloudflare KV based on Key-value to store cache.

**Potential Risks**:

- Backend internal logic errors.
- Failure of blacklists in other defense mechanisms.

**Existing Mechanisms**:

- In backend KV operations, key names do not contain user input values.
- API endpoint input data uses Zod to validate data format.

## Code Injection Attacks

**Potential Risks**:

- Key leakage.
- Arbitrary code execution on the backend.
- Sending malicious requests.

**Existing Mechanisms**:

- `eval()` or `new Function()` are not used in backend code (checked via ESLint).
- API endpoint input data uses Zod to validate data format.

## Malicious External Resources

Attackers may leave an external malicious link (or image), and other users may click and be redirected.

**Potential Risks**:

- Attackers post a link to a scam website in a comment, and general users click to enter and are scammed after seeing it.

**Existing Mechanisms**:

- Yang Chun Comment itself cannot actively censor malicious external resources appearing in comments. Additional measures are needed if this requirement exists.

**Recommendations**:

- When clicking a link in a comment, a message box will pop up first, alerting the user that they are about to leave this site and displaying the destination URL.
- Administrators should pay attention to external resources in comments and take action.

## Supply Chain Attacks

When using this comment system via CDN, be aware of the risk of Supply chain attacks.

**Potential Risks**:

- Failure of other defense measures.
- Affecting the parent page upwards.

**Existing Mechanisms**:

- Yang Chun Comment itself cannot defend against supply chain attacks because the attack occurs at a different layer. Please refer to recommendations for relevant measures.

**Recommendations**:

- Prioritize using package managers like npm to install and verify locally instead of loading from CDN.
- If you must use CDN, use Subresource Integrity (SRI).

## DDoS

DDoS is a powerful attack. For Yang Chun Comment using Cloudflare Worker, especially L7 DDoS, the biggest impact is that a large number of API requests will instantly exhaust the free quota.

**Potential Risks**:

- API request quota is consumed in large quantities, causing the administrator to pay extra fees.
- General users cannot use Yang Chun Comment normally, such as unable to view or post comments.

**Existing Mechanisms**:

- Yang Chun Comment itself cannot offer any defense or mitigation against DDoS. Additional measures are needed if this requirement exists.

**Recommendations**:

- Use additional WAF or other solutions to improve defense against DDoS.

[owasp-pbkdf2]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
