-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('NOTES', 'SUMMARY', 'EXAM', 'EXERCISE', 'ASSIGNMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "type" "ResourceType" NOT NULL,
    "academicYear" TEXT,
    "professor" TEXT,
    "uploaderId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "courseId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_institutionId_idx" ON "Course"("institutionId");

-- CreateIndex
CREATE INDEX "Course_institutionId_name_idx" ON "Course"("institutionId", "name");

-- CreateIndex
CREATE INDEX "Course_institutionId_code_idx" ON "Course"("institutionId", "code");

-- CreateIndex
CREATE INDEX "StudyResource_institutionId_createdAt_idx" ON "StudyResource"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyResource_institutionId_type_idx" ON "StudyResource"("institutionId", "type");

-- CreateIndex
CREATE INDEX "StudyResource_courseId_idx" ON "StudyResource"("courseId");

-- CreateIndex
CREATE INDEX "StudyResource_uploaderId_idx" ON "StudyResource"("uploaderId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
