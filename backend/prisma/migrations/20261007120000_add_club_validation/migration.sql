-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClubCategory" AS ENUM ('TECH', 'SPORT', 'CULTURE', 'ART', 'SCIENCE', 'SOCIAL', 'ENTREPRENEURSHIP', 'OTHER');

-- AlterTable
-- NOTE: the required columns (responsibleName, responsibleEmail, institutionId,
-- createdById) assume the "Club" table is empty, which is the case because no
-- club could be created before this feature.
ALTER TABLE "Club" ADD COLUMN     "logoFileName" TEXT,
ADD COLUMN     "category" "ClubCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "activities" TEXT,
ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "responsibleName" TEXT NOT NULL,
ADD COLUMN     "responsibleEmail" TEXT NOT NULL,
ADD COLUMN     "status" "ClubStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "institutionId" TEXT NOT NULL,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "Club_institutionId_status_idx" ON "Club"("institutionId", "status");

-- CreateIndex
CREATE INDEX "Club_createdById_idx" ON "Club"("createdById");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;