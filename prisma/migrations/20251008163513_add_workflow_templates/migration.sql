-- CreateTable
CREATE TABLE "template_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_category_name_key" ON "template_category"("name");

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublicTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "template_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

