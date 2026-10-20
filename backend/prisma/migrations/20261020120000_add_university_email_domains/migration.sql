-- AlterTable
ALTER TABLE "University" ADD COLUMN "emailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];
