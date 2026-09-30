-- Filesystem-backed StudyResource rows must be removed through application
-- cleanup before their uploader or institution can be deleted.
ALTER TABLE "StudyResource" DROP CONSTRAINT "StudyResource_uploaderId_fkey";
ALTER TABLE "StudyResource" DROP CONSTRAINT "StudyResource_institutionId_fkey";

ALTER TABLE "StudyResource"
ADD CONSTRAINT "StudyResource_uploaderId_fkey"
FOREIGN KEY ("uploaderId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudyResource"
ADD CONSTRAINT "StudyResource_institutionId_fkey"
FOREIGN KEY ("institutionId") REFERENCES "Institution"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
