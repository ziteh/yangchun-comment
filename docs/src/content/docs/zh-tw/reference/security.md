---
title: Security
---

:::caution
These configurations are intentionally strict but can **NOT** cover all potential vulnerabilities.
:::

🚧 Work in progress 🚧

此頁面說明了在使用 Yang Chun Comment 時可能遇到的攻擊和風險，以及目前有的機制。防禦攻擊有時不能只依靠 Yang Chun Comment 本身的設計，父網頁本身的設定也會影響攻擊的可能性，例如 [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) 設定。

## XSS 攻擊

Cross-Site Scripting 是非常危險且難以根除的攻擊，而且有非常多不同的類型。對於 Yang Chun Comment 這種允許使用者輸入內容的留言系統來說 XSS 的風險更大。

**潛在的風險**：

- 留言者的編輯權限 Token 被盜用，導致其留言被破壞或刪除。
- 其他防禦機制失效。
- 影響父頁面的其他功能。

**現有的機制**：

Yang Chun Comment 的使用者輸入有 3 個：留言內容、昵稱、Email。

其中留言內容會分別在前端使用 [DOMPurify](https://github.com/cure53/DOMPurify) 和後端使用 [sanitize-html](https://github.com/apostrophecms/sanitize-html) 進行消毒。昵稱在前端會經過處理變成自定的固定詞庫中的組合假名，在後端會進行消毒並過濾，且在前端顯示時不會展開成 HTML。Email 只是 Honeypot，在後端直接丟棄，前端沒有顯示該資訊。

> DOMPurify already provides strong protection against XSS, sanitize-html is primarily a secondary layer, removing all HTML for storage cleanliness.

### DOMPurify

- Uses a whitelist of safe tags and attributes.
- Adds `target="_blank"` and `rel="noopener noreferrer"` to all `<a>` links.
- Adds `loading="lazy"` to all `<img>` elements (performance optimization).
- Allows only `http:` and `https:` URLs, removing unsafe protocols (e.g. `javascript:`).
- DOMPurify 無法防禦包含父頁面 CSP 設定、瀏覽器漏洞、自我 XSS 等在內的攻擊。

[source code](https://github.com/ziteh/yangchun-comment/blob/main/client/src/utils/sanitize.ts)

```ts
import DOMPurify, { type Config as DomPurifyConfig } from 'dompurify';

const DOMPURIFY_CONFIG: DomPurifyConfig = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'i',
    'em',
    'strong',
    's',
    'p',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'blockquote',
    'h6',
    'hr',
    'br',
    'img',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt'],
  ALLOW_DATA_ATTR: false, // disable data-* attributes
  ALLOW_ARIA_ATTR: false, // disable aria-* attributes
};

function initializeHooks() {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // <a> Make all links open in a new tab, and prevent window.opener vulnerability
    if (node instanceof HTMLAnchorElement) {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');
    }

    // <img> Optimize image loading
    if (node instanceof HTMLImageElement) {
      node.setAttribute('loading', 'lazy');
    }
  });

  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    // Only allow http: and https: for href/src attributes
    // Remove javascript: and other potentially dangerous protocols
    if (data.attrName === 'href' || data.attrName === 'src') {
      try {
        const url = new URL(data.attrValue || '');
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          data.keepAttr = false;
        }
      } catch {
        data.keepAttr = false;
      }
    }
  });
}

export function sanitizeHtml(dirtyHtml: string) {
  return DOMPurify.sanitize(dirtyHtml, DOMPURIFY_CONFIG);
}
```

### sanitize-html

- 用於 RSS Feed XML
- Strips all HTML, leaving only plain text.

[source code](https://github.com/ziteh/yangchun-comment/blob/main/server/src/utils.ts)

```ts
export function sanitize(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  const htmlRemoved = sanitizeHtml(raw, {
    allowedTags: [], // no tags allowed
    allowedAttributes: {}, // no attributes allowed
    disallowedTagsMode: 'discard', // or 'completelyDiscard'
    parser: {
      // If set to true, entities within the document will be decoded. Defaults to true.
      // It is recommended to never disable the 'decodeEntities' option
      decodeEntities: true,
      lowerCaseTags: true,
    },
  });

  return htmlRemoved;
}
```

**建議**：

- 網頁本身的 CSP 政策。

## 重放攻擊

**潛在的風險**：

- 合法請求被重複使用，包含被修改或刪除留言內容。

**現有的機制**：

- 對於管理員登入所使用的 JWT 有 JTI，每次登出後會將其加入黑名單中，防止重複使用。
- FormalPoW 的 Challenge 中包含過期時效，且在使用過後會被加入黑名單中，防止重複使用。
- 留言者的編輯 Token 有過期時效。

## 登入時序攻擊

**現有的機制**：

- 對於管理員登入的名稱和密碼比對，在後端使用常數時間比對函式，並且在失敗時有隨機延遲。

## CSRF

Cross-Site Request Forgery

**現有的機制**：

- Hono [CSRF protection middleware](https://hono.dev/docs/middleware/builtin/csrf) (Origin header 檢查)
- GET 端點無危險操作或副作用。
- 資料格式使用 JSON。

**建議**：

- HttpOnly cookie 使用 sameSite="Strict" 或 "Lax"。參考 [`CORS_ORIGIN`](http://localhost:4321/reference/var/#environment-variables)。

## 垃圾機器人

**現有的機制**：

- 對於新增留言的 API 端點，使用 Proof-of-Work 進行流量限制，防止低階機器人在短時間內大量發送留言。
- 前端有名為 Email 的 Honeypot 欄位，該欄位有值的請求不會進行處理。

## Window.opener

**現有的機制**：

- 透過 DOMPurify 對所有留言內容中的 `<a>` 增加 `rel="noopener noreferrer"` 來抵禦 window.opener 攻擊。

## 暴力破解

暴力嘗試進行登入

**潛在的風險**：

- 攻擊者以管理員進行登入。
- 資料庫的內容被破壞或刪除。

**現有的機制**：

- 對於管理員的登入驗證端點，使用含密鑰的 HMAC-SHA256 處理的 IP 雜湊值作為識別，記錄失敗次數，在 1 天內如果驗證失敗 5 次會封鎖此 IP 雜湊值 1 天。

## 彩虹表攻擊

**潛在的風險**：

- 攻擊者以管理員進行登入。
- 資料庫的內容被破壞或刪除。

**現有的機制**：

- 對於管理員的密碼，是使用 PBKDF2-HMAC-SHA256 作為密碼雜湊演算法，設定輸出長度為 32 bytes，並採用 100,000 次迭代。

## SQL 注入攻擊

Yang Chun Comment 使用 SQLite 兼容的 Cloudflare D1 儲存所有留言內容。

**潛在的風險**：

- 儲存的所有留言內容被看到，但是 Yang Chun Comment 不儲存個人資料或驗證訊息，所有的留言內容本來就被視為是公開資訊。

**現有的機制**：

- 在後端操作 D1 的 SQL 操作使用 `.bind()` 完成，未進行字串拼接。
- API 端點的輸入資料有使用 Zod 驗證資料格式。
- API 端點無法直接操作 D1。

## 鍵名注入攻擊

Yang Chun Comment 使用基於 Key-value 的 Cloudflare KV 儲存快取。

**潛在的風險**：

- 後端內部邏輯錯誤。
- 其他防禦機制的黑名單失效。

**現有的機制**：

- 後端的 KV 操作中，鍵名不包含使用者輸入值。
- API 端點的輸入資料有使用 Zod 驗證資料格式。

## 程式碼注入攻擊

**潛在的風險**：

- 密鑰洩露。
- 後端被執行任意程式。
- 發出惡意請求。

**現有的機制**：

- 在後端程式碼中沒有使用 `eval()` 或 `new Function()`（透過 ESLint 檢查）。
- API 端點的輸入資料有使用 Zod 驗證資料格式。

## 惡意外部資源

攻擊者可能會留下一個外部的惡意連結（或圖片），其它使用者可能會點擊並被引導過去。

**潛在的風險**：

- 攻擊者在留言中貼出一個詐騙網頁的連結，一般使用者看到後點擊進入並遭受詐騙。

**現有的機制**：

- Yang Chun Comment 本身無法主動審查留言中出現的惡意外部資源，如果有此需求需要額外的措施。

**建議**：

- 管理員留意各個留言內容中的外部資源，並做出處理。

## 供應鏈攻擊

透過 CDN 使用本留言系統要注意供應鏈攻擊（Supply chain attack）的風險。

**潛在的風險**：

- 其他防禦措施失效。
- 向上影響父頁面。

**現有的機制**：

- Yang Chun Comment 本身無法防禦供應鏈攻擊，因為攻擊發生在不同層面，請參考建議進行相關措施。

**建議**：

- 優先使用 npm 等套件管理器在本地安裝並確認，而不是從 CDN 載入。
- 如果一定要使用 CDN，要使用 Subresource Integrity（SRI）。

## DDoS

DDoS 是一種很強大的攻擊，對於使用 Cloudflare Worker 的 Yang Chun Comment 來說，特別是 L7 DDoS，最大的影響是大量的 API 請求會瞬間耗盡免費額度。

**潛在的風險**：

- API 請求額度被大量消耗，導致管理員需要支付額外的費用。
- 一般使用者無法正常使用 Yang Chun Comment，例如無法查看或發佈留言。

**現有的機制**：

- Yang Chun Comment 本身無法對 DDoS 做出任何防禦或緩解，如果有此需求需要額外的措施。

**建議**：

- 使用額外的 WAF 等方案提升對 DDoS 的防禦能力。

[owasp-pbkdf2]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
