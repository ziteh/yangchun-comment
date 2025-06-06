declare module 'cloudflare:test' {
  interface ProvidedEnv {
    // Bindings
    COMMENTS: KVNamespace;
    RATE_LIMITER_POST: RateLimit;
    RATE_LIMITER_GET: RateLimit;

    // Env
    HMAC_SECRET_KEY: string;
    CORS_ORIGIN: string;
    POST_REGEX?: string;
  }

  interface ProvidedEnv extends Env {}
}
