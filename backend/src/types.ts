export type AuthProps = {
  userId: string
  householdId: string
}

export type Env = {
  Bindings: {
    DB: D1Database
    RECEIPTS: R2Bucket
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    WORKER_JWT_SECRET: string
    WORKER_ENCRYPTION_KEY: string
    PAGES_ORIGIN: string
    EMAIL_AUTH_ENABLED: string
    ASSETS: Fetcher
    props?: AuthProps
  }
  Variables: {
    userId: string
    householdId: string
  }
}
