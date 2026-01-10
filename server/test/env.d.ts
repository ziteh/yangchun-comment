declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    // Bindings
    COMMENTS: KVNamespace;
    RATE_LIMITER_POST: RateLimit;
    RATE_LIMITER_GET: RateLimit;

    // Env
    HMAC_SECRET_KEY: string;
    CORS_ORIGIN: string;
  }
}
