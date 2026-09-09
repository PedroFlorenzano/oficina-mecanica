-- Rate limiting de endpoints públicos (cadastro de oficina e agendamento anônimo)
CREATE TABLE IF NOT EXISTS "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");
CREATE INDEX IF NOT EXISTS "RateLimitHit_createdAt_idx" ON "RateLimitHit"("createdAt");
