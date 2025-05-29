declare module 'cloudflare:test' {
  interface ProvidedEnv {
    // Bindings
    COMMENTS: KVNamespace;
    RATE_LIMITER_POST: RateLimit;
    RATE_LIMITER_GET: RateLimit;

    // Env
    SECRET_KEY: string;
    CORS_ORIGIN: string;
  }

  interface ProvidedEnv extends Env {}
}
