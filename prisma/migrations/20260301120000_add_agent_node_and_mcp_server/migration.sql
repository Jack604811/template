-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'AGENT';

-- CreateTable
CREATE TABLE "mcp_server" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_server_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mcp_server" ADD CONSTRAINT "mcp_server_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
