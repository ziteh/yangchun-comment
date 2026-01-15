---
title: Variables
---

## Environment Variables

| 變數名稱                    | 型別                    | 必填 | 說明                          | 預設值                          |
| --------------------------- | ----------------------- | ---- | ----------------------------- | ------------------------------- |
| `FRONTEND_URL`              | string (URL)            | 是   | 前端網站的完整網址            | `https://your-frontend-url.com` |
| `POST_BASE_URL`             | string (URL)            | 否   | API 或文章服務的基底網址      | `undefined`                     |
| `CORS_ORIGIN`               | string (URL)            | 是   | 允許的 CORS 來源              | `http://localhost:5173`         |
| `RSS_SITE_PATH`             | string                  | 是   | RSS 站點路徑                  | `site`                          |
| `ADMIN_USERNAME`            | string                  | 是   | 管理員登入帳號                | `admin`                         |
| `COOKIE_SAME_SITE`          | `Strict \| Lax \| None` | 是   | Cookie SameSite 設定          | `Strict`                        |
| `ADMIN_MAX_LOGIN_ATTEMPTS`  | number                  | 是   | 管理員最大登入嘗試次數        | `5`                             |
| `ADMIN_SESSION_DURATION`    | number                  | 是   | 管理員 Session 有效時間（秒） | `3600`                          |
| `ADMIN_LOGIN_FAIL_WINDOW`   | number                  | 是   | 登入失敗次數計算時間窗（秒）  | `3600`                          |
| `ADMIN_IP_BLOCK_DURATION`   | number                  | 是   | IP 封鎖持續時間（秒）         | `3600`                          |
| `MAX_ALL_SITE_RSS_COMMENTS` | number                  | 是   | 全站 RSS 最大留言數           | `20`                            |
| `MAX_THREAD_RSS_COMMENTS`   | number                  | 是   | 單一討論串 RSS 最大留言數     | `10`                            |
| `PRE_POW_DIFFICULTY`        | number                  | 是   | 預檢 PoW 難度                 | `2`                             |
| `PRE_POW_TIME_WINDOW`       | number                  | 是   | 預檢 PoW 時間窗口（秒）       | `60`                            |
| `PRE_POW_SALT`              | string                  | 是   | 預檢 PoW 使用的 Salt          | `MAGIC`                         |
| `FORMAL_POW_DIFFICULTY`     | number                  | 是   | 正式 PoW 難度                 | `4`                             |
| `FORMAL_POW_EXPIRATION`     | number                  | 是   | 正式 PoW 過期時間（秒）       | `300`                           |

## Secrets

| 變數名稱                     | 型別         | 必填 | 說明                                 |
| ---------------------------- | ------------ | ---- | ------------------------------------ |
| `SECRET_ADMIN_PASSWORD_HASH` | string (Hex) | 是   | 管理員密碼雜湊（32 bytes / 64 hex）  |
| `SECRET_ADMIN_PASSWORD_SALT` | string (Hex) | 是   | 管理員密碼 Salt（32 bytes / 64 hex） |
| `SECRET_ADMIN_JWT_KEY`       | string (Hex) | 是   | 管理員 JWT 簽章金鑰                  |
| `SECRET_COMMENT_HMAC_KEY`    | string (Hex) | 是   | 留言 HMAC 驗證金鑰                   |
| `SECRET_FORMAL_POW_HMAC_KEY` | string (Hex) | 是   | 正式 PoW 使用的 HMAC 金鑰            |
| `SECRET_IP_PEPPER`           | string (Hex) | 是   | IP 雜湊用 Pepper                     |
| `SECRET_DISCORD_WEBHOOK_URL` | string (URL) | 否   | Discord Webhook 通知網址             |

## 參考

- [Environment variables · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Secrets · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/secrets/)
