declare module 'cloudflare:test' {
  interface ProvidedEnv {
    // Bindings
    DB: D1Database;
    KV: KVNamespace;

    // Env
    SECRET_ADMIN_JWT_KEY: string;
    SECRET_COMMENT_HMAC_KEY: string;
    SECRET_FORMAL_POW_HMAC_KEY: string;
    CORS_ORIGIN: string;
    POST_BASE_URL: string;
  }
}
