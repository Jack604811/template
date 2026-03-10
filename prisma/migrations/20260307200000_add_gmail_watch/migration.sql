-- CreateTable
CREATE TABLE "gmail_watch" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "historyId" TEXT,
    "expirationMs" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_watch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_watch_credentialId_key" ON "gmail_watch"("credentialId");

-- AddForeignKey
ALTER TABLE "gmail_watch" ADD CONSTRAINT "gmail_watch_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
